# app/newproject/manager.py
from typing import List, Dict, Any
from flask import current_app
from sqlalchemy import text
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _get_db():
    # import locale per evitare cicli di import
    from app import db
    return db

# ---------- Helper ----------

def _pragma_columns(table_name: str) -> List[str]:
    """Ritorna l'elenco dei nomi colonna esistenti per la tabella (SQLite PRAGMA)."""
    db = _get_db()
    # NB: il nome tabella è costante nel nostro codice, non arriva da input utente
    rows = db.session.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
    return [r[1] for r in rows]  # (cid, name, type, notnull, dflt_value, pk)

def _insert_dynamic(table: str, values: Dict[str, Any]) -> None:
    """
    Insert in tabella includendo SOLO le colonne realmente esistenti,
    così non esplode se la tabella non ha alcuni campi opzionali.
    """
    if not values:
        return
    db = _get_db()
    cols = _pragma_columns(table)
    valid_cols = [c for c in values.keys() if c in cols]
    if not valid_cols:
        return

    placeholders = ", ".join(f":{c}" for c in valid_cols)
    columns = ", ".join(valid_cols)
    sql = text(f"INSERT INTO {table} ({columns}) VALUES ({placeholders})")
    db.session.execute(sql, {k: values.get(k) for k in valid_cols})

def _get_last_insert_id() -> int:
    db = _get_db()
    return db.session.execute(text("SELECT last_insert_rowid()")).scalar() or 0

def _get_generic_node_id_from_key(key: str) -> str:
    """
    Prova a ricavare l'ID (numeric) di GenericNode a partire da un 'key' (name).
    Ritorna stringa; fallback 'generic' per rispettare NOT NULL su SM_Nodes.generic_node_id (TEXT).
    """
    db = _get_db()
    if not key:
        return "generic"
    row = db.session.execute(
        text("SELECT id FROM GenericNode WHERE lower(name)=lower(:k) LIMIT 1"),
        {"k": key.strip()},
    ).fetchone()
    if row and row[0] is not None:
        return str(row[0])
    return "generic"

# ---------- API usate dai controller ----------

def insert_project(
    *,
    nome_progetto: str,
    descrizione: str = "",
    upload_file_relpath: str | None = None,
    id_progetto: str | None = None,
    referente: str | None = None,
    id_utente: int | None = None,
) -> int:
    """
    Inserisce in SM_Anagrafica_progetto.
    Colonne attese: (nome_progetto, descrizione, upload_file, id_progetto, referente, id_utente)
    """
    db = _get_db()
    try:
        _insert_dynamic(
            "SM_Anagrafica_progetto",
            {
                "nome_progetto": nome_progetto,
                "descrizione": descrizione,
                "upload_file": upload_file_relpath,
                "id_progetto": id_progetto,
                "referente": referente,
                "id_utente": id_utente,
            },
        )
        db.session.commit()
        return _get_last_insert_id()
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Errore inserimento progetto")
        raise

def insert_threats(project_id: int, threats: List[Dict[str, Any]]) -> int:
    """
    Inserisce le minacce in SM_Threat.
    Colonne comuni supportate: project_id, rule_id, threat_id, title, severity, description,
    mitigation, edge_source_label, edge_target_label (se esistono in tabella).
    """
    logger.info("insert_threats: pid=%s n_threats=%d", project_id, len(threats))
    
    if not threats:
        return 0

    db = _get_db()
    count = 0
    try:
        for t in threats:
            rule_id  = t.get("rule_id") or t.get("ruleId")
            threat_id = t.get("threat_id") or t.get("threatId")
            title    = (
                t.get("title")
                or t.get("threat_name")
                or (f"Rule {rule_id}" if rule_id else "Threat")
            )
            severity = t.get("severity")
            description = t.get("description") or t.get("reason")
            mitigation  = t.get("mitigation") or t.get("possible_mitigation")

            # opzionali (se le colonne esistono in DB verranno salvati)
            edge_source_label = t.get("edge_source_label")
            edge_target_label = t.get("edge_target_label")

            row = {
                "project_id": project_id,
                "rule_id": rule_id,
                "threat_id": threat_id,
                "title": title,
                "severity": severity,
                "description": description,
                "mitigation": mitigation,
                "edge_source_label": edge_source_label,
                "edge_target_label": edge_target_label,
            }
            _insert_dynamic("SM_Threat", row)
            count += 1

        db.session.commit()
        return count
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Errore inserimento threats")
        raise

def insert_cves(project_id: int, cves: List[Dict[str, Any]]) -> int:
    """
    Inserisce le CVE in SM_CVE.
    Campi gestiti: project_id, node_id_xml, cve_id, cvss_score, severity, summary, published.
    (generic_node_id è stato rimosso da SM_CVE come da tue indicazioni)
    """
    if not cves:
        return 0

    db = _get_db()
    count = 0
    try:
        for c in cves:
            row = {
                "project_id": project_id,
                "node_id_xml": c.get("node_id_xml") or c.get("node_id") or c.get("nodeId"),
                "cve_id": c.get("cve_id") or c.get("id") or c.get("cve"),
                "cvss_score": c.get("cvss_score") or c.get("score"),
                "severity": c.get("severity"),
                "summary": c.get("summary") or c.get("title") or c.get("description"),
                "published": c.get("published") or c.get("publishedDate") or c.get("lastModified"),
            }
            _insert_dynamic("SM_CVE", row)
            count += 1

        db.session.commit()
        return count
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Errore inserimento CVE")
        raise

def insert_nodes(project_id: int, node_catalog: List[Dict[str, Any]]) -> int:
    """
    Upsert dei nodi in SM_Nodes.
    Vincolo unico: (project_id, node_id_xml).
    Scrive: project_id, node_id_xml, generic_node_id (TEXT), label, nature, security_props (JSON).
    """
    if not node_catalog:
        return 0

    db = _get_db()

    sql_upsert = text("""
        INSERT INTO SM_Nodes
            (project_id, node_id_xml, generic_node_id, label, nature, security_props)
        VALUES
            (:project_id, :node_id_xml, :generic_node_id, :label, :nature, :security_props)
        ON CONFLICT(project_id, node_id_xml) DO UPDATE SET
            generic_node_id = excluded.generic_node_id,
            label           = excluded.label,
            nature          = excluded.nature,
            security_props  = excluded.security_props
    """)

    count = 0
    try:
        for n in node_catalog:
            node_id_xml = n.get("node_id_xml") or n.get("id")
            if not node_id_xml:
                continue

            # se il FE non passa generic_node_id, lo calcoliamo da elementTypeName/nature/iconName/label
            generic_node_id = (
                n.get("generic_node_id")
                or _get_generic_node_id_from_key(
                    n.get("label")
                    or n.get("elementTypeName")
                    or n.get("nature")
                    or n.get("iconName")
                )
            )

            nature = n.get("nature") or n.get("elementTypeName") or ""
            label  = n.get("label") or ""

            sp_obj = n.get("security_props") or n.get("displayMetadata") or n.get("metadata") or {}
            try:
                security_props = json.dumps(sp_obj, ensure_ascii=False)
            except Exception:
                security_props = "{}"

            db.session.execute(sql_upsert, {
                "project_id":      project_id,
                "node_id_xml":     node_id_xml,
                "generic_node_id": str(generic_node_id),
                "label":           label,
                "nature":          nature,
                "security_props":  security_props,
            })
            count += 1

        db.session.commit()
        return count
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Errore upsert nodi")
        raise


def insert_edges(project_id: int, edges: list[dict]) -> int:
    """
    Inserisce gli edges per il progetto indicato.
    Atteso un array di oggetti simili a:
    {
      source: "<nodeIdXML>",
      target: "<nodeIdXML>",
      // opzionali/alias:
      edge_source_xml: "...", edge_target_xml: "...",
      security_property: "CIA", securityProperty: "CIA", protocol: "..."
    }
    """
    db = _get_db()

    if not isinstance(edges, list):
        return 0

    try:
        count = 0
        for e in edges:
            src = e.get("edge_source_xml") or e.get("source") or e.get("sourceId") or e.get("from")
            tgt = e.get("edge_target_xml") or e.get("target") or e.get("targetId") or e.get("to")

            # security_property: prendi il campo più specifico, altrimenti fai fallback
            sec_prop = e.get("security_property")

            if not src or not tgt:
                continue

            db.session.execute(text("""
                INSERT INTO SM_Edge (project_id, edge_source_xml, edge_target_xml, security_property)
                VALUES (:pid, :src, :tgt, :sec)
            """), {"pid": project_id, "src": str(src), "tgt": str(tgt), "sec": sec_prop})

            count += 1

        db.session.commit()
        return count

    except Exception:
        db.session.rollback()
        current_app.logger.exception("Errore insert_edges")
        raise
