"""
ml/pipeline.py – Core ML preprocessing, training, and evaluation pipeline
"""

import io
import gc
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score


def load_dataframe(file_bytes: bytes) -> pd.DataFrame:
    """Load CSV from bytes."""
    df = pd.read_csv(io.BytesIO(file_bytes))

    # 🔥 Drop completely empty columns (fixes your warning + saves memory)
    df = df.dropna(axis=1, how="all")

    return df


def get_column_info(df: pd.DataFrame) -> dict:
    """Return column names and dtypes for frontend dropdowns."""
    cols = []
    for col in df.columns:
        dtype = str(df[col].dtype)
        n_unique = int(df[col].nunique())
        cols.append({"name": col, "dtype": dtype, "n_unique": n_unique})
    return {"columns": cols, "n_rows": len(df), "n_cols": len(df.columns)}


def build_pipeline(X_train: pd.DataFrame, model_type: str = "logistic_regression") -> Pipeline:
    """Build a sklearn preprocessing + classifier pipeline."""
    numeric_cols = X_train.select_dtypes(include=["number"]).columns.tolist()
    cat_cols = X_train.select_dtypes(exclude=["number"]).columns.tolist()

    numeric_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    categorical_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        # 🔥 Limit category explosion (VERY important for memory)
        ("encoder", OneHotEncoder(
            handle_unknown="ignore",
            sparse_output=False,
            max_categories=10
        )),
    ])

    transformers = []
    if numeric_cols:
        transformers.append(("num", numeric_transformer, numeric_cols))
    if cat_cols:
        transformers.append(("cat", categorical_transformer, cat_cols))

    preprocessor = ColumnTransformer(transformers=transformers)

    if model_type == "logistic_regression":
        classifier = LogisticRegression(
            max_iter=300,
            random_state=42,
            solver="saga",
            n_jobs=1,
        )
    elif model_type == "random_forest":
        from sklearn.ensemble import RandomForestClassifier
        classifier = RandomForestClassifier(
            n_estimators=100,
            random_state=42,
            n_jobs=1,
        )
    elif model_type == "xgboost":
        from xgboost import XGBClassifier
        classifier = XGBClassifier(
            n_estimators=100,
            random_state=42,
            n_jobs=1,
            eval_metric="logloss",
        )
    else:
        raise ValueError(f"Unknown model type: {model_type}")

    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", classifier),
    ])

    return pipeline



def prepare_data(df: pd.DataFrame, target_col: str, protected_attr: str):
    """
    Split dataframe into X, y, and sensitive_features.
    Returns train/test splits.
    """
    if target_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' not found in dataset.")
    if protected_attr not in df.columns:
        raise ValueError(f"Protected attribute '{protected_attr}' not found in dataset.")

    y = df[target_col].copy()

    if y.dtype == object or str(y.dtype) == "bool":
        unique_vals = y.unique()
        if len(unique_vals) != 2:
            raise ValueError(f"Target column must be binary but has {len(unique_vals)} unique values.")
        positive_label = sorted(unique_vals)[-1]
        y = (y == positive_label).astype(int)
    else:
        y = y.astype(int)

    feature_cols = [c for c in df.columns if c != target_col]
    X = df[feature_cols].copy()
    sensitive = df[protected_attr].copy().astype(str)

    X_train, X_test, y_train, y_test, s_train, s_test = train_test_split(
        X, y, sensitive,
        test_size=0.25,
        random_state=42,
        stratify=y
    )

    return X_train, X_test, y_train, y_test, s_train, s_test


def train_and_evaluate(df: pd.DataFrame, target_col: str, protected_attr: str) -> dict:
    """
    Full training and evaluation pipeline for multiple models.
    Returns comparison metrics and model artifacts.
    """

    # 🔥 HARD LIMIT dataset size (prevents SIGKILL)
    if len(df) > 800:
        df = df.sample(n=800, random_state=42).reset_index(drop=True)

    X_train, X_test, y_train, y_test, s_train, s_test = prepare_data(
        df, target_col, protected_attr
    )

    models_list = ["logistic_regression", "random_forest", "xgboost"]
    pipelines = {}
    eval_results = {}

    from ml.fairness import compute_fairness_metrics
    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

    for model_name in models_list:
        try:
            pipeline = build_pipeline(X_train, model_name)
            pipeline.fit(X_train, y_train)

            y_pred = pipeline.predict(X_test)

            # Performance metrics
            acc = float(accuracy_score(y_test, y_pred))
            prec = float(precision_score(y_test, y_pred, zero_division=0))
            rec = float(recall_score(y_test, y_pred, zero_division=0))
            f1 = float(f1_score(y_test, y_pred, zero_division=0))

            # Fairness metrics
            fairness = compute_fairness_metrics(y_test, y_pred, s_test)

            pipelines[model_name] = pipeline
            eval_results[model_name] = {
                "accuracy": acc,
                "precision": prec,
                "recall": rec,
                "f1_score": f1,
                **fairness
            }
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to train model {model_name}: {e}", exc_info=True)

    # 🔥 Free memory (small but useful)
    gc.collect()

    if "logistic_regression" not in pipelines:
        raise Exception("Baseline Logistic Regression failed to train.")

    # Determine recommended models
    # Best Accuracy
    best_acc_model = max(eval_results.keys(), key=lambda k: eval_results[k]["accuracy"])

    # Fairest model: lowest demographic parity difference absolute value
    fairest_model = min(eval_results.keys(), key=lambda k: abs(eval_results[k]["demographic_parity_difference"]))

    # Best Balanced model: highest score = (Accuracy + (1 - |demographic_parity_difference|)) / 2
    def balanced_score(k):
        acc = eval_results[k]["accuracy"]
        dp_diff = abs(eval_results[k]["demographic_parity_difference"])
        return (acc + (1.0 - dp_diff)) / 2.0
    best_balanced_model = max(eval_results.keys(), key=balanced_score)

    recommendation = {
        "best_accuracy": best_acc_model,
        "fairest": fairest_model,
        "best_balanced": best_balanced_model,
        "logic": "Best Accuracy model achieved the highest overall accuracy score. Fairest model has the demographic parity difference closest to 0. Best Balanced model maximizes the balance between performance and group fairness: (Accuracy + (1 - |Demographic Parity Difference|)) / 2."
    }

    # Baseline model for backward compatibility
    lr_res = eval_results["logistic_regression"]

    return {
        "pipelines": pipelines,
        "eval_results": eval_results,
        "recommended_model": recommendation,

        # Top-level keys for backward compatibility (LR)
        "pipeline": pipelines["logistic_regression"],
        "X_train": X_train,
        "X_test": X_test,
        "y_train": y_train,
        "y_test": y_test,
        "y_pred": pipelines["logistic_regression"].predict(X_test),
        "s_train": s_train,
        "s_test": s_test,
        "accuracy": lr_res["accuracy"],
        "demographic_parity_difference": lr_res["demographic_parity_difference"],
        "demographic_parity_ratio": lr_res["demographic_parity_ratio"],
        "equalized_odds_difference": lr_res["equalized_odds_difference"],
        "equal_opportunity_difference": lr_res.get("equal_opportunity_difference", 0.0),
        "group_metrics": lr_res["group_metrics"],
        "selection_rates": lr_res["selection_rates"],
        "bias_verdict": lr_res["bias_verdict"],
        "target_col": target_col,
        "protected_attr": protected_attr,
    }