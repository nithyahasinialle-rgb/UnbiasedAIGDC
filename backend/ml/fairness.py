"""
ml/fairness.py – Fairness metric computation using Fairlearn
"""

import numpy as np
import pandas as pd
from fairlearn.metrics import (
    MetricFrame,
    selection_rate,
    demographic_parity_difference,
    demographic_parity_ratio,
    equalized_odds_difference,
    false_positive_rate,
    false_negative_rate,
)
from sklearn.metrics import accuracy_score


def compute_fairness_metrics(y_test, y_pred, s_test) -> dict:
    """
    Compute comprehensive fairness metrics.
    Returns a dict suitable for JSON serialization.
    """
    y_test = np.array(y_test)
    y_pred = np.array(y_pred)
    s_test = np.array(s_test).astype(str)

    # Overall accuracy
    accuracy = float(accuracy_score(y_test, y_pred))

    # Scalar fairness metrics
    dp_diff = float(demographic_parity_difference(y_test, y_pred, sensitive_features=s_test))
    dp_ratio = float(demographic_parity_ratio(y_test, y_pred, sensitive_features=s_test))
    eo_diff = float(equalized_odds_difference(y_test, y_pred, sensitive_features=s_test))

    # Per-group metrics
    metric_frame = MetricFrame(
        metrics={
            "selection_rate": selection_rate,
            "accuracy": accuracy_score,
            "fpr": false_positive_rate,
            "fnr": false_negative_rate,
        },
        y_true=y_test,
        y_pred=y_pred,
        sensitive_features=s_test,
    )

    group_metrics = {}
    for group in metric_frame.by_group.index:
        row = metric_frame.by_group.loc[group]
        group_metrics[str(group)] = {
            "selection_rate": _safe_float(row.get("selection_rate", 0)),
            "accuracy": _safe_float(row.get("accuracy", 0)),
            "fpr": _safe_float(row.get("fpr", 0)),
            "fnr": _safe_float(row.get("fnr", 0)),
        }

    # Selection rates list for chart
    selection_rates = [
        {"group": str(g), "rate": group_metrics[str(g)]["selection_rate"]}
        for g in metric_frame.by_group.index
    ]

    return {
        "accuracy": accuracy,
        "demographic_parity_difference": dp_diff,
        "demographic_parity_ratio": dp_ratio,
        "equalized_odds_difference": eo_diff,
        "group_metrics": group_metrics,
        "selection_rates": selection_rates,
        "bias_verdict": _bias_verdict(dp_diff),
    }


def _safe_float(val) -> float:
    try:
        f = float(val)
        return f if np.isfinite(f) else 0.0
    except Exception:
        return 0.0


def _bias_verdict(dp_diff: float) -> str:
    abs_diff = abs(dp_diff)
    if abs_diff < 0.05:
        return "fair"
    elif abs_diff < 0.10:
        return "slight_bias"
    elif abs_diff < 0.15:
        return "moderate_bias"
    else:
        return "significant_bias"
