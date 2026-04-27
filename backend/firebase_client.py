"""
firebase_client.py – Firebase Admin SDK helpers
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

    cred_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
    project_id = os.getenv("FIREBASE_PROJECT_ID")
    storage_bucket = os.getenv("FIREBASE_STORAGE_BUCKET")

    if not cred_json:
        logger.warning("Firebase credentials not found – running local mode.")
        _initialized = True
        return

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore, storage

        # Handle escaped JSON safely
        try:
            cred_dict = json.loads(cred_json)
        except Exception:
            cred_dict = json.loads(cred_json.replace('\\"', '"'))

        # Fix private key formatting
        if "private_key" in cred_dict:
            cred_dict["private_key"] = cred_dict["private_key"].replace("\\n", "\n")

        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred, {
                "projectId": project_id,
                "storageBucket": storage_bucket,
            })

        _db = firestore.client()
        _bucket = storage.bucket()

        logger.info("✅ Firebase initialized successfully")
        logger.info(f"DB: {_db}")

    except Exception as exc:
        logger.error(f"🔥 Firebase init failed: {exc}")
        _db = None
        _bucket = None

    _initialized = True


def save_audit(job_id: str, data: dict):
    _init()
    if _db is None:
        return
    _db.collection("audits").document(job_id).set(data)


def get_audit(job_id: str):
    _init()
    if _db is None:
        return None
    doc = _db.collection("audits").document(job_id).get()
    return doc.to_dict() if doc.exists else None


def upload_csv(file_id: str, file_bytes: bytes, filename: str):
    _init()
    if _bucket is None:
        return None

    blob = _bucket.blob(f"uploads/{file_id}/{filename}")
    blob.upload_from_string(file_bytes, content_type="text/csv")
    blob.make_public()
    return blob.public_url