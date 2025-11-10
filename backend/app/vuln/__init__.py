# app/vuln/__init__.py

from flask import Blueprint

# Definisco il blueprint vuln
vuln_bp = Blueprint("vuln", __name__)

# Importo il controller per registrare le route
from app.vuln.controller import *