from flask import Blueprint

upload_bp = Blueprint("upload", __name__)

# Import dei controller per registrare le route
from app.upload import controllers
