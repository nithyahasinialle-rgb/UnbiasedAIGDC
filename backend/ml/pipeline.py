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
    return pd.read_csv(io.BytesIO(file_bytes))


def get_column_info(df: pd.DataFrame) -> dict:
    """Return column names and dtypes for frontend dropdowns."""
    cols = []
    for col in df.columns:
        dtype = str(df[col].dtype)
        n_unique = int(df[col].nunique())
        cols.append({"name": col, "dtype": dtype, "n_unique": n_unique})
    return {"columns": cols, "n_rows": len(df), "n_cols": len(df.columns)}


def build_pipeline(X_train: pd.DataFrame) -> Pipeline:
    """Build a sklearn preprocessing + logistic regression pipeline."""
    numeric_cols = X_train.select_dtypes(include=["number"]).columns.tolist()
    cat_cols = X_train.select_dtypes(exclude=["number"]).columns.tolist()

    numeric_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    categorical_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])

    transformers = []
    if numeric_cols:
        transformers.append(("num", numeric_transformer, numeric_cols))
    if cat_cols:
        transformers.append(("cat", categorical_transformer, cat_cols))

    preprocessor = ColumnTransformer(transformers=transformers)

    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", LogisticRegression(
            max_iter=500,
            random_state=42,
            solver="saga",
            n_jobs=1,
        )),
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
        X, y, sensitive, test_size=0.25, random_state=42, stratify=y
    )

    return X_train, X_test, y_train, y_test, s_train, s_test


def train_and_evaluate(df: pd.DataFrame, target_col: str, protected_attr: str) -> dict:
    """
    Full training and evaluation pipeline.
    Returns a dict with accuracy, y_pred, y_test, s_test, pipeline, X_test.
    """
    # Limit dataset to 3000 rows to stay within free tier memory
    if len(df) > 3000:
        df = df.sample(n=3000, random_state=42).reset_index(drop=True)

    X_train, X_test, y_train, y_test, s_train, s_test = prepare_data(
        df, target_col, protected_attr
    )

    pipeline = build_pipeline(X_train)
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    accuracy = float(accuracy_score(y_test, y_pred))

    # Free memory
    gc.collect()

    return {
        "pipeline": pipeline,
        "X_train": X_train,
        "X_test": X_test,
        "y_train": y_train,
        "y_test": y_test,
        "y_pred": y_pred,
        "s_train": s_train,
        "s_test": s_test,
        "accuracy": accuracy,
        "target_col": target_col,
        "protected_attr": protected_attr,
    }