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


def associate_user_to_audit(job_id: str, user_id: str):
    _init()
    if _db is None:
        return
    try:
        doc_ref = _db.collection("audits").document(job_id)
        doc_ref.set({"user_id": user_id}, merge=True)
        logger.info(f"Associated job {job_id} with user {user_id}")
    except Exception as e:
        logger.error(f"Error associating user to audit {job_id}: {e}")


def get_user_audits(user_id: str) -> list:
    _init()
    if _db is None:
        return []
    try:
        docs = _db.collection("audits").where("user_id", "==", user_id).stream()
        audits = []
        for doc in docs:
            audits.append(doc.to_dict())
        # Sort in memory by timestamp descending
        audits.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return audits
    except Exception as e:
        logger.error(f"Error getting audits for user {user_id}: {e}")
        return []


def upload_model_artifact(job_id: str, model_name: str, pipeline_bytes: bytes) -> str | None:
    _init()
    if _bucket is None:
        return None
    try:
        blob = _bucket.blob(f"models/{job_id}/{model_name}.pkl")
        blob.upload_from_string(pipeline_bytes, content_type="application/octet-stream")
        return blob.name
    except Exception as e:
        logger.error(f"Error uploading model artifact {model_name} for job {job_id}: {e}")
        return None


def get_model_artifact(job_id: str, model_name: str) -> bytes | None:
    _init()
    if _bucket is None:
        return None
    try:
        blob = _bucket.blob(f"models/{job_id}/{model_name}.pkl")
        if blob.exists():
            return blob.download_as_bytes()
        return None
    except Exception as e:
        logger.error(f"Error downloading model artifact {model_name} for job {job_id}: {e}")
        return None


def upload_job_csv(job_id: str, file_bytes: bytes) -> str | None:
    _init()
    if _bucket is None:
        return None
    try:
        blob = _bucket.blob(f"csv/{job_id}/dataset.csv")
        blob.upload_from_string(file_bytes, content_type="text/csv")
        return blob.name
    except Exception as e:
        logger.error(f"Error uploading job CSV for job {job_id}: {e}")
        return None


def download_job_csv(job_id: str) -> bytes | None:
    _init()
    if _bucket is None:
        return None
    try:
        blob = _bucket.blob(f"csv/{job_id}/dataset.csv")
        if blob.exists():
            return blob.download_as_bytes()
        return None
    except Exception as e:
        logger.error(f"Error downloading job CSV for job {job_id}: {e}")
        return None