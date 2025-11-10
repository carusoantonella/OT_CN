# app/applications/manager.py
from typing import List, Dict, Any, Optional
from sqlalchemy import text
import json

def _db():
    from app import db
    return db

def _normalize_role(role: str) -> str:
    if role is None:
        return "client"
    r = role.strip().lower()
    if r in ("local_admin", "local admin"):
        return "admin"
    return r

def _visibility_clause_for(role: str) -> str:
    """
    Filtri di visibilità basati sul RUOLO del CREATORE del progetto:
      - root   -> vede tutti
      - admin  -> vede progetti creati da ('admin','client','local_admin')
      - client -> vede solo progetti creati da 'client'
    """
    role = _normalize_role(role)
    if role == "root":
        return ""  # nessun filtro
    if role == "admin":
        # NB: includo anche 'local_admin' nel caso sia salvato così in Users.role
        return "AND LOWER(COALESCE(u.role,'')) IN ('admin','client','local_admin')"
    # client
    return "AND LOWER(COALESCE(u.role,'')) = 'client'"

def _order_clause(order: Optional[str]) -> str:
    if order == "name":
        return "ORDER BY nome_progetto COLLATE NOCASE ASC"
    # default: più recenti
    return "ORDER BY datetime(p.created_at) DESC"

def list_applications_for_role(user_id: int, role: str, q: Optional[str], order: Optional[str],
                               limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """
    Restituisce progetti da SM_Anagrafica_progetto uniti al ruolo del creatore (Users.role).
    Mappa i campi al payload già usato dal frontend:
      id -> id
      nome_progetto -> name
      descrizione -> description
      created_at -> created_at
      Users.role(normalizzato) -> created_by_role
      id_utente -> owner_id
    """
    db = _db()
    where_visibility = _visibility_clause_for(role)

    base = f"""
    SELECT
        p.id,
        p.nome_progetto,
        p.descrizione,
        p.upload_file,
        p.id_utente,
        p.id_analisi,
        p.created_at,
        p.referente,
        p.id_progetto,
        p.id_progetto_utente,
        LOWER(COALESCE(u.role,'')) AS creator_role_raw,

        /* ✅ Conteggi robusti con sotto-query correlate */
        COALESCE((SELECT COUNT(*) FROM SM_CVE    c WHERE c.project_id = p.id), 0)  AS cve_count,
        COALESCE((SELECT COUNT(*) FROM SM_Threat t WHERE t.project_id = p.id), 0)  AS threat_count

    FROM SM_Anagrafica_progetto p
    LEFT JOIN Users u ON u.id = p.id_utente
    WHERE 1=1
    {where_visibility}
    """

    params = {"limit": limit, "offset": offset}
    if q:
        base += " AND (p.nome_progetto LIKE :q OR p.descrizione LIKE :q)"
        params["q"] = f"%{q}%"

    base += " " + _order_clause(order)
    base += " LIMIT :limit OFFSET :offset"

    rows = db.session.execute(text(base), params).mappings().all()
    result = []
    for r in rows:
        created_by_role = _normalize_role(r["creator_role_raw"])
        result.append({
            "id": r["id"],
            "name": r["nome_progetto"],
            "description": r["descrizione"],
            "created_at": r["created_at"],
            "created_by_role": created_by_role,  # alias per il frontend
            "owner_id": r["id_utente"],
            "upload_file": r["upload_file"],
            "id_analisi": r["id_analisi"],
            "referente": r["referente"],
            "id_progetto": r["id_progetto"],
            "id_progetto_utente": r["id_progetto_utente"],
            "cve_count": int(r["cve_count"] or 0),
            "threat_count": int(r["threat_count"] or 0),
        })
    return result

def count_applications_for_role(user_id: int, role: str, q: Optional[str]) -> int:
    db = _db()
    where_visibility = _visibility_clause_for(role)
    base = f"""
      SELECT COUNT(*) AS c
      FROM SM_Anagrafica_progetto p
      LEFT JOIN Users u ON u.id = p.id_utente
      WHERE 1=1
      {where_visibility}
    """
    params = {}
    if q:
        base += " AND (p.nome_progetto LIKE :q OR p.descrizione LIKE :q)"
        params["q"] = f"%{q}%"

    row = db.session.execute(text(base), params).mappings().first()
    return int(row["c"]) if row else 0

def create_application(name: str, description: Optional[str], owner_id: int) -> int:
    """
    Inserisce un nuovo progetto.
    NOTA: il ruolo del creatore non si salva nella tabella progetti (lo ricaviamo via JOIN su Users).
    """
    db = _db()
    sql = text("""
        INSERT INTO SM_Anagrafica_progetto (nome_progetto, descrizione, id_utente)
        VALUES (:name, :description, :owner_id)
    """)
    db.session.execute(sql, {
        "name": name.strip(),
        "description": (description or "").strip(),
        "owner_id": owner_id,
    })
    db.session.commit()
    row = db.session.execute(text("SELECT last_insert_rowid() AS id")).mappings().first()
    return int(row["id"])

def get_application(app_id: int) -> Optional[Dict[str, Any]]:
    db = _db()
    row = db.session.execute(text("""
    SELECT
        p.id,
        p.nome_progetto,
        p.descrizione,
        p.upload_file,
        p.id_utente,
        p.id_analisi,
        p.created_at,
        p.referente,
        p.id_progetto,
        p.id_progetto_utente,
        LOWER(COALESCE(u.role,'')) AS creator_role_raw,

        COALESCE((SELECT COUNT(*) FROM SM_CVE    c WHERE c.project_id = p.id), 0)  AS cve_count,
        COALESCE((SELECT COUNT(*) FROM SM_Threat t WHERE t.project_id = p.id), 0)  AS threat_count

    FROM SM_Anagrafica_progetto p
    LEFT JOIN Users u ON u.id = p.id_utente
    WHERE p.id = :id
    """), {"id": app_id}).mappings().first()
    if not row:
        return None
    return {
        "id": row["id"],
        "name": row["nome_progetto"],
        "description": row["descrizione"],
        "created_at": row["created_at"],
        "created_by_role": _normalize_role(row["creator_role_raw"]),
        "owner_id": row["id_utente"],
        "upload_file": row["upload_file"],
        "id_analisi": row["id_analisi"],
        "referente": row["referente"],
        "id_progetto": row["id_progetto"],
        "id_progetto_utente": row["id_progetto_utente"],
        "cve_count": int(row["cve_count"] or 0),
        "threat_count": int(row["threat_count"] or 0),
    }

# ─────────────────────────────────────────────────────────────────────────────
#  Dati dettagliati per AnalysisfromApp (SM_Nodes / SM_Edge / SM_Threat / SM_CVE)
# ─────────────────────────────────────────────────────────────────────────────

def list_nodes_by_project(project_id: int) -> List[Dict[str, Any]]:
    """Ritorna i nodi del progetto da SM_Nodes, normalizzando 'security_props' in 'metadata'."""
    db = _db()
    rows = db.session.execute(text("""
        SELECT node_id_xml, label, nature, security_props
          FROM SM_Nodes
         WHERE project_id = :pid
    """), {"pid": project_id}).mappings().all()
    out: List[Dict[str, Any]] = []
    for r in rows:
        try:
            meta = json.loads(r.get("security_props") or "{}")
        except Exception:
            meta = {}
        out.append({
            "id_xml": r["node_id_xml"],
            "label": r["label"],
            "nature": r.get("nature"),
            "metadata": meta
        })
    return out


def list_edges_by_project(project_id: int) -> List[Dict[str, Any]]:
    """Ritorna gli edge da SM_Edge con label sorgente/target (join su SM_Nodes)."""
    db = _db()
    rows = db.session.execute(text("""
        SELECT e.id,
               e.edge_source_xml AS source_node_id_xml,
               e.edge_target_xml AS target_node_id_xml,
               ns.label AS source_label,
               nt.label AS target_label
          FROM SM_Edge e
          LEFT JOIN SM_Nodes ns ON ns.project_id = e.project_id AND ns.node_id_xml = e.edge_source_xml
          LEFT JOIN SM_Nodes nt ON nt.project_id = e.project_id AND nt.node_id_xml = e.edge_target_xml
         WHERE e.project_id = :pid
    """), {"pid": project_id}).mappings().all()
    return [dict(r) for r in rows]


def list_threats_by_project(project_id: int) -> List[Dict[str, Any]]:
    """Ritorna le minacce da SM_Threat già normalizzate per il FE."""
    db = _db()
    rows = db.session.execute(text("""
        SELECT id, rule_id, threat_id, title, severity, description, mitigation,
               edge_source_label, edge_target_label,
               NULL AS category_name
          FROM SM_Threat
         WHERE project_id = :pid
         ORDER BY
           CASE UPPER(COALESCE(severity,'')) 
             WHEN 'CRITICAL' THEN 5
             WHEN 'HIGH' THEN 4
             WHEN 'MEDIUM' THEN 3
             WHEN 'LOW' THEN 2
             ELSE 1
           END DESC, id DESC
    """), {"pid": project_id}).mappings().all()
    out: List[Dict[str, Any]] = []
    for r in rows:
        out.append({
            "id": r["id"],
            "rule_id": r["rule_id"],
            "threat_id": r["threat_id"],
            "threat_name": r["title"],
            "severity": r["severity"],
            "description": r["description"],
            "mitigation": r.get("mitigation"),
            "edge_source_label": r.get("edge_source_label"),
            "edge_target_label": r.get("edge_target_label"),
            "category_name": r.get("category_name"),
        })
    return out


def list_cves_by_project(project_id: int) -> List[Dict[str, Any]]:
    """Ritorna le CVE per nodo da SM_CVE (se presenti in tabella dedicata)."""
    db = _db()
    rows = db.session.execute(text("""
        SELECT node_id_xml, cve_id, cvss_score, severity, summary,
               published_date AS published,
               NULL AS url
          FROM SM_CVE
         WHERE project_id = :pid
    """), {"pid": project_id}).mappings().all()
    out: List[Dict[str, Any]] = []
    for r in rows:
        out.append({
            "node_id_xml": r["node_id_xml"],
            "id": r["cve_id"],
            "score": r["cvss_score"],
            "severity": r["severity"],
            "title": r["summary"],
            "published": r.get("published"),
            "url": r.get("url"),
        })
    return out
