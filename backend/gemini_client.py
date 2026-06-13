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


def generate_advisor_guidance(metrics_payload: dict) -> str:
    """
    Send fairness metrics to Gemini and return a detailed consulting explanation
    covering the 8 requested sections for non-technical users.
    """
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return _fallback_advisor(metrics_payload)

    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = _build_advisor_prompt(metrics_payload)
        response = model.generate_content(prompt)
        return response.text

    except Exception as exc:
        logger.error(f"Gemini API advisor error: {exc}")
        return _fallback_advisor(metrics_payload)


def _build_advisor_prompt(m: dict) -> str:
    target = m.get("target_col", "outcome")
    protected = m.get("protected_attr", "group")
    accuracy = m.get("accuracy", 0)
    dp_diff = m.get("demographic_parity_difference", 0)
    dp_ratio = m.get("demographic_parity_ratio", 0)
    eo_diff = m.get("equalized_odds_difference", 0)
    eo_opp_diff = m.get("equal_opportunity_difference", 0.0)
    groups = m.get("group_metrics", {})
    top_features = m.get("top_features", [])

    groups_text = ""
    for g, vals in groups.items():
        groups_text += f"  - Group '{g}': Selection Rate = {vals.get('selection_rate', 0):.2%}, Accuracy = {vals.get('accuracy', 0):.2%}, FPR = {vals.get('fpr', 0):.2%}, FNR = {vals.get('fnr', 0):.2%}\n"

    features_text = ", ".join([f"{f['feature']} ({f['importance']:.3f})" for f in top_features[:5]])

    return f"""You are an intelligent, senior AI Fairness & Governance Consultant. 
Your task is to analyze the following real model audit metrics and provide a comprehensive, friendly, and non-technical advice report. 

Audit metrics:
- Target variable to predict: {target}
- Protected attribute (sensitive group): {protected}
- Overall Model Accuracy: {accuracy:.2%}
- Demographic Parity Difference (Statistical Parity Difference): {dp_diff:.4f} (0 is perfect fairness, >0.10 is bias)
- Disparate Impact (Demographic Parity Ratio): {dp_ratio:.4f} (1.0 is perfect fairness, <0.80 violates the 4/5ths rule)
- Equalized Odds Difference: {eo_diff:.4f}
- Equal Opportunity Difference: {eo_opp_diff:.4f}

Per-Group Detail:
{groups_text}

Top Influential Features (SHAP values):
{features_text}

Based on these actual metrics, please provide an explanation structured exactly into these 8 numbered sections (use clean markdown formatting, friendly tone, and clear headings):
1. **Bias Detected Verdict**: Explain clearly what bias (if any) was detected, comparing the metrics against standard thresholds (e.g. demographic parity diff > 0.10 or ratio < 0.80).
2. **Affected Groups**: Identify which specific groups are being disadvantaged or favored according to the selection rates.
3. **Why the Bias Likely Occurred**: Explain the mathematical/historical reasons why the model became biased, linking it to the top influential features (proxies) and how they relate to the target and protected attribute.
4. **Business Risks**: Detail real-world business risks of deploying this model (e.g., loss of brand reputation, customer/user trust, operational risk).
5. **Ethical Concerns**: Detail the human impact, systemic discrimination, and fairness concerns.
6. **Regulatory Concerns**: Reference compliance issues with modern regulations (e.g., EEOC guidelines, GDPR Article 22, EU AI Act requirements on high-risk models).
7. **Recommended Mitigation Strategy**: Suggest whether Exponentiated Gradient (in-processing) or Threshold Optimizer (post-processing) is better suited here and why.
8. **Expected Trade-offs**: Explain the trade-offs (e.g. accuracy drop vs. fairness gains) that stakeholders must anticipate when applying this mitigation.

Make the language clear, accessible, and engaging. Avoid dry descriptions. Do NOT use placeholders. Keep the total output around 350-500 words.
"""


def _fallback_advisor(m: dict) -> str:
    target = m.get("target_col", "outcome")
    protected = m.get("protected_attr", "group")
    dp_diff = m.get("demographic_parity_difference", 0.0)
    dp_ratio = m.get("demographic_parity_ratio", 1.0)

    verdict = "Significant Bias Detected" if abs(dp_diff) >= 0.15 else ("Moderate Bias Detected" if abs(dp_diff) >= 0.05 else "No Significant Bias Detected")
    mitigation_rec = "Exponentiated Gradient (in-processing) to re-train the model constraints" if abs(dp_diff) >= 0.10 else "Threshold Optimizer (post-processing) to adjust decision boundaries"

    return f"""### 1. Bias Detected Verdict
Based on the audit metrics, we found **{verdict}** (Demographic Parity Difference: **{dp_diff:.4f}**, Ratio: **{dp_ratio:.4f}**). A demographic parity gap greater than 0.10 indicates systematic disparity in how predictions for **{target}** are made across protected groups.

### 2. Affected Groups
According to group-specific selection rates, groups with lower selection rates are receiving fewer positive outcomes, while other groups are disproportionately favored. This creates a clear disparity in selection opportunity.

### 3. Why the Bias Likely Occurred
Bias in this model likely stems from historical imbalances in the training dataset. If proxy features correlated with **{protected}** are highly weighted (as shown by SHAP values), the model reconstructs sensitive group identity and replicates historical bias, even if the attribute **{protected}** is omitted from training.

### 4. Business Risks
Deploying this model exposes the organization to operational vulnerabilities, potentially excluding creditworthy or qualified applicants, reducing the addressable market size, and causing negative customer backlash.

### 5. Ethical Concerns
Using biased predictions perpetuates historical inequalities, reinforcing systemic discrimination. It reduces individual human opportunities to a statistical profile that correlates with protected attributes.

### 6. Regulatory Concerns
This level of disparate impact violates the **EEOC 4/5ths Rule** (since Disparate Impact is {dp_ratio:.4f}, which may be below 0.80). Furthermore, it risks non-compliance under **GDPR Article 22** (regarding automated decision-making) and the **EU AI Act** requirements for high-risk AI applications.

### 7. Recommended Mitigation Strategy
We recommend applying **{mitigation_rec}**. This will balance selection rates across group boundaries.

### 8. Expected Trade-offs
Mitigating bias typically introduces a slight trade-off: a minor drop in overall model accuracy (often 1-3%) in exchange for a substantial increase in group fairness and regulatory compliance.

> *Note: This consultation report was generated without the Gemini API. Configure your GEMINI_API_KEY for a fully custom narrative.*
"""


def run_chat_session(message: str, history: list, job_context: dict = None) -> str:
    """
    Run a chat conversation with Gemini, incorporating job metrics context if available.
    """
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        # Fallback offline replies
        res = "I am currently running in Offline demo mode. Please configure a GEMINI_API_KEY to activate my cognitive core.\n\n"
        if job_context:
            res += f"However, looking at your active dataset, the target column is **{job_context.get('target_col')}** and the protected attribute is **{job_context.get('protected_attr')}**. "
            res += f"The baseline model has an accuracy of **{(job_context.get('accuracy', 0)*100):.1f}%** and a demographic parity difference of **{job_context.get('demographic_parity_difference', 0):.4f}**."
        else:
            res += "You can ask me questions about AI governance, statistical parity, disparate impact, or mitigation techniques."
        return res

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)

        system_instruction = "You are UnbiasedAI's Interactive Fairness Consultant. You help users understand algorithmic bias, model performance, and bias mitigation. Keep your responses friendly, concise, and structured in clean markdown."
        if job_context:
            target = job_context.get("target_col", "outcome")
            protected = job_context.get("protected_attr", "group")
            accuracy = job_context.get("accuracy", 0.0)
            dp_diff = job_context.get("demographic_parity_difference", 0.0)
            dp_ratio = job_context.get("demographic_parity_ratio", 1.0)
            best_model = job_context.get("recommended_model", {}).get("best_balanced", "logistic_regression")

            system_instruction += f"\n\nThe user is currently looking at their fairness audit results for a dataset with target variable '{target}' and protected attribute '{protected}'."
            system_instruction += f"\nHere are the baseline model metrics:"
            system_instruction += f"\n- Overall Model Accuracy: {accuracy:.2%}"
            system_instruction += f"\n- Demographic Parity Difference: {dp_diff:.4f}"
            system_instruction += f"\n- Disparate Impact Ratio (Parity Ratio): {dp_ratio:.4f}"
            system_instruction += f"\n- Recommended Best Balanced Model: {best_model}"

        model = genai.GenerativeModel("gemini-1.5-flash", system_instruction=system_instruction)

        # Convert history format to Google's format: [{ 'role': 'user'/'model', 'parts': [text] }]
        formatted_history = []
        for h in history:
            role = "user" if h.get("role") == "user" else "model"
            formatted_history.append({
                "role": role,
                "parts": [h.get("text", "")]
            })

        chat = model.start_chat(history=formatted_history)
        response = chat.send_message(message)
        return response.text

    except Exception as e:
        logger.error(f"Error in chat session: {e}")
        return "Sorry, I encountered an error while communicating with my cognitive core. Please try again."
