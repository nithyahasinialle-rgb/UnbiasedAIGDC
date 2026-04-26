"""
firebase_client.py – Firebase Admin SDK helpers (Firestore + Storage)
Falls back gracefully if credentials are not configured.
"""

import os
import json
import logging

logger = logging.getLogger(__name__)

_db = None
_bucket = None
_initialized = False


def _init():
    global _db, _bucket, _initialized
    if _initialized:
        return

    project_id = os.getenv("FIREBASE_PROJECT_ID")
    storage_bucket = os.getenv("FIREBASE_STORAGE_BUCKET")
    cred_json = os.getenv("FIREBASE_CREDENTIALS_JSON")

    if not cred_json:
        logger.warning("Firebase credentials not found – running in local (in-memory) mode.")
        _initialized = True
        return

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore, storage

        if not firebase_admin._apps:
            cred_dict = json.loads(cred_json)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred, {
                "storageBucket": storage_bucket,
                "projectId": project_id,
            })
        _db = firestore.client()
        _bucket = storage.bucket()
        logger.info("Firebase initialized successfully.")
    except Exception as exc:
        logger.error(f"Firebase init failed: {exc}")

    _initialized = True


def save_audit(job_id: str, data: dict):
    _init()
    if _db is None:
        return
    try:
        _db.collection("audits").document(job_id).set(data)
    except Exception as exc:
        logger.error(f"Firestore save_audit error: {exc}")


def get_audit(job_id: str) -> dict | None:
    _init()
    if _db is None:
        return None
    try:
        doc = _db.collection("audits").document(job_id).get()
        return doc.to_dict() if doc.exists else None
    except Exception as exc:
        logger.error(f"Firestore get_audit error: {exc}")
        return None


def upload_csv(file_id: str, file_bytes: bytes, filename: str) -> str | None:
    _init()
    if _bucket is None:
        return None
    try:
        blob = _bucket.blob(f"uploads/{file_id}/{filename}")
        blob.upload_from_string(file_bytes, content_type="text/csv")
        blob.make_public()
        return blob.public_url
    except Exception as exc:
        logger.error(f"Storage upload error: {exc}")
        return None