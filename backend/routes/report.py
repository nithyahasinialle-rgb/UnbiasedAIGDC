"""
routes/report.py – POST /api/report
Generate a plain-English fairness report using Gemini.
"""

import logging
from flask import Blueprint, request, jsonify

from routes.audit import get_job
from gemini_client import generate_report, generate_advisor_guidance

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


@report_bp.post("/advisor")
def get_advisor():
    """
    Body: { job_id }
    Returns: { advisor_markdown, job_id }
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

    metrics_payload = {
        "target_col": job.get("target_col"),
        "protected_attr": job.get("protected_attr"),
        "accuracy": job.get("accuracy"),
        "demographic_parity_difference": job.get("demographic_parity_difference"),
        "demographic_parity_ratio": job.get("demographic_parity_ratio"),
        "equalized_odds_difference": job.get("equalized_odds_difference"),
        "equal_opportunity_difference": job.get("equal_opportunity_difference", 0.0),
        "group_metrics": job.get("group_metrics", {}),
        "top_features": job.get("top_features", []),
        "bias_verdict": job.get("bias_verdict"),
    }

    advisor_markdown = generate_advisor_guidance(metrics_payload)

    return jsonify({
        "job_id": job_id,
        "advisor_markdown": advisor_markdown,
    })


@report_bp.post("/chat")
def chat():
    """
    Body: { message, history: [{role, text}], job_id? }
    Returns: { reply }
    """
    body = request.get_json(force=True) or {}
    job_id = body.get("job_id")
    message = body.get("message")
    history = body.get("history", [])

    if not message:
        return jsonify({"error": "message is required"}), 400

    job_context = None
    if job_id:
        job = get_job(job_id)
        if job:
            job_context = {
                "target_col": job.get("target_col"),
                "protected_attr": job.get("protected_attr"),
                "accuracy": job.get("accuracy"),
                "demographic_parity_difference": job.get("demographic_parity_difference"),
                "demographic_parity_ratio": job.get("demographic_parity_ratio"),
                "recommended_model": job.get("recommended_model"),
            }

    from gemini_client import run_chat_session
    reply = run_chat_session(message, history, job_context)

    return jsonify({"reply": reply})
