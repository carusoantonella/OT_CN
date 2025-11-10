import logging
from flask import request, jsonify
from sqlalchemy import text
from app.threatdb import threatdb_bp
from app.auth.utils import require_roles

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@threatdb_bp.route("/health", methods=["GET"])
@require_roles("root")
def health():
    return {"status": "ok"}, 200


def _paginate_args():
    try:
        limit = int(request.args.get("limit", 1000))
        offset = int(request.args.get("offset", 0))
    except Exception:
        limit, offset = 1000, 0
    return max(1, min(limit, 2000)), max(0, offset)


def _like_param(q: str | None):
    return f"%{q.strip()}%" if q else None


@threatdb_bp.route("/rules", methods=["GET"])
def list_rules():
    from app import db   # import QUI (come in detect_threats)
    limit, offset = _paginate_args()
    q = (request.args.get("q") or "").strip()

    where_sql = ""
    params = {"limit": limit, "offset": offset}

    if q:
        where_sql = """
        WHERE (ID_THREAT LIKE :q
            OR SOURCE LIKE :q
            OR TARGET LIKE :q
            OR ATTRIBUTE_TARGET LIKE :q
            OR ATTRIBUTE_SOURCE LIKE :q)
        """
        params["q"] = _like_param(q)

    count_sql = text(f"""
        SELECT COUNT(*) AS c FROM Rules
    """)
    base_sql = text(f"""
        SELECT ID, ID_THREAT, SOURCE, TARGET, ATTRIBUTE_TARGET, ATTRIBUTE_SOURCE
        FROM Rules
        ORDER BY ID ASC
        LIMIT :limit OFFSET :offset
    """)

    try:
        total = db.session.execute(count_sql, params).mappings().first()["c"]
        rows = db.session.execute(base_sql, params).mappings().all()
        return jsonify({"data": [dict(r) for r in rows], "total": total}), 200
    except Exception as e:
        db.session.rollback()
        logger.exception("Errore list_rules")
        return jsonify({"error": str(e)}), 500


@threatdb_bp.route("/threat-types", methods=["GET"])
def list_threat_types():
    from app import db   # import QUI
    limit, offset = _paginate_args()
    q = (request.args.get("q") or "").strip()

    where_sql = ""
    params = {"limit": limit, "offset": offset}

    if q:
        where_sql = """
        WHERE (Id LIKE :q
            OR ShortTitle LIKE :q
            OR Description LIKE :q
            OR Category LIKE :q
            OR Severity LIKE :q
            OR PossibleMitigation LIKE :q)
        """
        params["q"] = _like_param(q)

    count_sql = text(f"""
        SELECT COUNT(*) AS c FROM ThreatType
    """)
    base_sql = text(f"""
        SELECT Id, ShortTitle, Description, Category, Severity, PossibleMitigation
        FROM ThreatType
        ORDER BY Id ASC
        LIMIT :limit OFFSET :offset
    """)

    try:
        total = db.session.execute(count_sql, params).mappings().first()["c"]
        rows = db.session.execute(base_sql, params).mappings().all()
        return jsonify({"data": [dict(r) for r in rows], "total": total}), 200
    except Exception as e:
        db.session.rollback()
        logger.exception("Errore list_threat_types")
        return jsonify({"error": str(e)}), 500
