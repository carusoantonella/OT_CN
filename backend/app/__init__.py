# app/__init__.py
import os
from flask import Flask
from flask_cors import CORS
from config import get_config
from flask_sqlalchemy import SQLAlchemy

from app.upload import upload_bp
from app.auth import auth_bp
from app.newproject import newproject_bp
from app.vuln import vuln_bp
from app.threatdb import threatdb_bp

from app.applications import applications_bp

# → import del nuovo blueprint threats
from app.threats import threats_bp

db = SQLAlchemy()

def create_app(config_name="development"):
    app = Flask(__name__)
    # carica la config (da file / oggetto)
    app.config.from_object(get_config(config_name))

    # --- OVERRIDE from environment (important for exe builds) ---
    # Se l'URI è stata impostata dall'esterno (backend/app.py) la usiamo e la logghiamo.
    env_uri = os.environ.get("SQLALCHEMY_DATABASE_URI") or os.environ.get("DATABASE_URL")
    if env_uri:
        app.config["SQLALCHEMY_DATABASE_URI"] = env_uri
        print("[TAT] OVERRIDE app.config SQLALCHEMY_DATABASE_URI with env ->", env_uri)
    else:
        print("[TAT] No env SQLALCHEMY_DATABASE_URI found; using configured ->", app.config.get("SQLALCHEMY_DATABASE_URI"))

    # CORS
    CORS(
        app,
        resources={r"/*": {"origins": "*"}},
        supports_credentials=False,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    # Inizializza SQLAlchemy con l'app (dopo che abbiamo forzato l'override)
    db.init_app(app)

    # --- Print diagnostici sull'engine DB se possibile ---
    try:
        # usa il context per eventuali operazioni che leggono config/db
        with app.app_context():
            try:
                # preferisci db.get_engine (flask-sqlalchemy recenti)
                engine = db.get_engine(app)
            except Exception:
                # fallback
                engine = getattr(db, "engine", None)
            try:
                engine_url = str(engine.url) if engine is not None else "<no-engine-yet>"
            except Exception as e:
                engine_url = f"<could-not-read-engine-url: {e}>"
            print("[TAT] SQLAlchemy engine URL at init:", engine_url)

            if engine_url.startswith("sqlite:///"):
                dbpath = engine_url.replace("sqlite:///", "")
                try:
                    exists = os.path.exists(dbpath)
                    writable = os.access(dbpath, os.W_OK) if exists else False
                    print(f"[TAT] At init: DB path: {dbpath} exists: {exists} writable: {writable}")
                except Exception as e:
                    print("[TAT] At init: DB path check error:", e)
    except Exception as e:
        print("[TAT] Warning printing DB engine info failed:", e)

    # Creazione della cartella uploads se non esiste
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    # Registrazione dei blueprint
    app.register_blueprint(upload_bp, url_prefix="/upload")
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(newproject_bp, url_prefix="/newproject")

    # ───────── Registrazione del blueprint “threats” ─────────
    app.register_blueprint(threats_bp, url_prefix="/threats")

    # Registrazione del blueprint per individuare vulnerabilità
    app.register_blueprint(vuln_bp, url_prefix="/vuln")

    app.register_blueprint(threatdb_bp, url_prefix="/threatdb")
    app.register_blueprint(applications_bp, url_prefix="/applications")

    print("=== URL MAP ===")
    for r in app.url_map.iter_rules():
        print(r)
    print("=== /URL MAP ===")
    return app
