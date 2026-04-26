"""
routes/upload.py – POST /api/upload
Accept a CSV file, parse column info, store to disk.
"""

import uuid
import io
import os
import logging
from flask import Blueprint, request, jsonify
import pandas as pd

from ml.pipeline import get_column_info

logger = logging.getLogger(__name__)
upload_bp = Blueprint("upload", __name__)

UPLOAD_DIR = "/tmp/unbiased_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_file_bytes(file_id: str) -> bytes | None:
    path = os.path.join(UPLOAD_DIR, f"{file_id}.csv")
    if not os.path.exists(path):
        return None
    with open(path, "rb") as f:
        return f.read()


@upload_bp.post("/upload")
def upload_csv():
    if "file" not in request.files:
        return jsonify({"error": "No file part in request"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "No file selected"}), 400

    if not file.filename.lower().endswith(".csv"):
        return jsonify({"error": "Only CSV files are supported"}), 400

    file_bytes = file.read()
    if len(file_bytes) == 0:
        return jsonify({"error": "Uploaded file is empty"}), 400

    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as exc:
        return jsonify({"error": f"Failed to parse CSV: {exc}"}), 422

    file_id = str(uuid.uuid4())

    # Save to disk instead of memory
    path = os.path.join(UPLOAD_DIR, f"{file_id}.csv")
    with open(path, "wb") as f:
        f.write(file_bytes)

    col_info = get_column_info(df)

    return jsonify({
        "file_id": file_id,
        "filename": file.filename,
        **col_info,
    })