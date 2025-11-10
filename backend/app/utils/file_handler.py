import os
import xml.etree.ElementTree as ET

UPLOAD_FOLDER = "instance/uploads"

def save_uploaded_file(file, filename):
    """Salva il file caricato e verifica se è XML valido"""
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    content = file.read()
    ET.fromstring(content)  # Verifica XML valido

    with open(filepath, "wb") as f:
        f.write(content)
    
    return filepath
