"""
ml/explainer.py – SHAP-based model explainability
"""

import io
import base64
import logging
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def compute_shap_explanation(pipeline, X_test: pd.DataFrame, protected_attr: str) -> dict:
    """
    Compute SHAP values and return:
    - top_features: list of {feature, importance} sorted by mean |SHAP|
    - shap_plot_b64: base64-encoded PNG of a summary bar chart
    """
    try:
        import shap
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        preprocessor = pipeline.named_steps["preprocessor"]
        classifier = pipeline.named_steps["classifier"]

        # Limit to 200 rows to avoid OOM crash on free tier
        X_sample = X_test.iloc[:200] if len(X_test) > 200 else X_test

        X_transformed = preprocessor.transform(X_sample)
        feature_names = _get_feature_names(preprocessor, X_sample)

        # Use LinearExplainer for logistic regression (faster and exact)
        explainer = shap.LinearExplainer(classifier, X_transformed, feature_perturbation="interventional")
        shap_values = explainer.shap_values(X_transformed)

        # Mean absolute SHAP per feature
        mean_abs_shap = np.abs(shap_values).mean(axis=0)

        # Build feature importance list
        feature_importance = [
            {"feature": str(name), "importance": float(val)}
            for name, val in zip(feature_names, mean_abs_shap)
        ]
        feature_importance.sort(key=lambda x: x["importance"], reverse=True)
        top_features = feature_importance[:15]

        # Generate bar chart
        shap_plot_b64 = _generate_shap_bar_chart(top_features)

        # Per-group SHAP (if protected_attr is in X_sample)
        group_shap = {}
        if protected_attr in X_sample.columns:
            groups = X_sample[protected_attr].astype(str).unique()
            for group in groups:
                mask = X_sample[protected_attr].astype(str) == group
                if mask.sum() < 5:
                    continue
                group_shap_vals = np.abs(shap_values[mask]).mean(axis=0)
                group_top = sorted(
                    [{"feature": str(n), "importance": float(v)} for n, v in zip(feature_names, group_shap_vals)],
                    key=lambda x: x["importance"],
                    reverse=True
                )[:10]
                group_shap[group] = group_top

        return {
            "top_features": top_features,
            "shap_plot_b64": shap_plot_b64,
            "group_shap": group_shap,
        }

    except Exception as exc:
        logger.error(f"SHAP computation error: {exc}")
        return {
            "top_features": [],
            "shap_plot_b64": "",
            "group_shap": {},
            "error": str(exc),
        }


def _get_feature_names(preprocessor, X: pd.DataFrame) -> list:
    """Extract feature names from a fitted ColumnTransformer."""
    names = []
    for name, transformer, cols in preprocessor.transformers_:
        if name == "num":
            names.extend(cols)
        elif name == "cat":
            try:
                encoder = transformer.named_steps["encoder"]
                cat_names = encoder.get_feature_names_out(cols).tolist()
                names.extend(cat_names)
            except Exception:
                names.extend(cols)
    if not names:
        names = [f"feature_{i}" for i in range(preprocessor.transform(X).shape[1])]
    return names


def _generate_shap_bar_chart(top_features: list) -> str:
    """Generate a horizontal bar chart of SHAP importances and return as base64 PNG."""
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        features = [f["feature"] for f in reversed(top_features[:12])]
        importances = [f["importance"] for f in reversed(top_features[:12])]

        fig, ax = plt.subplots(figsize=(10, 6), facecolor="#0f0f23")
        ax.set_facecolor("#0f0f23")

        colors = ["#7c3aed" if i < len(features) // 2 else "#a855f7" for i in range(len(features))]
        bars = ax.barh(features, importances, color=colors, height=0.6, edgecolor="none")

        ax.set_xlabel("Mean |SHAP Value|", color="#e2e8f0", fontsize=11)
        ax.set_title("Feature Importance (SHAP)", color="#f8fafc", fontsize=13, fontweight="bold", pad=12)
        ax.tick_params(colors="#cbd5e1")
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.spines["left"].set_color("#334155")
        ax.spines["bottom"].set_color("#334155")
        ax.xaxis.label.set_color("#94a3b8")

        buf = io.BytesIO()
        plt.tight_layout()
        plt.savefig(buf, format="png", dpi=120, bbox_inches="tight", facecolor="#0f0f23")
        plt.close(fig)
        buf.seek(0)
        return base64.b64encode(buf.read()).decode("utf-8")

    except Exception as exc:
        logger.error(f"SHAP chart error: {exc}")
        return ""