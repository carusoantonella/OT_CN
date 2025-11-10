# app/auth/utils.py
import os, functools, jwt
from flask import request, jsonify, g, current_app

# Usa la stessa secret dell'app; fallback se non presente
JWT_ALG = "HS256"
def _get_jwt_secret():
    """
    Recupera la SECRET_KEY dall'app se il context è attivo,
    altrimenti usa l'env var (fallback).
    """
    try:
        return current_app.config.get("SECRET_KEY")
    except Exception:
        # nessun app context: fallback ad env o default sicuro per dev
        return os.getenv("SECRET_KEY", "change-me")
    
def current_user():
    """Estrae user_id e role dal Bearer token e li espone in g."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, _get_jwt_secret(), algorithms=[JWT_ALG])
    except Exception:
        return None
    g.user_id = payload.get("user_id")
    g.role = payload.get("role", "client")
    return {"id": g.user_id, "role": g.role}

def require_roles(*allowed):
    def deco(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            # ✅ Preflight: **non** richiede token
            if request.method == "OPTIONS":
                return ("", 204)
            user = current_user()
            if not user:
                return jsonify({"error": "unauthorized"}), 401
            if allowed and user["role"] not in allowed:
                return jsonify({"error": "forbidden", "need_role": allowed}), 403
            return fn(*args, **kwargs)
        return wrapper
    return deco
