# app/newproject/controllers.py
import os, uuid
from flask import request, jsonify, current_app
from . import newproject_bp
from .manager import insert_project, insert_threats, insert_cves, insert_nodes, insert_edges
from app.auth.utils import current_user, require_roles

@newproject_bp.route("", methods=["POST", "OPTIONS"])
@require_roles("root", "admin", "client")
def new_project():
    user = current_user()
    if not user:
        return jsonify({"error":"unauthorized"}), 401
    if request.method == "OPTIONS":
        return ("", 204)

    data = request.get_json(silent=True) or {}

    nome_progetto = data.get("nome_progetto") or data.get("nome")
    if not nome_progetto:
        return jsonify({"error": "nome_progetto obbligatorio"}), 400

    descrizione = data.get("descrizione") or ""
    id_progetto = data.get("id_progetto")  # ID inserito dall’utente
    referente   = data.get("referente") or data.get("referent")
    xml_text    = data.get("xml_text")

    # id_utente: prendi dal body se c'è, altrimenti fallback di config
    user_id = int(user["id"])

    # salva XML su disco (path relativo)
    upload_file_relpath = None
    if xml_text:
        uploads_dir = os.path.join(current_app.instance_path, "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        safe_stub = (str(id_progetto).strip() if id_progetto else str(uuid.uuid4()))
        filename = f"diagram_{safe_stub}.xml"
        abs_path = os.path.join(uploads_dir, filename)
        with open(abs_path, "w", encoding="utf-8") as f:
            f.write(xml_text)
        upload_file_relpath = os.path.join("backend", "instance", "uploads", filename)

    # insert progetto
    project_id = insert_project(
        nome_progetto=nome_progetto,
        descrizione=descrizione,
        upload_file_relpath=upload_file_relpath,
        id_progetto=id_progetto,
        referente=referente,
        id_utente=user_id,
    )

    # opzionale: se arrivano anche threats/cves già qui, li salvo subito
    threats = data.get("threats") or []
    cves    = data.get("cves") or []
    if threats or cves:
        insert_threats(project_id, threats)
        insert_cves(project_id, cves)

    return jsonify({
        "message": "Project inserted",
        "project_id": project_id,
        "upload_file": upload_file_relpath,
    }), 201


@newproject_bp.route("/<int:project_id>/analysis", methods=["POST", "OPTIONS"])
@require_roles("root", "admin", "client")
def save_analysis_for_project(project_id: int):
    if request.method == "OPTIONS":
        return ("", 204)

    data = request.get_json(silent=True) or {}
    threats = data.get("threats") or []
    cves    = data.get("cves") or []

    # ⬇️ NUOVO: prendi i nodi dal body (accetti sia 'node_catalog' che 'nodes')
    node_catalog = data.get("node_catalog") or data.get("nodes") or []

    try:
        # ⬇️ NUOVO: salva/aggiorna SM_Nodes
        n_nodes   = insert_nodes(project_id, node_catalog)

        n_threats = insert_threats(project_id, threats)
        n_cves    = insert_cves(project_id, cves)

        return jsonify({
            "project_id": project_id,
            "nodes_saved": n_nodes,
            "threats_saved": n_threats,
            "cves_saved": n_cves
        }), 201
    except Exception as e:
        current_app.logger.exception("Errore salvataggio analisi")
        return jsonify({"error": "DB error", "detail": str(e)}), 500
    
@newproject_bp.route("/<int:project_id>/nodes", methods=["POST", "OPTIONS"])
@require_roles("root", "admin", "client")
def save_nodes_for_project(project_id: int):
    if request.method == "OPTIONS":
        return ("", 204)

    data = request.get_json(silent=True) or {}
    # accetta sia "node_catalog" sia "nodes"
    node_catalog = data.get("node_catalog") or data.get("nodes") or []

    try:
        n_nodes = insert_nodes(project_id, node_catalog)
        return jsonify({
            "project_id": project_id,
            "nodes_saved": n_nodes
        }), 201
    except Exception as e:
        current_app.logger.exception("Errore salvataggio nodi")
        return jsonify({"error": "DB error", "detail": str(e)}), 500
    

@newproject_bp.route("/<int:project_id>/edges", methods=["POST", "OPTIONS"])
def save_edges_for_project(project_id: int):
    if request.method == "OPTIONS":
        return ("", 204)

    data = request.get_json(silent=True) or {}
    edge_catalog = data.get("edge_catalog") or data.get("edges") or []

    try:
        n_edges = insert_edges(project_id, edge_catalog)
        return jsonify({
            "project_id": project_id,
            "edges_saved": n_edges
        }), 201
    except Exception as e:
        current_app.logger.exception("Errore salvataggio edges")
        return jsonify({"error": "DB error", "detail": str(e)}), 500
    
