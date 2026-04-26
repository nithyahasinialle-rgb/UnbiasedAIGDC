"""
routes/upload.py – POST /api/upload
Accept a CSV file, parse column info, store temporarily in memory.
"""

import uuid
import io
import logging
from flask import Blueprint, request, jsonify
import pandas as pd

from ml.pipeline import get_column_info

logger = logging.getLogger(__name__)
upload_bp = Blueprint("upload", __name__)

# In-memory storage: file_id -> bytes
_file_store: dict[str, bytes] = {}


def get_file_bytes(file_id: str) -> bytes | None:
    return _file_store.get(file_id)


@upload_bp.post("/upload")
def upload_csv():
    """
    Accepts multipart/form-data with a 'file' field (CSV).
    Returns: { file_id, columns, n_rows, n_cols }
    """
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
    _file_store[file_id] = file_bytes

    col_info = get_column_info(df)

    return jsonify({
        "file_id": file_id,
        "filename": file.filename,
        **col_info,
    })
