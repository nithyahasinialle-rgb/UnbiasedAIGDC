"""
gemini_client.py – Google Gemini API wrapper for report generation
"""

import os
import logging

logger = logging.getLogger(__name__)


def generate_report(metrics_payload: dict) -> str:
    """
    Send fairness metrics to Gemini and return a plain-English markdown report.
    """
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return _fallback_report(metrics_payload)

    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = _build_prompt(metrics_payload)
        response = model.generate_content(prompt)
        return response.text

    except Exception as exc:
        logger.error(f"Gemini API error: {exc}")
        return _fallback_report(metrics_payload)


def _build_prompt(m: dict) -> str:
    target = m.get("target_col", "outcome")
    protected = m.get("protected_attr", "group")
    accuracy = m.get("accuracy", 0)
    dp_diff = m.get("demographic_parity_difference", 0)
    dp_ratio = m.get("demographic_parity_ratio", 0)
    eo_diff = m.get("equalized_odds_difference", 0)
    groups = m.get("group_metrics", {})
    top_features = m.get("top_features", [])
    mitigation = m.get("mitigation_applied", None)
    mitigated_accuracy = m.get("mitigated_accuracy", None)
    mitigated_dp_diff = m.get("mitigated_demographic_parity_difference", None)

    groups_text = ""
    for g, vals in groups.items():
        groups_text += f"  - **{g}**: Selection Rate = {vals.get('selection_rate', 0):.2%}, FPR = {vals.get('fpr', 0):.2%}, FNR = {vals.get('fnr', 0):.2%}\n"

    features_text = ", ".join([f"{f['feature']} ({f['importance']:.3f})" for f in top_features[:5]])

    mitigation_text = ""
    if mitigation:
        mitigation_text = f"""
### Mitigation Applied
- **Method**: {mitigation}
- **Post-mitigation Accuracy**: {mitigated_accuracy:.2%}
- **Post-mitigation Demographic Parity Difference**: {mitigated_dp_diff:.4f}
"""

    return f"""You are an AI fairness expert writing an executive report for a non-technical business audience.

Below are the fairness audit results for an AI model that predicts **{target}** using a dataset where **{protected}** is the protected attribute.

## Audit Results
- **Overall Model Accuracy**: {accuracy:.2%}
- **Demographic Parity Difference**: {dp_diff:.4f} (closer to 0 is fairer; >0.1 is concerning)
- **Demographic Parity Ratio**: {dp_ratio:.4f} (closer to 1.0 is fairer)
- **Equalized Odds Difference**: {eo_diff:.4f}

### Per-Group Metrics
{groups_text}

### Top Influential Features
{features_text}

{mitigation_text}

## Your Task
Write a professional, plain-English executive summary report in **3 sections** using markdown:
1. **Executive Summary** – What the model does and an overall fairness verdict (fair / concerning / unfair)
2. **Key Findings** – Explain the bias patterns found, which groups are affected, and what features drive the bias
3. **Recommendations** – Practical next steps the organization should take, including whether mitigation was effective

Keep the language clear and accessible. Avoid raw numbers — instead explain them in business terms. The report should be 300-400 words total.
"""


def _fallback_report(m: dict) -> str:
    dp_diff = m.get("demographic_parity_difference", 0)
    verdict = "fair" if abs(dp_diff) < 0.05 else ("concerning" if abs(dp_diff) < 0.15 else "unfair")
    return f"""## Executive Summary

This AI fairness audit evaluated the predictive model for **{m.get('target_col', 'the target outcome')}** with respect to the protected attribute **{m.get('protected_attr', 'the sensitive group')}**. Based on the demographic parity difference of **{dp_diff:.4f}**, the model is assessed as **{verdict}**.

## Key Findings

The audit identified measurable disparities in selection rates across protected groups. A demographic parity difference greater than 0.1 indicates that certain groups are systematically favored or disadvantaged by the model's decisions. The top predictive features suggest that proxy variables correlated with the protected attribute may be amplifying historical biases present in the training data.

## Recommendations

1. **Review training data** for historical bias and consider rebalancing or reweighting samples.
2. **Apply bias mitigation** techniques such as Exponentiated Gradient or Threshold Optimizer to reduce parity gaps.
3. **Monitor the model continuously** with regular fairness audits as new data arrives.
4. **Engage stakeholders** from affected groups to validate that the model's decisions align with organizational equity goals.
5. **Consult legal counsel** to ensure compliance with relevant anti-discrimination regulations.

> *Note: This report was generated without the Gemini API. Configure your GEMINI_API_KEY for AI-powered narrative analysis.*
"""
