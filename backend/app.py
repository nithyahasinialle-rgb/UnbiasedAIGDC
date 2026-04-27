import os
from flask import Flask
from flask_cors import CORS

from routes.upload import upload_bp
from routes.audit import audit_bp
from routes.mitigate import mitigate_bp
from routes.report import report_bp


def create_app():
    app = Flask(__name__)
    CORS(app)

    app.register_blueprint(upload_bp, url_prefix="/api")
    app.register_blueprint(audit_bp, url_prefix="/api")
    app.register_blueprint(mitigate_bp, url_prefix="/api")
    app.register_blueprint(report_bp, url_prefix="/api")

    @app.get("/")
    def root():
        return {"status": "alive"}

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    return app


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app = create_app()
    app.run(host="0.0.0.0", port=port)