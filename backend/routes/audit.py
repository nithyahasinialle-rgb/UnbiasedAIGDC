"""
routes/audit.py – Async ML audit pipeline
POST /api/audit  – start job
GET  /api/status/<job_id> – poll status
GET  /api/result/<job_id> – full results
"""

import uuid
import threading
import logging
from flask import Blueprint, request, jsonify

from routes.upload import get_file_bytes
from ml.pipeline import load_dataframe, train_and_evaluate
from ml.fairness import compute_fairness_metrics
from ml.explainer import compute_shap_explanation
import firebase_client as fb

logger = logging.getLogger(__name__)
audit_bp = Blueprint("audit", __name__)

# In-memory job store
_jobs: dict[str, dict] = {}


def _run_audit(job_id: str, file_bytes: bytes, target_col: str, protected_attr: str):
    """Background thread: run full audit pipeline."""
    _jobs[job_id]["status"] = "running"
    fb.save_audit(job_id, {"job_id": job_id, "status": "running"})
    try:
        logger.info(f"[{job_id}] Starting audit...")
        df = load_dataframe(file_bytes)
        logger.info(f"[{job_id}] Loaded dataframe: {df.shape}")

        result = train_and_evaluate(df, target_col, protected_attr)
        logger.info(f"[{job_id}] Training done. Accuracy: {result['accuracy']}")

        fairness = compute_fairness_metrics(
            result["y_test"], result["y_pred"], result["s_test"]
        )
        logger.info(f"[{job_id}] Fairness metrics done.")

        shap_data = compute_shap_explanation(
            result["pipeline"], result["X_test"], protected_attr
        )
        logger.info(f"[{job_id}] SHAP done.")

        payload = {
            "status": "done",
            "accuracy": result["accuracy"],
            "target_col": target_col,
            "protected_attr": protected_attr,
            **fairness,
            **shap_data,
            "_pipeline": result["pipeline"],
            "_X_train": result["X_train"],
            "_y_train": result["y_train"],
            "_s_train": result["s_train"],
            "_X_test": result["X_test"],
            "_y_test": result["y_test"],
            "_s_test": result["s_test"],
        }

        _jobs[job_id].update(payload)
        lightweight = {k: v for k, v in payload.items() if not k.startswith("_")}
        fb.save_audit(job_id, {"job_id": job_id, **lightweight})
        logger.info(f"[{job_id}] Audit complete and saved to Firebase.")

    except Exception as exc:
        logger.error(f"[{job_id}] Audit failed: {exc}", exc_info=True)
        _jobs[job_id]["status"] = "error"
        _jobs[job_id]["error"] = str(exc)
        fb.save_audit(job_id, {"job_id": job_id, "status": "error", "error": str(exc)})


@audit_bp.post("/audit")
def start_audit():
    body = request.get_json(force=True) or {}
    file_id = body.get("file_id")
    target_col = body.get("target_col")
    protected_attr = body.get("protected_attr")

    if not all([file_id, target_col, protected_attr]):
        return jsonify({"error": "file_id, target_col, and protected_attr are required"}), 400

    file_bytes = get_file_bytes(file_id)
    if file_bytes is None:
        return jsonify({"error": f"file_id '{file_id}' not found. Please upload first."}), 404

    job_id = str(uuid.uuid4())
    _jobs[job_id] = {
        "status": "pending",
        "job_id": job_id,
        "file_id": file_id,
        "target_col": target_col,
        "protected_attr": protected_attr,
    }

    thread = threading.Thread(
        target=_run_audit,
        args=(job_id, file_bytes, target_col, protected_attr),
        daemon=True,
    )
    thread.start()

    return jsonify({"job_id": job_id, "status": "pending"})


@audit_bp.get("/status/<job_id>")
def get_status(job_id: str):
    job = _jobs.get(job_id)
    if job is not None:
        return jsonify({"job_id": job_id, "status": job["status"], "error": job.get("error")})

    # Not in memory - check Firebase
    try:
        fb_job = fb.get_audit(job_id)
        if fb_job:
            status = fb_job.get("status", "running")
            if status == "done":
                _jobs[job_id] = fb_job
            return jsonify({"job_id": job_id, "status": status})
    except Exception as e:
        logger.error(f"Firebase get_audit error: {e}")

    return jsonify({"error": "Job not found"}), 404


@audit_bp.get("/result/<job_id>")
def get_result(job_id: str):
    job = _jobs.get(job_id)
    if job is None:
        try:
            fb_job = fb.get_audit(job_id)
            if fb_job:
                _jobs[job_id] = fb_job
                job = fb_job
        except Exception:
            pass
    if job is None:
        return jsonify({"error": "Job not found"}), 404
    if job["status"] != "done":
        return jsonify({"job_id": job_id, "status": job["status"]}), 202
    result = {k: v for k, v in job.items() if not k.startswith("_")}
    return jsonify(result)


def get_job(job_id: str) -> dict | None:
    """Used by other routes to access job data."""
    return _jobs.get(job_id)