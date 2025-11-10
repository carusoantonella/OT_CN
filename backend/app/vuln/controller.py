from flask import Blueprint, request, jsonify
import logging
from .service import query_cves
from sqlalchemy import text
from app.auth.utils import require_roles
from . import vuln_bp
import json, logging
from sqlalchemy.exc import IntegrityError
logger = logging.getLogger(__name__)


@vuln_bp.route("/csv", methods=["GET", "OPTIONS"])
def get_vulnerabilities():
    vendor   = request.args.get("vendor",  "").strip()
    version  = request.args.get("version", "").strip()

    logger.info("GET /vuln → vendor=%r version=%r", vendor, version)
    if not (vendor and version):
        logger.warning(" → missing vendor or version → 400")
        return jsonify({"error": "vendor and version required"}), 400

    data = query_cves(vendor, "", version)
    logger.info(" → returning %d CVEs", len(data))
    return jsonify(data)

@vuln_bp.route("/alerts/new", methods=["GET", "OPTIONS"])
@require_roles("root", "admin", "client")
def new_cve_alerts():
    """
    1) Progetti = DISTINCT project_id presenti in SM_CVE (o ?project_id=)
    2) Per progetto: (vendor,version) dai nodi -> feed CVE (UNIONE)
    3) Diff insiemistica; inserisco SOLO le mancanti compilando anche node_id_xml, summary e published_date
    Debug ATTIVO di default (?debug=0 per spegnere, 'full' con ?project_id=... per elenchi completi)
    """
    from app import db
    from sqlalchemy import text
    from sqlalchemy.exc import IntegrityError
    import json, logging
    logger = logging.getLogger(__name__)

    include_details = (request.args.get("include_details", "0") == "1")
    only_pid = request.args.get("project_id", type=int)
    debug_param = request.args.get("debug", "1")
    debug_on = debug_param != "0"
    debug_full = (debug_param.lower() == "full") and bool(only_pid)

    # ---------- helper robusti ----------
    def norm_cve_id(s: str) -> str:
        return (s or "").strip().upper()

    def _nested_get(d, path):
        v = d
        for p in path.split("."):
            if not isinstance(v, dict) or p not in v:
                return None
            v = v[p]
        return v

    def _pick(d, *keys):
        for k in keys:
            if isinstance(d, dict) and k in d and d[k] not in (None, ""):
                return d[k]
        return None

    def _extract_cve_id(item):
        if isinstance(item, str):
            return item
        if isinstance(item, dict):
            v = _pick(item, "cve_id", "cveId", "CVE_ID", "CVE", "id")
            if v:
                return v
            for path in ("cve.id", "cve.CVE", "cve.CVE_ID", "metadata.cve", "metadata.id"):
                v = _nested_get(item, path)
                if v:
                    return v
        return None

    def _extract_severity(item):
        if isinstance(item, dict):
            v = _pick(item, "severity", "cvss_severity", "baseSeverity")
            if v:
                return v
            v = _nested_get(item, "cvss.severity")
            if v:
                return v
        return None

    def _extract_cvss(item):
        if isinstance(item, dict):
            v = _pick(item, "cvss_score", "cvssScore", "score", "cvss", "baseScore")
            if v is not None:
                try:
                    return float(v)
                except Exception:
                    return None
            v = _nested_get(item, "cvss.baseScore")
            if v is not None:
                try:
                    return float(v)
                except Exception:
                    return None
        return None

    def _extract_summary(item):
        # preferisci "summary" o "title"; fallback "description"
        if isinstance(item, dict):
            v = _pick(item, "summary", "title", "description")
            if v:
                return str(v).strip()
            # qualche feed mette la descrizione dentro a oggetti annidati
            v = _nested_get(item, "cve.summary") or _nested_get(item, "cve.description")
            if v:
                return str(v).strip()
        # se item è stringa e contiene testo, usalo come summary
        if isinstance(item, str) and item.strip():
            return item.strip()
        return None

    def _extract_published_date(item):
        # accetta varianti comuni
        if isinstance(item, dict):
            v = _pick(item, "published_date", "publishedDate", "published", "datePublished")
            if v:
                return str(v).strip()
            v = _nested_get(item, "cve.published") or _nested_get(item, "cve.publishedDate")
            if v:
                return str(v).strip()
        return None
    # ------------------------------------

    # --- 0) Index UNIQUE + dedup storici (una tantum) ---
    try:
        db.session.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS ux_sm_cve_proj_cve
              ON SM_CVE(project_id, cve_id)
        """))
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        db.session.execute(text("""
            DELETE FROM SM_CVE
            WHERE rowid NOT IN (
              SELECT MIN(rowid) FROM SM_CVE GROUP BY project_id, cve_id
            )
        """))
        db.session.commit()
        db.session.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS ux_sm_cve_proj_cve
              ON SM_CVE(project_id, cve_id)
        """))
        db.session.commit()

    # --- 1) Progetti già analizzati (da SM_CVE) ---
    proj_sql = """
        SELECT DISTINCT c.project_id AS id, p.nome_progetto AS name
        FROM SM_CVE c
        JOIN SM_Anagrafica_progetto p ON p.id = c.project_id
    """
    if only_pid:
        proj_sql += " WHERE c.project_id = :pid"

    proj_rows = db.session.execute(
        text(proj_sql), {"pid": only_pid} if only_pid else {}
    ).mappings().all()
    if not proj_rows:
        return jsonify({"alerts": []}), 200

    proj_map = {
        r["id"]: {"name": r["name"], "pairs": set(), "pair_nodes": {}, "any_nodes": []}
        for r in proj_rows
    }

    # --- 2) Dai nodi: raccogli (vendor,version) e node_id_xml per pair ---
    nodes_sql = """
        SELECT n.project_id, n.node_id_xml, n.security_props
        FROM SM_nodes n
        WHERE n.project_id IN (
            SELECT DISTINCT c.project_id FROM SM_CVE c {and_pid}
        )
          AND n.security_props IS NOT NULL
          AND TRIM(n.security_props) <> ''
    """.format(and_pid=("WHERE c.project_id = :pid" if only_pid else ""))

    node_rows = db.session.execute(
        text(nodes_sql), {"pid": only_pid} if only_pid else {}
    ).mappings().all()

    for n in node_rows:
        pid = n["project_id"]
        if pid not in proj_map:
            continue
        node_id_xml = (n["node_id_xml"] or "").strip()
        if node_id_xml:
            proj_map[pid]["any_nodes"].append(node_id_xml)
        try:
            sp = json.loads(n["security_props"] or "{}")
        except Exception:
            continue
        vendor  = (sp.get("vendor")  or "").strip()
        version = (sp.get("version") or "").strip()
        if vendor and version:
            pair = (vendor, version)
            proj_map[pid]["pairs"].add(pair)
            proj_map[pid].setdefault("pair_nodes", {}).setdefault(pair, [])
            if node_id_xml:
                proj_map[pid]["pair_nodes"][pair].append(node_id_xml)

    # --- 3) Diff e insert mancanti (con node_id_xml + summary + published_date) ---
    insert_sql = text("""
        INSERT OR IGNORE INTO SM_CVE
            (project_id, node_id_xml, cve_id, severity, cvss_score, summary, published_date, created_at)
        VALUES
            (:pid, :node_id_xml, :cve_id, :severity, :cvss_score, :summary, :published_date, datetime('now','localtime'))
    """)

    alerts = []

    for pid, meta in proj_map.items():
        pairs = meta["pairs"]
        pair_nodes = meta["pair_nodes"]
        any_nodes = meta["any_nodes"]

        if not pairs:
            if debug_on:
                logger.info("[CVE-RECALC] pid=%s name=%s → nessun (vendor,version) nei nodi", pid, meta["name"])
            alerts.append({
                "project_id": pid,
                "project_name": meta["name"],
                "new_cve_count": 0,
                "pairs_used": [],
                "count_db": 0,
                "count_feed": 0,
                "missing_count": 0,
                "existing_ids_sample": [],
                "feed_ids_sample": [],
                "missing_ids_sample": [],
                "inserted_ids_sample": [],
            })
            continue

        if debug_on:
            logger.info("[CVE-RECALC] project_id=%s name=%s pairs=%s", pid, meta["name"], list(pairs))

        # 3.a esistenti in DB
        existing_rows = db.session.execute(
            text("SELECT cve_id FROM SM_CVE WHERE project_id = :pid"), {"pid": pid}
        ).all()
        existing = {norm_cve_id(r[0]) for r in existing_rows if r[0]}

        # 3.b feed aggregato
        feed_ids = set()
        feed_meta = {}   # cid_norm -> {severity, cvss_score, summary, published_date}
        cve_origin = {}  # cid_norm -> (vendor, version)

        for (vendor, version) in list(pairs):
            try:
                feed = query_cves(vendor, "", version) or []
                logger.info("query_cves → vendor=%s version=%s returned %d CVEs", vendor, version, len(feed))
            except Exception as e:
                db.session.rollback()
                logger.warning("query_cves failed pid=%s (%s %s): %s", pid, vendor, version, e)
                continue

            if debug_on and isinstance(feed, list) and feed:
                first = feed[0]
                if isinstance(first, dict):
                    logger.info("[CVE-FEED] pid=%s vendor=%s version=%s sample_keys=%s",
                                pid, vendor, version, list(first.keys()))
                else:
                    logger.info("[CVE-FEED] pid=%s vendor=%s version=%s sample_type=%s",
                                pid, vendor, version, type(first).__name__)

            for c in feed:
                cid = norm_cve_id(_extract_cve_id(c))
                if not cid:
                    continue
                if cid not in feed_meta:
                    feed_meta[cid] = {
                        "severity": _extract_severity(c),
                        "cvss_score": _extract_cvss(c),
                        "summary": _extract_summary(c),
                        "published_date": _extract_published_date(c),
                    }
                if cid not in cve_origin:
                    cve_origin[cid] = (vendor, version)
                feed_ids.add(cid)

        count_db   = len(existing)
        count_feed = len(feed_ids)
        missing = feed_ids - existing
        missing_count = len(missing)

        if debug_on:
            logger.info("[CVE-RECALC] pid=%s name=%s → count_db=%d count_feed=%d missing=%d",
                        pid, meta["name"], count_db, count_feed, missing_count)

        # --- INSERT & COMMIT prima di segnalare ---
        inserted_ids = []
        if missing_count > 0:
            for cid in sorted(missing):
                origin_pair = cve_origin.get(cid)
                node_id_xml = None
                if origin_pair and origin_pair in pair_nodes and pair_nodes[origin_pair]:
                    node_id_xml = pair_nodes[origin_pair][0]
                elif any_nodes:
                    node_id_xml = any_nodes[0]
                if not node_id_xml:
                    node_id_xml = "GENERIC-NODE-" + str(pid)

                meta_obj = feed_meta.get(cid, {})
                params = {
                    "pid": pid,
                    "node_id_xml": node_id_xml,
                    "cve_id": cid,
                    "severity": meta_obj.get("severity"),
                    "cvss_score": meta_obj.get("cvss_score"),
                    "summary": meta_obj.get("summary"),                 # <-- riempiamo SUMMARY
                    "published_date": meta_obj.get("published_date"),   # <-- e PUBLISHED_DATE se presente
                }
                try:
                    db.session.execute(insert_sql, params)
                    inserted_ids.append(cid)
                except IntegrityError:
                    db.session.rollback()
                    continue

            try:
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                logger.exception("commit failed for pid=%s: %s", pid, e)
                inserted_ids = []

        # calcolo finale “confermato dal DB”
        now_total = db.session.execute(
            text("SELECT COUNT(*) FROM SM_CVE WHERE project_id = :pid"),
            {"pid": pid}
        ).scalar() or 0
        newly_added = max(0, now_total - count_db)

        payload = {
            "project_id": pid,
            "project_name": meta["name"],
            "new_cve_count": newly_added,
            "latest": (
                [
                    {
                        "cve_id": x,
                        "severity": feed_meta.get(x, {}).get("severity"),
                        "cvss_score": feed_meta.get(x, {}).get("cvss_score"),
                        "summary": feed_meta.get(x, {}).get("summary"),
                        "published_date": feed_meta.get(x, {}).get("published_date"),
                    } for x in inserted_ids[:5]
                ] if include_details else None
            ),
            "pairs_used": list(pairs),
            "count_db": count_db,
            "count_feed": count_feed,
            "missing_count": missing_count,
            "now_total": now_total,
            "existing_ids_sample": sorted(list(existing))[:5],
            "feed_ids_sample": sorted(list(feed_ids))[:5],
            "missing_ids_sample": sorted(list(missing))[:5],
            "inserted_ids_sample": inserted_ids[:5],
        }

        if debug_full:
            payload["existing_ids_all"] = sorted(list(existing))
            payload["feed_ids_all"] = sorted(list(feed_ids))
            payload["missing_ids_all"] = sorted(list(missing))

        alerts.append(payload)

    return jsonify({"alerts": alerts}), 200





@vuln_bp.route("/alerts/ack", methods=["POST", "OPTIONS"])
@require_roles("root", "admin", "client")
def ack_cve_alerts():
    from app import db
    """
    Ack delle nuove CVE:
      - payload { "project_id": <id> } → ack per singolo progetto
      - payload { "all": true }        → ack per tutti i progetti con CVE
    """
    payload = request.get_json(silent=True) or {}
    project_id = payload.get("project_id")
    ack_all    = bool(payload.get("all"))

    try:
        if ack_all:
            sql = text("""
                UPDATE SM_Anagrafica_progetto
                   SET last_cve_notify = datetime('now','localtime')
                 WHERE id IN (SELECT DISTINCT project_id FROM SM_CVE)
            """)
            db.session.execute(sql)
        elif project_id:
            sql = text("""
                UPDATE SM_Anagrafica_progetto
                   SET last_cve_notify = datetime('now','localtime')
                 WHERE id = :pid
            """)
            db.session.execute(sql, {"pid": project_id})
        else:
            return jsonify({"error": "missing project_id or all:true"}), 400

        db.session.commit()
        return jsonify({"status": "ok"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500