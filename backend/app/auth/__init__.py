from flask import Blueprint

# Definizione del Blueprint per il modulo di autenticazione
auth_bp = Blueprint('auth', __name__)

# Importa i controller che aggiungono le route a questo blueprint
from . import controllers
