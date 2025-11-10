# app/common/gn_resolver.py
import re
from sqlalchemy import text

def _norm(s):
    if not s:
        return ""
    return re.sub(r"[^a-z0-9]", "", s.lower())

def resolve_generic_node_id(db, *, nature=None, label=None, icon_name=None, element_type_name=None):
    """
    Risolve GenericNode.ID usando la stessa strategia delle rules:
    1) match diretto su Name / ElementType.Name
    2) match normalizzato (spazi, -, _, case)
    3) fallback LIKE prefisso
    Ritorna l'ID (stringa/testo) o None.
    """
    keys = [k for k in [nature, element_type_name, label, icon_name] if k]
    if not keys:
        return None

    # 1) match diretto
    for k in keys:
        row = db.session.execute(
            text('SELECT ID FROM GenericNode WHERE UPPER(Name)=UPPER(:k) OR UPPER("ElementType.Name")=UPPER(:k) LIMIT 1'),
            {"k": k.strip()},
        ).first()
        if row:
            return row[0]

    # 2) match normalizzato
    for k in keys:
        nk = _norm(k)
        row = db.session.execute(
            text("""
                SELECT ID FROM GenericNode
                 WHERE LOWER(REPLACE(REPLACE(REPLACE(Name,'-',''),'_',''),' ','')) = :nk
                    OR LOWER(REPLACE(REPLACE(REPLACE("ElementType.Name",'-',''),'_',''),' ','')) = :nk
                 LIMIT 1
            """),
            {"nk": nk},
        ).first()
        if row:
            return row[0]

    # 3) LIKE prefisso
    for k in keys:
        row = db.session.execute(
            text('SELECT ID FROM GenericNode WHERE Name LIKE :p || "%" OR "ElementType.Name" LIKE :p || "%" LIMIT 1'),
            {"p": k},
        ).first()
        if row:
            return row[0]

    return None
