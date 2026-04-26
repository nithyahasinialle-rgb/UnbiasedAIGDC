"""
routes/report.py – POST /api/report
Generate a plain-English fairness report using Gemini.
"""

import logging
from flask import Blueprint, request, jsonify

from routes.audit import get_job
from gemini_client import generate_report

logger = logging.getLogger(__name__)
report_bp = Blueprint("report", __name__)


@report_bp.post("/report")
def create_report():
    """
    Body: { job_id, mitigation_method? }
    Returns: { report_markdown, job_id }
    """
    body = request.get_json(force=True) or {}
    job_id = body.get("job_id")

    if not job_id:
        return jsonify({"error": "job_id is required"}), 400

    job = get_job(job_id)
    if job is None:
        return jsonify({"error": "Job not found. Run /api/audit first."}), 404
    if job["status"] != "done":
        return jsonify({"error": f"Audit not complete (status: {job['status']})"}), 409

    # Build metrics payload for Gemini
    metrics_payload = {
        "target_col": job.get("target_col"),
        "protected_attr": job.get("protected_attr"),
        "accuracy": job.get("accuracy"),
        "demographic_parity_difference": job.get("demographic_parity_difference"),
        "demographic_parity_ratio": job.get("demographic_parity_ratio"),
        "equalized_odds_difference": job.get("equalized_odds_difference"),
        "group_metrics": job.get("group_metrics", {}),
        "top_features": job.get("top_features", []),
        "bias_verdict": job.get("bias_verdict"),
    }

    # Include mitigation data if requested
    mitigation_method = body.get("mitigation_method")
    if mitigation_method:
        metrics_payload["mitigation_applied"] = mitigation_method

    report_markdown = generate_report(metrics_payload)

    return jsonify({
        "job_id": job_id,
        "report_markdown": report_markdown,
    })
