import datetime
import jwt
from flask import current_app
import bcrypt
from sqlalchemy import text

import bcrypt  # Importa la libreria bcrypt
def authenticate_user(email, password):
    from app import db  # usa la sessione già configurata

    # 1) Carica l'utente (inclusi ruolo e stato)
    row = db.session.execute(
        text("""
            SELECT id, email, username, password_hash, role, active
            FROM Users
            WHERE email = :email
        """),
        {"email": email}
    ).mappings().first()

    if not row or not row.get("active"):
        return None, "Invalid credentials"

    # 2) Verifica password (bcrypt)
    stored_hash = row["password_hash"]
    if not bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8")):
        return None, "Invalid credentials"

    # 3) Genera JWT includendo anche il ruolo
    now = datetime.datetime.utcnow()
    payload = {
        "user_id": row["id"],
        "email": row["email"],
        "role": row.get("role") or "client",
        "iat": now,
        "exp": now + datetime.timedelta(hours=1),
    }
    token = jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")

    return token, None