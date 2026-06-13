"""
routes/audit.py – Async ML audit pipeline
POST /api/audit  – start job
GET  /api/status/<job_id> – poll status
GET  /api/result/<job_id> – full results
"""

import uuid
import threading
import logging
import datetime
from flask import Blueprint, request, jsonify, send_file

from routes.upload import get_file_bytes
from ml.pipeline import load_dataframe, train_and_evaluate, prepare_data
from ml.fairness import compute_fairness_metrics
from ml.explainer import compute_shap_explanation
import firebase_client as fb

logger = logging.getLogger(__name__)
audit_bp = Blueprint("audit", __name__)

# 🔥 In-memory job store (THIS is your real data source)
_jobs: dict[str, dict] = {}


def _run_audit(job_id: str, file_bytes: bytes, target_col: str, protected_attr: str, filename: str = "dataset.csv"):
    _jobs[job_id]["status"] = "running"
    fb.save_audit(job_id, {"job_id": job_id, "status": "running"})

    try:
        logger.info(f"[{job_id}] Starting audit...")

        # Upload original CSV to Firebase Storage for self-healing/mitigation restore
        try:
            fb.upload_job_csv(job_id, file_bytes)
            logger.info(f"[{job_id}] Uploaded dataset CSV to Firebase Storage.")
        except Exception as e:
            logger.error(f"[{job_id}] Failed to upload CSV to Firebase Storage: {e}")

        df = load_dataframe(file_bytes)
        logger.info(f"[{job_id}] Loaded dataframe: {df.shape}")

        result = train_and_evaluate(df, target_col, protected_attr)

        if result.get("pipelines") is None:
            raise Exception("Pipelines not created")

        logger.info(f"[{job_id}] Multi-model training done.")

        # Compute SHAP for each trained model and upload model artifacts to Storage
        eval_results = result["eval_results"]
        for name, pipe in result["pipelines"].items():
            try:
                logger.info(f"[{job_id}] Computing SHAP explanation for {name}...")
                shap_data = compute_shap_explanation(pipe, result["X_test"], protected_attr)
                eval_results[name].update(shap_data)

                # Serialize and upload model pickle to Firebase Storage
                import pickle
                pipe_bytes = pickle.dumps(pipe)
                fb.upload_model_artifact(job_id, name, pipe_bytes)
            except Exception as e:
                logger.error(f"Error post-processing model {name}: {e}")

        # Baseline Logistic Regression details for top-level backward compatibility
        lr_metrics = eval_results["logistic_regression"]

        # Timestamp in ISO format
        timestamp = datetime.datetime.utcnow().isoformat()

        payload = {
            "status": "done",
            "target_col": target_col,
            "protected_attr": protected_attr,
            "filename": filename,
            "timestamp": timestamp,

            # Multi-model data
            "recommended_model": result["recommended_model"],
            "models": eval_results,

            # Baseline top-level keys for backward compatibility
            "accuracy": lr_metrics["accuracy"],
            "precision": lr_metrics["precision"],
            "recall": lr_metrics["recall"],
            "f1_score": lr_metrics["f1_score"],
            "demographic_parity_difference": lr_metrics["demographic_parity_difference"],
            "demographic_parity_ratio": lr_metrics["demographic_parity_ratio"],
            "equalized_odds_difference": lr_metrics["equalized_odds_difference"],
            "equal_opportunity_difference": lr_metrics.get("equal_opportunity_difference", 0.0),
            "group_metrics": lr_metrics["group_metrics"],
            "selection_rates": lr_metrics["selection_rates"],
            "bias_verdict": lr_metrics["bias_verdict"],
            "top_features": lr_metrics.get("top_features", []),
            "shap_plot_b64": lr_metrics.get("shap_plot_b64", ""),

            # 🔥 ML artifacts (ONLY in memory, NEVER Firebase)
            "_pipelines": result["pipelines"],
            "_pipeline": result["pipelines"]["logistic_regression"],  # fallback
            "_X_train": result["X_train"],
            "_y_train": result["y_train"],
            "_s_train": result["s_train"],
            "_X_test": result["X_test"],
            "_y_test": result["y_test"],
            "_s_test": result["s_test"],
        }

        # Keep user_id if associated during start
        if "user_id" in _jobs[job_id]:
            payload["user_id"] = _jobs[job_id]["user_id"]

        # store full job in memory
        _jobs[job_id].update(payload)

        # store lightweight version in Firebase
        lightweight = {k: v for k, v in payload.items() if not k.startswith("_")}
        fb.save_audit(job_id, {"job_id": job_id, **lightweight})

        logger.info(f"[{job_id}] Audit complete and saved.")

    except Exception as exc:
        logger.error(f"[{job_id}] Audit failed: {exc}", exc_info=True)
        _jobs[job_id]["status"] = "error"
        _jobs[job_id]["error"] = str(exc)

        fb.save_audit(job_id, {
            "job_id": job_id,
            "status": "error",
            "error": str(exc)
        })



@audit_bp.post("/audit")
def start_audit():
    body = request.get_json(force=True) or {}
    file_id = body.get("file_id")
    target_col = body.get("target_col")
    protected_attr = body.get("protected_attr")
    filename = body.get("filename", "dataset.csv")
    user_id = body.get("user_id")

    # Authorize with token if available
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if token and not user_id:
        try:
            from firebase_admin import auth
            decoded = auth.verify_id_token(token)
            user_id = decoded["uid"]
        except Exception:
            if token.startswith("mock-"):
                user_id = token.replace("mock-", "")

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
        "filename": filename,
    }
    if user_id:
        _jobs[job_id]["user_id"] = user_id

    thread = threading.Thread(
        target=_run_audit,
        args=(job_id, file_bytes, target_col, protected_attr, filename),
        daemon=True,
    )
    thread.start()

    return jsonify({"job_id": job_id, "status": "pending"})


@audit_bp.get("/status/<job_id>")
def get_status(job_id: str):
    job = _jobs.get(job_id)

    # ✅ If job exists in memory → trust it
    if job is not None:
        return jsonify({
            "job_id": job_id,
            "status": job["status"],
            "error": job.get("error")
        })

    # 🔁 fallback to Firebase (ONLY metadata)
    try:
        fb_job = fb.get_audit(job_id)
        if fb_job:
            return jsonify({
                "job_id": job_id,
                "status": fb_job.get("status", "running")
            })
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
                return jsonify(fb_job)
        except Exception:
            pass

        return jsonify({"error": "Job not found"}), 404

    if job["status"] != "done":
        return jsonify({"job_id": job_id, "status": job["status"]}), 202

    # return only safe data
    result = {k: v for k, v in job.items() if not k.startswith("_")}
    return jsonify(result)


def get_job(job_id: str) -> dict | None:
    """
    Returns in-memory job (with ML artifacts).
    If not found in memory, attempts a self-healing restore from Firebase.
    """
    job = _jobs.get(job_id)
    if job is not None:
        return job

    # Try to restore from Firebase
    try:
        logger.info(f"[{job_id}] Job not found in memory. Attempting self-healing restore...")
        fb_job = fb.get_audit(job_id)
        if not fb_job:
            logger.warning(f"[{job_id}] No audit metadata found in Firestore.")
            return None

        # Fetch CSV
        csv_bytes = fb.download_job_csv(job_id)
        if not csv_bytes:
            logger.warning(f"[{job_id}] No dataset CSV found in Firebase Storage.")
            return None

        # Reconstruct the data splits
        target_col = fb_job.get("target_col")
        protected_attr = fb_job.get("protected_attr")
        if not target_col or not protected_attr:
            logger.warning(f"[{job_id}] target_col or protected_attr missing in metadata.")
            return None

        df = load_dataframe(csv_bytes)
        if len(df) > 800:
            df = df.sample(n=800, random_state=42).reset_index(drop=True)

        X_train, X_test, y_train, y_test, s_train, s_test = prepare_data(
            df, target_col, protected_attr
        )

        # Download pipelines
        pipelines = {}
        models_list = ["logistic_regression", "random_forest", "xgboost"]
        import pickle
        for model_name in models_list:
            try:
                pipe_bytes = fb.get_model_artifact(job_id, model_name)
                if pipe_bytes:
                    pipelines[model_name] = pickle.loads(pipe_bytes)
            except Exception as e:
                logger.error(f"[{job_id}] Failed to download/load pipeline {model_name}: {e}")

        if not pipelines:
            logger.warning(f"[{job_id}] No base pipelines could be retrieved from Firebase Storage.")
            return None

        restored_job = {
            **fb_job,
            "_pipelines": pipelines,
            "_pipeline": pipelines.get("logistic_regression"),
            "_X_train": X_train,
            "_y_train": y_train,
            "_s_train": s_train,
            "_X_test": X_test,
            "_y_test": y_test,
            "_s_test": s_test,
            "_mitigated_pipelines": {},
        }
        _jobs[job_id] = restored_job
        logger.info(f"[{job_id}] Successfully restored job in memory.")
        return restored_job
    except Exception as e:
        logger.error(f"[{job_id}] Exception during self-healing restore: {e}", exc_info=True)
        return None


@audit_bp.get("/download_model/<job_id>")
def download_model(job_id: str):
    model_name = request.args.get("model", "logistic_regression")
    job = get_job(job_id)

    # 1. Try in-memory
    pipeline = None
    if job:
        if model_name.startswith("mitigated_"):
            mitigated_pipelines = job.get("_mitigated_pipelines", {})
            pipeline = mitigated_pipelines.get(model_name)
        else:
            pipelines = job.get("_pipelines", {})
            pipeline = pipelines.get(model_name)
            if pipeline is None and model_name == "logistic_regression":
                pipeline = job.get("_pipeline")

    if pipeline is not None:
        import pickle
        import io
        buffer = io.BytesIO()
        pickle.dump(pipeline, buffer)
        buffer.seek(0)
        return send_file(
            buffer,
            mimetype="application/octet-stream",
            as_attachment=True,
            download_name=f"{model_name}_{job_id}.pkl"
        )

    # 2. Try Firebase Storage
    try:
        model_bytes = fb.get_model_artifact(job_id, model_name)
        if model_bytes:
            import io
            buffer = io.BytesIO(model_bytes)
            return send_file(
                buffer,
                mimetype="application/octet-stream",
                as_attachment=True,
                download_name=f"{model_name}_{job_id}.pkl"
            )
    except Exception as e:
        logger.error(f"Error fetching model artifact from Firebase Storage: {e}")

    return jsonify({"error": f"Model artifact '{model_name}' not found for job '{job_id}'"}), 404


@audit_bp.post("/audit/<job_id>/associate")
def associate_audit(job_id: str):
    body = request.get_json(force=True) or {}
    user_id = body.get("user_id")

    # Authorize with token if available
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if token:
        try:
            from firebase_admin import auth
            decoded = auth.verify_id_token(token)
            user_id = decoded["uid"]
        except Exception:
            if token.startswith("mock-"):
                user_id = token.replace("mock-", "")

    if not user_id:
        return jsonify({"error": "user_id or authorization token is required"}), 400

    job = get_job(job_id)
    if job:
        job["user_id"] = user_id

    fb.associate_user_to_audit(job_id, user_id)
    return jsonify({"status": "success", "job_id": job_id, "user_id": user_id})


@audit_bp.get("/history")
def get_history():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_id = None
    if token:
        try:
            from firebase_admin import auth
            decoded = auth.verify_id_token(token)
            user_id = decoded["uid"]
        except Exception:
            if token.startswith("mock-"):
                user_id = token.replace("mock-", "")

    if not user_id:
        user_id = request.args.get("user_id")

    if not user_id:
        return jsonify({"error": "user_id or authorization token required"}), 400

    # Retrieve from Firebase Firestore
    fb_audits = []
    try:
        fb_audits = fb.get_user_audits(user_id)
    except Exception as e:
        logger.warning(f"Failed to query Firestore history: {e}")

    # Query in-memory cache as fallback
    mem_audits = []
    for job_id, job in _jobs.items():
        if job.get("user_id") == user_id:
            lightweight = {k: v for k, v in job.items() if not k.startswith("_")}
            mem_audits.append(lightweight)

    # Combine and deduplicate by job_id
    combined = {a["job_id"]: a for a in fb_audits + mem_audits}
    result_list = list(combined.values())
    result_list.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

    return jsonify(result_list)