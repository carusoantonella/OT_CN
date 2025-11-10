from flask import Blueprint, request, jsonify
import uuid
import os
import xml.etree.ElementTree as ET
from app.utils.file_handler import save_uploaded_file
from app.upload import upload_bp
from app.storage import analyses


@upload_bp.route("/", methods=["POST"], strict_slashes=False)
def upload_file():
    """Carica un file Draw.io (XML)"""
    if "file" not in request.files:
        return jsonify({"error": "Nessun file ricevuto"}), 400

    file = request.files["file"]
    if not file.filename.endswith(".xml"):
        return jsonify({"error": "Il file deve avere estensione .xml"}), 400

    analysis_id = str(uuid.uuid4())
    saved_filename = f"{analysis_id}.xml"

    try:
        saved_filepath = save_uploaded_file(file, saved_filename)
    except ET.ParseError:
        return jsonify({"error": "XML non valido"}), 400

    analyses[analysis_id] = {
        "filename": file.filename,
        "filepath": saved_filepath,
        "analysis_result": None
    }

    return jsonify({"analysis_id": analysis_id, "filename": file.filename})
