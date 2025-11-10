# app/threats/__init__.py

from flask import Blueprint

# Definisco il blueprint “threats”
threats_bp = Blueprint("threats", __name__)

# Importo il controller per registrare le route
from app.threats.controllers import *