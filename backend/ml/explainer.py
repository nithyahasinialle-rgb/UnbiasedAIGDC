"""
ml/explainer.py – SHAP-based model explainability (memory-safe version)
"""

import io
import base64
import logging
import numpy as np
import pandas as pd
import gc

logger = logging.getLogger(__name__)


def compute_shap_explanation(pipeline, X_test: pd.DataFrame, protected_attr: str) -> dict:
    try:
        import shap
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        preprocessor = pipeline.named_steps["preprocessor"]
        classifier = pipeline.named_steps["classifier"]

        # 🔥 CRITICAL: reduce SHAP load drastically
        sample_size = min(len(X_test), 50)
        X_sample = X_test.sample(n=sample_size, random_state=42)

        # Transform data
        X_transformed = preprocessor.transform(X_sample)

        # 🔥 Reduce memory footprint
        if isinstance(X_transformed, np.ndarray):
            X_transformed = X_transformed.astype(np.float32)

        feature_names = _get_feature_names(preprocessor, X_sample)

        # Use LinearExplainer (fastest for logistic regression)
        explainer = shap.LinearExplainer(
            classifier,
            X_transformed,
            feature_perturbation="interventional"
        )

        shap_values = explainer.shap_values(X_transformed)

        # 🔥 Handle binary/multiclass outputs safely
        if isinstance(shap_values, list):
            shap_values = shap_values[0]

        mean_abs_shap = np.abs(shap_values).mean(axis=0)

        feature_importance = [
            {"feature": str(name), "importance": float(val)}
            for name, val in zip(feature_names, mean_abs_shap)
        ]

        feature_importance.sort(key=lambda x: x["importance"], reverse=True)
        top_features = feature_importance[:15]

        shap_plot_b64 = _generate_shap_bar_chart(top_features)

        # 🔥 Group-wise SHAP (lightweight)
        group_shap = {}
        if protected_attr in X_sample.columns:
            groups = X_sample[protected_attr].astype(str).unique()

            for group in groups:
                mask = X_sample[protected_attr].astype(str) == group

                if mask.sum() < 5:
                    continue

                group_vals = np.abs(shap_values[mask]).mean(axis=0)

                group_top = sorted(
                    [
                        {"feature": str(n), "importance": float(v)}
                        for n, v in zip(feature_names, group_vals)
                    ],
                    key=lambda x: x["importance"],
                    reverse=True
                )[:10]

                group_shap[group] = group_top

        # 🔥 Free memory aggressively
        del shap_values, X_transformed, explainer
        gc.collect()

        return {
            "top_features": top_features,
            "shap_plot_b64": shap_plot_b64,
            "group_shap": group_shap,
        }

    except Exception as exc:
        logger.error(f"SHAP computation error: {exc}", exc_info=True)
        return {
            "top_features": [],
            "shap_plot_b64": "",
            "group_shap": {},
            "error": str(exc),
        }


def _get_feature_names(preprocessor, X: pd.DataFrame) -> list:
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
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        features = [f["feature"] for f in reversed(top_features[:12])]
        importances = [f["importance"] for f in reversed(top_features[:12])]

        fig, ax = plt.subplots(figsize=(10, 6), facecolor="#0f0f23")
        ax.set_facecolor("#0f0f23")

        colors = [
            "#7c3aed" if i < len(features) // 2 else "#a855f7"
            for i in range(len(features))
        ]

        ax.barh(features, importances, color=colors, height=0.6)

        ax.set_xlabel("Mean |SHAP Value|", color="#e2e8f0", fontsize=11)
        ax.set_title("Feature Importance (SHAP)", color="#f8fafc", fontsize=13, fontweight="bold", pad=12)

        ax.tick_params(colors="#cbd5e1")

        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.spines["left"].set_color("#334155")
        ax.spines["bottom"].set_color("#334155")

        buf = io.BytesIO()
        plt.tight_layout()
        plt.savefig(buf, format="png", dpi=120, bbox_inches="tight", facecolor="#0f0f23")
        plt.close(fig)

        buf.seek(0)
        return base64.b64encode(buf.read()).decode("utf-8")

    except Exception as exc:
        logger.error(f"SHAP chart error: {exc}")
        return ""