from flask import request, jsonify
from .manager import authenticate_user
from . import auth_bp  # Importa il Blueprint definito in __init__.py

@auth_bp.route("/login", methods=['POST', 'OPTIONS'])
def login():
    if request.method == "OPTIONS":
        # Risponde correttamente alla richiesta OPTIONS per il supporto CORS
        return '', 200

    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    token, error = authenticate_user(email, password)
    if error:
        return jsonify({'error': error}), 401

    return jsonify({'token': token})
