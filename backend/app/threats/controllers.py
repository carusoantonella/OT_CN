# app/threats/controllers.py

import logging
from flask import current_app, request, jsonify
from sqlalchemy import text
from app.threats import threats_bp
from app.auth.utils import require_roles

# Imposto livello log su INFO (mostra solo warning, error e info concisi)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@threats_bp.route("/detect", methods=["POST", "OPTIONS"])
@require_roles("root", "admin", "client") 
def detect_threats():
    if request.method == "OPTIONS":
            return ("", 204)
    # 1) Rispondo al preflight CORS
    if request.method == "OPTIONS":
        response = current_app.make_response(("", 200))
        response.headers["Access-Control-Allow-Origin"]  = "*"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        return response

    # 2) Leggo JSON dal corpo
    try:
        payload = request.get_json(force=True)
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    nodes  = payload.get("nodes", [])
    edges  = payload.get("edges", [])
    groups = payload.get("groups", [])

    if not isinstance(nodes, list) or not isinstance(edges, list) or not isinstance(groups, list):
        return jsonify({"error": "Payload structure non valida"}), 400

    from app import db
    detected = []

    try:
        # 3.a) Creo mappa payloadNodeId → GenericNode.ID (stringa)
        node_id_map = {}
        for node in nodes:
            pl_id    = node.get("id", "").strip()
            pl_label = node.get("label", "").strip()

            if not pl_id or not pl_label:
                node_id_map[pl_id] = None
                continue

            sql_lookup = text("""
                SELECT ID
                  FROM GenericNode
                 WHERE Name = :lbl
                LIMIT 1
            """)
            row = db.session.execute(sql_lookup, {"lbl": pl_label}).mappings().first()
            if row:
                node_id_map[pl_id] = row["ID"]
            else:
                node_id_map[pl_id] = None
                logger.warning(f"GenericNode non trovato per label = '{pl_label}'")
        
        # 3.b) Mappo payload-group-id → GenericGroup.ID
        group_id_map = {}
        sql_grp = text("""
            SELECT ID
              FROM GenericGroup
             WHERE Name = :lbl
            LIMIT 1
        """)
        for grp in groups:
            pg_id    = grp.get("id", "").strip()
            pg_label = grp.get("label", "").strip()

            if not pg_id or not pg_label:
                group_id_map[pg_id] = None
                continue

            row = db.session.execute(sql_grp, {"lbl": pg_label}).mappings().first()
            group_id_map[pg_id] = row["ID"] if row else None


        # 4) Carico tutte le regole in memoria
        rules_all = db.session.execute(text("""
            SELECT ID, ID_THREAT, SOURCE, TARGET, ATTRIBUTE_TARGET, ATTRIBUTE_SOURCE
              FROM Rules
        """)).mappings().all()

        # 5) Pre‐parsing di ogni riga di Rules: splittiamo SOURCE/TARGET in liste
        rules_preparsed = []
        for r in rules_all:
            raw_src = r["SOURCE"] or ""
            raw_tgt = r["TARGET"] or ""
            src_list = [part.strip() for part in raw_src.split(",") if part.strip()]
            tgt_list = [part.strip() for part in raw_tgt.split(",") if part.strip()]

            rules_preparsed.append({
                "rule_id":       r["ID"],
                "threat_ref":    r["ID_THREAT"],
                "sources":       src_list,
                "targets":       tgt_list,
                "attribute_tgt": r["ATTRIBUTE_TARGET"],
                "attribute_src": r["ATTRIBUTE_SOURCE"],
            })

        # 6) Pre‐carico ThreatType e ThreatCategory
        threat_types = {
            row["Id"]: {
                "short_title": row["ShortTitle"],
                "description": row["Description"],
                "category":    row["Category"],
                "severity":    row["Severity"],
                "possible_mitigation": row["PossibleMitigation"],
            }
            for row in db.session.execute(text("""
                SELECT Id, ShortTitle, Description, Category, Severity, PossibleMitigation
                  FROM ThreatType
            """)).mappings().all()
        }
        threat_categories = {
            row["Id"]: row["Name"]
            for row in db.session.execute(text("""
                SELECT Id, Name
                  FROM ThreatCategory
            """)).mappings().all()
        }
        # 3.c) Mappa veloce dall’id payload alla record intero, per recuperare metadata.parentGroupId
        payload_node_map = { n.get("id",""): n for n in nodes }

        # 7) Per ogni edge, applico i tre scenari con “reason”
        for edge in edges:
            pl_src = edge.get("source", "").strip()
            pl_tgt = edge.get("target", "").strip()

            db_src = node_id_map.get(pl_src)
            db_tgt = node_id_map.get(pl_tgt)

             # se il nodo non è nel DB, saltiamo solo quel ramo
            if pl_src and db_src is None:
                continue
            if pl_tgt and db_tgt is None:
                continue

                        # Ricava anche i gruppi d’appartenenza (DB)
            src_pl_node = payload_node_map.get(pl_src, {})
            tgt_pl_node = payload_node_map.get(pl_tgt, {})
            pg_src = src_pl_node.get("metadata",{}).get("parentGroupId")
            pg_tgt = tgt_pl_node.get("metadata",{}).get("parentGroupId")
            db_src_grp = group_id_map.get(pg_src)
            db_tgt_grp = group_id_map.get(pg_tgt)


            for rule in rules_preparsed:
                sources = rule["sources"]
                targets = rule["targets"]
                matched = False
                reason  = None

                
                # --- LOG prima di ogni tentativo
            #    logger.info(
            #        f"[DBG] Edge '{pl_src}->{pl_tgt}' (DB {db_src}->{db_tgt}) "
            #        f"vs Rule {rule['rule_id']} (src={sources}, tgt={targets})"
            #    )

               # 1) Nodo→Nodo
                if not sources and not targets:
                    matched = True
                    reason  = "Regola generica senza source/target"
                # • Entrambe le liste non vuote
                elif sources and targets:
                    if db_src in sources and db_tgt in targets:
                        matched = True
                        reason = f"SOURCE corrisponde a '{db_src}' e TARGET corrisponde a '{db_tgt}'"
                # • Solo targets non vuoto
                elif not sources and targets:
                    if db_tgt in targets:
                        matched = True
                        reason = f"TARGET corrisponde a '{db_tgt}'"
                # • Solo sources non vuoto
                elif sources and not targets:
                    if db_src in sources:
                        matched = True
                        reason = f"SOURCE corrisponde a '{db_src}'"
                # • Altri casi → non matchare
                else:
                    continue
                

                # 2) Gruppo→Gruppo (se i nodi appartengono a gruppi e nella regola ci sono i loro ID)
                if not matched and db_src_grp is not None and db_tgt_grp is not None:
                    if db_src_grp in sources and db_tgt_grp in targets:
                        matched = True
                        reason = f"SOURCE grp '{db_src_grp}' e TARGET grp '{db_tgt_grp}'"

                # 3) Regola generica (DB senza source/target) → matcha sempre
                if not matched and not sources and not targets:
                    matched = True
                    reason  = "Regola generica"
                    
                # --- LOG esito di questo rule check
                if matched:
                    logger.info(
                        f"[DBG]  → MATCHED Rule {rule['rule_id']} for edge "
                        f"'{pl_src}->{pl_tgt}': {reason}"
                    )
                else:
                    logger.info(
                        f"[DBG]  → no match for Rule {rule['rule_id']}"
                    )

                if not matched:
                    continue

                # Se matchato, prendo i dettagli del threat
                thr_id = rule["threat_ref"]
                tt = threat_types.get(thr_id)
                if not tt:
                    continue

                detected.append({
                    "rule_id":           rule["rule_id"],
                    "threat_id":         thr_id,
                    "threat_name":       tt["short_title"],
                    "description":       tt["description"],
                    "category_id":       tt["category"],
                    "category_name":     threat_categories.get(tt["category"]),
                    "severity":          tt["severity"],
                    "edge_source_label": pl_src,
                    "edge_target_label": pl_tgt,
                    "attribute_target":  rule["attribute_tgt"],
                    "attribute_source":  rule["attribute_src"],
                    "reason":            reason,
                    "possible_mitigation": tt["possible_mitigation"]
                })

        logger.info(f"Numero di threat rilevati: {len(detected)}")
        return jsonify({"detected_threats": detected}), 200

    except Exception:
        db.session.rollback()
        logger.exception("Errore durante detect_threats")
        return jsonify({"error": "Errore esecuzione query"}), 500
