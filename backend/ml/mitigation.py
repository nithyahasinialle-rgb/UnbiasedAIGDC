"""
ml/mitigation.py – Bias mitigation using Fairlearn
"""

import logging
import numpy as np
from sklearn.linear_model import LogisticRegression

logger = logging.getLogger(__name__)


def apply_mitigation(
    pipeline,
    X_train,
    y_train,
    s_train,
    X_test,
    y_test,
    s_test,
    method: str = "exponentiated_gradient",
) -> dict:
    """
    Apply bias mitigation and return metrics.

    Methods:
    - "exponentiated_gradient": Fairlearn ExponentiatedGradient with DemographicParity
    - "threshold_optimizer": Fairlearn ThresholdOptimizer
    """
    from ml.fairness import compute_fairness_metrics

    try:
        preprocessor = pipeline.named_steps["preprocessor"]
        X_train_t = preprocessor.transform(X_train)
        X_test_t = preprocessor.transform(X_test)

        s_train_arr = np.array(s_train).astype(str)
        s_test_arr = np.array(s_test).astype(str)
        y_train_arr = np.array(y_train)
        y_test_arr = np.array(y_test)

        base_classifier = LogisticRegression(max_iter=1000, random_state=42)

        if method == "threshold_optimizer":
            from fairlearn.postprocessing import ThresholdOptimizer

            # Fit the base classifier first
            base_classifier.fit(X_train_t, y_train_arr)

            mitigator = ThresholdOptimizer(
                estimator=base_classifier,
                constraints="demographic_parity",
                objective="balanced_accuracy_score",
                predict_method="predict_proba",
                prefit=True,
            )
            mitigator.fit(X_train_t, y_train_arr, sensitive_features=s_train_arr)
            y_pred_mit = mitigator.predict(X_test_t, sensitive_features=s_test_arr)

        else:
            # Default: ExponentiatedGradient
            from fairlearn.reductions import ExponentiatedGradient, DemographicParity

            mitigator = ExponentiatedGradient(
                estimator=base_classifier,
                constraints=DemographicParity(),
                eps=0.05,        # Slightly more relaxed for faster convergence
                max_iter=30,     # Reduced iterations for speed
            )
            mitigator.fit(X_train_t, y_train_arr, sensitive_features=s_train_arr)
            y_pred_mit = mitigator.predict(X_test_t)

        # Ensure integer predictions
        y_pred_mit = np.array(y_pred_mit).astype(int)

        # Compute post-mitigation fairness metrics
        mit_metrics = compute_fairness_metrics(y_test_arr, y_pred_mit, s_test_arr)
        mit_metrics["method"] = method
        return mit_metrics

    except Exception as exc:
        import traceback
        err_msg = f"Mitigation error ({method}): {exc}"
        logger.error(err_msg, exc_info=True)
        # Also log to a file we can read
        with open("mitigation_error.log", "a") as f:
            f.write(f"\n--- {method} error ---\n")
            f.write(traceback.format_exc())
        raise RuntimeError(err_msg)
