def create_app():
    app = Flask(__name__)
    CORS(app, origins="*", supports_credentials=False)

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