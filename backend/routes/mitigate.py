"""
routes/mitigate.py – POST /api/mitigate
Apply bias mitigation and return before/after comparison.
"""

import logging
from flask import Blueprint, request, jsonify

from routes.audit import get_job
from ml.mitigation import apply_mitigation

logger = logging.getLogger(__name__)
mitigate_bp = Blueprint("mitigate", __name__)


@mitigate_bp.post("/mitigate")
def mitigate():
    """
    Body: { job_id, method }
    method: "exponentiated_gradient" | "threshold_optimizer"
    Returns: { before: {...metrics}, after: {...metrics}, method }
    """
    body = request.get_json(force=True) or {}
    job_id = body.get("job_id")
    method = body.get("method", "exponentiated_gradient")

    if not job_id:
        return jsonify({"error": "job_id is required"}), 400

    job = get_job(job_id)
    if job is None:
        return jsonify({"error": "Job not found. Run /api/audit first."}), 404
    if job["status"] != "done":
        return jsonify({"error": f"Job is not done yet (status: {job['status']})"}), 409

    # Retrieve stored ML artifacts
    pipeline = job.get("_pipeline")
    X_train = job.get("_X_train")
    y_train = job.get("_y_train")
    s_train = job.get("_s_train")
    X_test = job.get("_X_test")
    y_test = job.get("_y_test")
    s_test = job.get("_s_test")

    if pipeline is None:
        return jsonify({"error": "ML artifacts not found. Re-run the audit."}), 409

    # Before metrics (already computed)
    before = {
        "accuracy": job.get("accuracy"),
        "demographic_parity_difference": job.get("demographic_parity_difference"),
        "demographic_parity_ratio": job.get("demographic_parity_ratio"),
        "equalized_odds_difference": job.get("equalized_odds_difference"),
        "group_metrics": job.get("group_metrics", {}),
        "selection_rates": job.get("selection_rates", []),
        "bias_verdict": job.get("bias_verdict"),
    }

    try:
        after = apply_mitigation(
            pipeline, X_train, y_train, s_train, X_test, y_test, s_test, method
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

    return jsonify({
        "job_id": job_id,
        "method": method,
        "before": before,
        "after": after,
    })
