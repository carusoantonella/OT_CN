# app/applications/controllers.py
from flask import request, jsonify
from . import applications_bp
from .manager import (
    list_applications_for_role,
    count_applications_for_role,
    create_application,
    get_application,
    list_nodes_by_project,
    list_edges_by_project,
    list_threats_by_project,
    list_cves_by_project,
)
from app.auth.utils import current_user, require_roles

@applications_bp.route("", methods=["GET", "OPTIONS"])
@require_roles("root", "admin", "local_admin", "client")
def list_apps():
    if request.method == "OPTIONS":
        return ("", 204)
    user = current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401

    q = request.args.get("q")
    order = request.args.get("order")  # "name" | "created_at"
    try:
        limit = min(int(request.args.get("limit", 30)), 100)
    except:
        limit = 30
    try:
        offset = max(int(request.args.get("offset", 0)), 0)
    except:
        offset = 0

    items = list_applications_for_role(user["id"], user["role"], q, order, limit, offset)
    total = count_applications_for_role(user["id"], user["role"], q)
    return jsonify({"items": items, "total": total, "limit": limit, "offset": offset})

@applications_bp.route("", methods=["POST", "OPTIONS"])
@require_roles("root", "admin", "local_admin", "client")
def create_app():
    if request.method == "OPTIONS":
        return ("", 204)
    user = current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401

    data = request.get_json() or {}
    name = (data.get("name") or data.get("nome_progetto") or "").strip()
    description = (data.get("description") or data.get("descrizione") or "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400

    new_id = create_application(name, description, owner_id=int(user["id"]))
    app_obj = get_application(new_id)
    return jsonify(app_obj), 201

@applications_bp.route("/<int:app_id>", methods=["GET", "OPTIONS"])
@require_roles("root", "admin", "local_admin", "client")
def get_app(app_id):
    if request.method == "OPTIONS":
        return ("", 204)
    user = current_user()
    if not user:
        return jsonify({"error":"unauthorized"}), 401

    obj = get_application(app_id)
    if not obj:
        return jsonify({"error":"not_found"}), 404

    # Enforcement visibilità “come lista”
    role = (user["role"] or "").lower()
    creator = (obj.get("created_by_role") or "").lower()
    if role == "root":
        pass
    elif role in ("admin","local_admin"):
        if creator not in ("admin","client","local_admin"):
            return jsonify({"error":"forbidden"}), 403
    else:  # client
        if creator != "client":
            return jsonify({"error":"forbidden"}), 403

        include_str = (request.args.get("include") or "").replace(" ", "")
    include = set([p for p in include_str.split(",") if p])

    if "nodes" in include:
        obj["nodes"] = list_nodes_by_project(app_id)
    if "edges" in include:
        obj["edges"] = list_edges_by_project(app_id)
    if "threats" in include:
        obj["threats"] = list_threats_by_project(app_id)
    if "cves" in include:
        obj["cves"] = list_cves_by_project(app_id)

    return jsonify(obj)
