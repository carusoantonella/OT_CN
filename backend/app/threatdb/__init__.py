# app/threatdb/__init__.py
from flask import Blueprint

# Nome coerente con gli altri blueprint (*_bp)
threatdb_bp = Blueprint("threatdb", __name__)

# Importa i controller per registrare le route
from app.threatdb.controllers import *  # noqa
