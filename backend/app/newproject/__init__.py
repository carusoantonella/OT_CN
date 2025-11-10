from flask import Blueprint

newproject_bp = Blueprint("newproject", __name__)

# Import dei controller per registrare le route
from app.newproject import controllers
