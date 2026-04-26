# main.py – Firebase Functions entry point
from firebase_functions import https_fn
from app import create_app

flask_app = create_app()

@https_fn.on_request(
    memory=https_fn.MemoryOption.GB_1,
    timeout_sec=300,
)
def api(req: https_fn.Request) -> https_fn.Response:
    # This handles the Flask app routing automatically
    return https_fn.handle_wsgi(flask_app, req)
