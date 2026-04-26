"""
app.py – Flask application entry point
"""

import os
import logging
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

if os.path.exists(".env"):
    load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

from routes.upload import upload_bp
from routes.audit import audit_bp
from routes.mitigate import mitigate_bp
from routes.report import report_bp


def create_app():
    app = Flask(__name__)
    CORS(app, origins="*", supports_credentials=False)
    app.register_blueprint(upload_bp, url_prefix="/api")
    app.register_blueprint(audit_bp, url_prefix="/api")
    app.register_blueprint(mitigate_bp, url_prefix="/api")
    app.register_blueprint(report_bp, url_prefix="/api")

    @app.get("/api/health")
    def health():
        return {"status": "ok", "version": "1.0.0"}

    return app


if __name__ == "__main__":
    port = int(os.getenv("PORT", 10000))
    app = create_app()
    app.run(host="0.0.0.0", port=port, debug=True, use_reloader=False)