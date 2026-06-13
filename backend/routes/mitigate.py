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
    model_name = body.get("model")

    if not job_id:
        return jsonify({"error": "job_id is required"}), 400

    job = get_job(job_id)
    if job is None:
        return jsonify({"error": "Job not found. Run /api/audit first."}), 404
    if job["status"] != "done":
        return jsonify({"error": f"Job is not done yet (status: {job['status']})"}), 409

    # Retrieve stored ML artifacts based on recommended model or selection
    recommended = job.get("recommended_model", {})
    if not model_name:
        model_name = recommended.get("best_balanced") or "logistic_regression"

    pipelines = job.get("_pipelines", {})
    pipeline = pipelines.get(model_name)
    if pipeline is None:
        pipeline = job.get("_pipeline")

    X_train = job.get("_X_train")
    y_train = job.get("_y_train")
    s_train = job.get("_s_train")
    X_test = job.get("_X_test")
    y_test = job.get("_y_test")
    s_test = job.get("_s_test")

    if pipeline is None:
        return jsonify({"error": "ML artifacts not found. Re-run the audit."}), 409

    # Before metrics (already computed) for the specific model
    models = job.get("models", {})
    model_metrics = models.get(model_name, {})
    if not model_metrics:
        model_metrics = job

    before = {
        "accuracy": model_metrics.get("accuracy"),
        "demographic_parity_difference": model_metrics.get("demographic_parity_difference"),
        "demographic_parity_ratio": model_metrics.get("demographic_parity_ratio"),
        "equalized_odds_difference": model_metrics.get("equalized_odds_difference"),
        "group_metrics": model_metrics.get("group_metrics", {}),
        "selection_rates": model_metrics.get("selection_rates", []),
        "bias_verdict": model_metrics.get("bias_verdict"),
    }

    try:
        after, mitigated_pipeline = apply_mitigation(
            pipeline, X_train, y_train, s_train, X_test, y_test, s_test, method
        )
        
        # Save in memory
        if "_mitigated_pipelines" not in job:
            job["_mitigated_pipelines"] = {}
        mit_key = f"mitigated_{model_name}_{method}"
        job["_mitigated_pipelines"][mit_key] = mitigated_pipeline
        
        # Save to Firebase Storage
        import pickle
        import firebase_client as fb
        try:
            pipe_bytes = pickle.dumps(mitigated_pipeline)
            fb.upload_model_artifact(job_id, mit_key, pipe_bytes)
        except Exception as e:
            logger.error(f"Error saving mitigated model artifact for job {job_id}: {e}")
            
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500

    return jsonify({
        "job_id": job_id,
        "method": method,
        "model_mitigated": model_name,
        "before": before,
        "after": after,
    })
