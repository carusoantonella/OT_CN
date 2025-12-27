# app/threats/controllers.py

import logging
import json
from collections import Counter

from flask import current_app, request, jsonify
from sqlalchemy import text

from app.threats import threats_bp
from app.auth.utils import require_roles

# Log livello INFO (warning/error/info concisi)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Severities canoniche (case-insensitive) -> formato output coerente
_ALLOWED_SEVERITIES = {
    "info": "Info",
    "low": "Low",
    "medium": "Medium",
    "high": "High",
    "critical": "Critical",
}


def split_ids(raw):
    """
    Converte una stringa tipo '12, 34,56' in ['12','34','56'].
    Se raw è None o vuota → [] (interpretato come ALL / wildcard).
    """
    if raw is None:
        return []
    s = str(raw).strip()
    if not s:
        return []
    return [part.strip() for part in s.split(",") if part.strip()]


def _short(obj, max_len=1200):
    """JSON compatto e troncato per log."""
    try:
        s = json.dumps(obj, ensure_ascii=False)
    except Exception:
        s = str(obj)
    if len(s) > max_len:
        return s[:max_len] + "...[truncated]"
    return s


def _get_meta_icon(node):
    meta = node.get("metadata") or {}
    return (meta.get("iconName") or "").strip()


def _get_group_type(grp):
    meta = grp.get("metadata") or {}
    return (grp.get("groupType") or meta.get("groupType") or "").strip()


def _pluck_ids(items, key="id", limit=40):
    out = []
    for it in items[:limit]:
        out.append((it.get(key) if isinstance(it, dict) else None))
    return out


def _norm_severity(raw):
    s = (raw or "").strip()
    if not s:
        return ""
    return _ALLOWED_SEVERITIES.get(s.lower(), s)


def _maybe_swap_category_severity(threat_id, category_raw, severity_raw, threat_category_ids):
    """
    Se nel DB sono stati invertiti Category e Severity, li corregge IN MEMORY e logga.
    Tipico caso: Category='Medium' e Severity='I' (dove 'I' è id ThreatCategory).
    """
    cat = (category_raw or "").strip()
    sev = (severity_raw or "").strip()

    cat_is_sev = cat.lower() in _ALLOWED_SEVERITIES
    sev_is_cat = sev in threat_category_ids

    cat_is_cat = cat in threat_category_ids
    sev_is_sev = sev.lower() in _ALLOWED_SEVERITIES

    # Swap SOLO se ha senso farlo (evitiamo falsi positivi)
    if cat_is_sev and sev_is_cat and (not cat_is_cat) and (not sev_is_sev):
        logger.error(
            "ThreatType '%s' sembra avere Category/Severity invertiti nel DB: Category='%s' Severity='%s' -> swap in memory",
            threat_id, cat, sev
        )
        cat, sev = sev, cat  # swap

    return cat, sev


@threats_bp.route("/detect", methods=["POST", "OPTIONS"])
@require_roles("root", "admin", "client")
def detect_threats():
    # 1) Preflight CORS
    if request.method == "OPTIONS":
        response = current_app.make_response(("", 200))
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        return response

    # 2) Leggo JSON dal corpo
    try:
        payload = request.get_json(force=True)
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    nodes = payload.get("nodes", [])
    edges = payload.get("edges", [])
    groups = payload.get("groups", [])

    if not isinstance(nodes, list) or not isinstance(edges, list) or not isinstance(groups, list):
        return jsonify({"error": "Payload structure non valida"}), 400

    debug = bool(payload.get("debug", False)) or bool(current_app.config.get("THREATS_DEBUG", False))

    logger.info(
        "detect_threats() payload: nodes=%d edges=%d groups=%d",
        len(nodes), len(edges), len(groups)
    )

    # LOG ID ricevuti (sempre, ma in forma compatta)
    node_ids_sample = [str(x) for x in _pluck_ids(nodes, "id", 30) if x]
    edge_ids_sample = [str(x) for x in _pluck_ids(edges, "id", 30) if x]
    group_ids_sample = [str(x) for x in _pluck_ids(groups, "id", 30) if x]

    logger.info("Payload node IDs sample (max 30): %s", node_ids_sample)
    logger.info("Payload edge IDs sample (max 30): %s", edge_ids_sample)
    logger.info("Payload group IDs sample (max 30): %s", group_ids_sample)

    # ✅ NEW: mappe label per mostrare source/target in FE anche se nodes=[]
    group_label_map = {
        (g.get("id") or "").strip(): ((g.get("label") or "").strip() or (g.get("id") or "").strip())
        for g in groups
        if (g.get("id") or "").strip()
    }
    node_label_map = {
        (n.get("id") or "").strip(): ((n.get("label") or "").strip() or (n.get("id") or "").strip())
        for n in nodes
        if (n.get("id") or "").strip()
    }

    # Caso tipico: edges tra GROUP (zone) senza nodi asset
    if len(nodes) == 0 and len(edges) > 0:
        logger.warning(
            "Payload contains edges but NO nodes. Node-based rules (SOURCE/TARGET) won't match, "
            "but GROUP-based rules (SOURCE_GROUP/TARGET_GROUP) CAN still match if edges are GROUP->GROUP."
        )
        edge_links = [
            {
                "edgeId": e.get("id"),
                "source": e.get("source"),
                "target": e.get("target"),
                # ✅ NEW: protocol anche su e.get("protocol")
                "protocol": (e.get("protocol") or (e.get("metadata") or {}).get("protocol")),
            }
            for e in edges[:10]
        ]
        logger.info("Edge links sample (max 10): %s", _short(edge_links))

    if debug:
        logger.info("Payload keys: %s", list(payload.keys()))

    # ✅ NEW: protocol letto sia da edge.protocol che da edge.metadata.protocol
    protos = sorted({
        ((e.get("protocol") or (e.get("metadata") or {}).get("protocol") or "").strip())
        for e in edges
        if (e.get("protocol") or (e.get("metadata") or {}).get("protocol"))
    })
    if protos:
        logger.info("Protocols in edges (unique, max 30): %s", protos[:30])
    else:
        logger.warning("No 'protocol' found in any edge metadata (flows rules may never match).")

    from app import db

    detected = []

    try:
        # 3.a) payloadNodeId → GenericNode.ID (PK DB)
        node_id_map = {}
        stats_nodes = Counter()

        sql_exists_node_id = text("SELECT 1 FROM GenericNode WHERE ID = :id LIMIT 1")
        sql_lookup_node_by_name = text("""
            SELECT ID
              FROM GenericNode
             WHERE LOWER(TRIM(Name)) = LOWER(:lbl)
             LIMIT 1
        """)

        for node in nodes:
            pl_id = (node.get("id") or "").strip()
            pl_label = (node.get("label") or "").strip()
            icon_name = _get_meta_icon(node)

            if not pl_id:
                stats_nodes["payload_missing_id"] += 1
                continue

            # 1) iconName -> ID
            if icon_name:
                exists = db.session.execute(sql_exists_node_id, {"id": icon_name}).scalar_one_or_none()
                if exists:
                    node_id_map[pl_id] = icon_name
                    stats_nodes["mapped_by_iconName"] += 1
                    continue
                else:
                    stats_nodes["iconName_not_in_db"] += 1
                    logger.warning("Node iconName non presente in DB: iconName='%s' label='%s'", icon_name, pl_label)

            # 2) fallback label -> Name
            if not pl_label:
                node_id_map[pl_id] = None
                stats_nodes["payload_missing_label"] += 1
                continue

            db_id = db.session.execute(sql_lookup_node_by_name, {"lbl": pl_label}).scalar_one_or_none()
            node_id_map[pl_id] = db_id
            if db_id is None:
                stats_nodes["label_not_found_in_db"] += 1
                logger.warning("GenericNode non trovato per label(Name)='%s' (iconName='%s')", pl_label, icon_name)
            else:
                stats_nodes["mapped_by_label"] += 1

        logger.info("Node mapping stats: %s", dict(stats_nodes))

        # 3.b) payload-group-id → GenericGroup.ID
        group_id_map = {}
        stats_groups = Counter()

        sql_exists_group_id = text("SELECT 1 FROM GenericGroup WHERE ID = :id LIMIT 1")
        sql_lookup_group_by_name = text("""
            SELECT ID
              FROM GenericGroup
             WHERE LOWER(TRIM(Name)) = LOWER(:lbl)
             LIMIT 1
        """)

        for grp in groups:
            pg_id = (grp.get("id") or "").strip()
            pg_label = (grp.get("label") or "").strip()
            group_type = _get_group_type(grp)

            if not pg_id:
                stats_groups["payload_missing_id"] += 1
                continue

            # 1) groupType -> ID
            if group_type:
                exists = db.session.execute(sql_exists_group_id, {"id": group_type}).scalar_one_or_none()
                if exists:
                    group_id_map[pg_id] = group_type
                    stats_groups["mapped_by_groupType"] += 1
                    continue
                else:
                    stats_groups["groupType_not_in_db"] += 1
                    logger.warning("Group groupType non presente in DB: groupType='%s' label='%s'", group_type, pg_label)

            # 2) fallback label -> Name
            if not pg_label:
                group_id_map[pg_id] = None
                stats_groups["payload_missing_label"] += 1
                continue

            db_gid = db.session.execute(sql_lookup_group_by_name, {"lbl": pg_label}).scalar_one_or_none()
            group_id_map[pg_id] = db_gid
            if db_gid is None:
                stats_groups["label_not_found_in_db"] += 1
                logger.warning("GenericGroup non trovato per label(Name)='%s' (groupType='%s')", pg_label, group_type)
            else:
                stats_groups["mapped_by_label"] += 1

        logger.info("Group mapping stats: %s", dict(stats_groups))

        # 4) Regole (solo condizioni di match + riferimento al ThreatType)
        rules_all = db.session.execute(text("""
            SELECT
              ID               AS rule_id,
              ID_THREAT        AS threat_id,
              SOURCE           AS source,
              TARGET           AS target,
              FLOW             AS flow,
              SOURCE_GROUP     AS source_group,
              TARGET_GROUP     AS target_group,
              ATTRIBUTE_TARGET AS attribute_target,
              ATTRIBUTE_SOURCE AS attribute_source
            FROM Rules
        """)).mappings().all()

        logger.info("Rules loaded: %d", len(rules_all))

        rules_stats = Counter()
        for r in rules_all:
            rules_stats["with_source"] += 1 if (r.get("source") or "") else 0
            rules_stats["with_target"] += 1 if (r.get("target") or "") else 0
            rules_stats["with_flow"] += 1 if (r.get("flow") or "") else 0
            rules_stats["with_source_group"] += 1 if (r.get("source_group") or "") else 0
            rules_stats["with_target_group"] += 1 if (r.get("target_group") or "") else 0
        logger.info("Rules fields usage: %s", dict(rules_stats))

        # 5) Parsing rules (FLOW uppercase)
        rules_preparsed = []
        for r in rules_all:
            rules_preparsed.append({
                "rule_id": r["rule_id"],
                "threat_ref": r["threat_id"],
                "sources": split_ids(r["source"]),
                "targets": split_ids(r["target"]),
                "flows": [f.upper() for f in split_ids(r["flow"])],
                "source_groups": split_ids(r["source_group"]),
                "target_groups": split_ids(r["target_group"]),
                "attribute_tgt": r["attribute_target"],
                "attribute_src": r["attribute_source"],
            })

        # 6) ThreatCategory (serve per category_name e per riconoscere swap)
        threat_categories = {
            row["Id"]: row["Name"]
            for row in db.session.execute(text("""
                SELECT Id, Name
                  FROM ThreatCategory
            """)).mappings().all()
        }
        threat_category_ids = set(threat_categories.keys())

        # 6) ThreatType (dettagli da ritornare al FE: description/severity/category/possible_mitigation)
        threat_types = {}
        rows_tt = db.session.execute(text("""
            SELECT Id, ShortTitle, Description, Category, Severity, PossibleMitigation
            FROM ThreatType
        """)).mappings().all()

        for row in rows_tt:
            thr_id = (row.get("Id") or "").strip()
            if not thr_id:
                continue

            cat_id_raw = (row.get("Category") or "").strip()
            sev_raw = (row.get("Severity") or "").strip()
            # ✅ NEW: correggi eventuale swap in memoria
            cat_id, sev = _maybe_swap_category_severity(thr_id, cat_id_raw, sev_raw, threat_category_ids)

            # ✅ NEW: normalizza severity e default
            sev = _norm_severity(sev) or "Info"

            desc = (row.get("Description") or "").strip()
            pm = (row.get("PossibleMitigation") or "").strip()

            threat_types[thr_id] = {
                "short_title": (row.get("ShortTitle") or "").strip(),
                "description": desc,
                "category": cat_id or None,
                "category_name": threat_categories.get(cat_id, cat_id or ""),
                "severity": sev,
                "possible_mitigation": pm,
            }

        logger.info("ThreatType loaded: %d | ThreatCategory loaded: %d", len(threat_types), len(threat_categories))

        # payload id -> nodo payload (per parentGroup* se edge è NODE->NODE)
        payload_node_map = {(n.get("id") or ""): n for n in nodes}

        # 7) Match su edges
        edge_skip = Counter()
        edge_eval = 0
        match_count = 0
        edge_kind = Counter()

        for edge in edges:
            edge_eval += 1

            edge_id = (edge.get("id") or "").strip()
            pl_src = (edge.get("source") or "").strip()
            pl_tgt = (edge.get("target") or "").strip()

            if not pl_src or not pl_tgt:
                edge_skip["missing_src_or_tgt"] += 1
                continue

            # Endpoint kind: NODE vs GROUP
            src_is_group = pl_src in group_id_map
            tgt_is_group = pl_tgt in group_id_map
            src_is_node = pl_src in node_id_map
            tgt_is_node = pl_tgt in node_id_map

            if src_is_group and tgt_is_group:
                edge_kind["group-group"] += 1
            elif src_is_node and tgt_is_node:
                edge_kind["node-node"] += 1
            elif src_is_node and tgt_is_group:
                edge_kind["node-group"] += 1
            elif src_is_group and tgt_is_node:
                edge_kind["group-node"] += 1
            else:
                edge_skip["unmapped_endpoint"] += 1
                continue

            edge_meta = edge.get("metadata") or {}
            # ✅ NEW: proto anche da edge.protocol
            proto = ((edge.get("protocol") or edge_meta.get("protocol") or "").strip()).upper()
            if not proto:
                edge_skip["missing_protocol"] += 1

            # db node ids (solo se endpoint è NODE)
            db_src = None
            db_tgt = None
            if src_is_node:
                db_src = node_id_map.get(pl_src)
                if db_src is None:
                    edge_skip["unmapped_node_db"] += 1
                    continue
            if tgt_is_node:
                db_tgt = node_id_map.get(pl_tgt)
                if db_tgt is None:
                    edge_skip["unmapped_node_db"] += 1
                    continue

            # db group ids
            db_src_grp = None
            db_tgt_grp = None

            if src_is_group:
                db_src_grp = group_id_map.get(pl_src)
            else:
                src_pl_node = payload_node_map.get(pl_src, {}) or {}
                src_meta = src_pl_node.get("metadata") or {}
                pg_src = (src_meta.get("parentGroupNodeId") or src_meta.get("parentGroupId") or src_meta.get("parentGroupLogicalId") or "").strip()
                db_src_grp = group_id_map.get(pg_src)

            if tgt_is_group:
                db_tgt_grp = group_id_map.get(pl_tgt)
            else:
                tgt_pl_node = payload_node_map.get(pl_tgt, {}) or {}
                tgt_meta = tgt_pl_node.get("metadata") or {}
                pg_tgt = (tgt_meta.get("parentGroupNodeId") or tgt_meta.get("parentGroupId") or tgt_meta.get("parentGroupLogicalId") or "").strip()
                db_tgt_grp = group_id_map.get(pg_tgt)

            matched_this_edge = 0

            for rule in rules_preparsed:
                sources = rule["sources"]
                targets = rule["targets"]
                flows = rule["flows"]
                src_groups = rule["source_groups"]
                tgt_groups = rule["target_groups"]

                # Wildcard: campo vuoto => non filtra
                if sources:
                    if db_src is None or str(db_src) not in sources:
                        continue
                if targets:
                    if db_tgt is None or str(db_tgt) not in targets:
                        continue
                if flows:
                    if proto not in flows:
                        continue
                if src_groups:
                    if db_src_grp is None or str(db_src_grp) not in src_groups:
                        continue
                if tgt_groups:
                    if db_tgt_grp is None or str(db_tgt_grp) not in tgt_groups:
                        continue

                thr_id = rule["threat_ref"]
                tt = threat_types.get(thr_id)
                if not tt:
                    edge_skip["threattype_missing_for_rule"] += 1
                    continue

                reason_parts = []
                if sources:
                    reason_parts.append(f"SOURCE in {sources}")
                if targets:
                    reason_parts.append(f"TARGET in {targets}")
                if flows:
                    reason_parts.append(f"FLOW in {flows}")
                if src_groups:
                    reason_parts.append(f"SOURCE_GROUP in {src_groups}")
                if tgt_groups:
                    reason_parts.append(f"TARGET_GROUP in {tgt_groups}")
                reason = " & ".join(reason_parts) or "Regola generica (tutti i campi ALL)"

                # ✅ NEW: label FE reali (gruppi/nodi) invece di ID payload
                src_label = (group_label_map.get(pl_src) if src_is_group else node_label_map.get(pl_src)) or pl_src
                tgt_label = (group_label_map.get(pl_tgt) if tgt_is_group else node_label_map.get(pl_tgt)) or pl_tgt

                # ✅ FIX: usa SEMPRE i valori della ThreatType (tt), non variabili “esterne”
                detected.append({
                    # IDs utili per troubleshooting
                    "edge_payload_id": edge_id,
                    "source_payload_id": pl_src,
                    "target_payload_id": pl_tgt,
                    "source_db_node_id": db_src,
                    "target_db_node_id": db_tgt,
                    "source_db_group_id": db_src_grp,
                    "target_db_group_id": db_tgt_grp,
                    "protocol": proto,

                    # ✅ label leggibili in FE (Review.js)
                    "edge_source_label": src_label,
                    "edge_target_label": tgt_label,

                    # CAMPI PER IL FRONTEND
                    "threat_id": thr_id,
                    "threat_name": tt.get("short_title", ""),
                    "description": tt.get("description", ""),
                    "severity": tt.get("severity", "Info"),
                    "category": tt.get("category"),
                    "category_name": tt.get("category_name", ""),
                    "possible_mitigation": tt.get("possible_mitigation", ""),

                    # BACKWARD COMPAT (se hai export/vecchio FE)
                    "threat_description": tt.get("description", ""),
                    "threat_severity": tt.get("severity", "Info"),
                    "threat_category": tt.get("category"),

                    # già presenti/tuoi
                    "rule_id": rule.get("rule_id"),
                    "attribute_target": rule["attribute_tgt"],
                    "attribute_source": rule["attribute_src"],
                    "reason": reason,
                })

                matched_this_edge += 1
                match_count += 1

            if matched_this_edge == 0:
                edge_skip["no_rule_matched"] += 1

        logger.info("Edge evaluation: total=%d total_rule_matches=%d", edge_eval, match_count)
        logger.info("Edge kind stats: %s", dict(edge_kind))
        logger.info("Edge skip summary: %s", dict(edge_skip))
        logger.info("Numero di threat rilevati: %s", len(detected))

        # ✅ FIX LOG: usa le chiavi reali che invii
        if detected:
            sev_count = Counter([d.get("severity") for d in detected])
            cat_count = Counter([d.get("category") for d in detected])
            logger.info("Detected severities (count): %s", dict(sev_count))
            logger.info("Detected categories (count): %s", dict(cat_count))
            if debug:
                logger.info("Detected sample (max 3): %s", _short(detected[:3], 2000))

        return jsonify({
            "detected_threats": detected,
            "debug_summary": {
                "nodes": len(nodes),
                "edges": len(edges),
                "groups": len(groups),
                "node_ids_sample": node_ids_sample,
                "edge_ids_sample": edge_ids_sample,
                "group_ids_sample": group_ids_sample,
                "edge_kind": dict(edge_kind),
                "edge_skip": dict(edge_skip),
            } if debug else None
        }), 200

    except Exception:
        db.session.rollback()
        logger.exception("Errore durante detect_threats")
        return jsonify({"error": "Errore esecuzione query"}), 500
