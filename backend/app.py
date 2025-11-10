# backend/app.py
# Nota: IMPORT di create_app è fatto DOPO la preparazione del DB per evitare
# che l'app venga inizializzata con la vecchia config prima che impostiamo
# SQLALCHEMY_DATABASE_URI.

from flask import send_from_directory, abort, Response
import os, sys, tempfile, glob, time, threading, webbrowser, mimetypes, shutil, stat

# ------------------------- DB helper per exe onefile -------------------------
def _get_base_dir_for_resources():
    """
    Base per risorse incluse:
      - in sviluppo: directory del package (dove sta questo file)
      - in exe frozen (Nuitka/PyInstaller onefile): directory dell'eseguibile (estratta in temp)
    """
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.abspath(os.path.dirname(__file__))

def ensure_writable_sqlite(seed_relpath="data/TAT_Database.db", appname="TAT"):
    """
    Copia seed_relpath (se presente) dalla base delle risorse in una cartella
    scrivibile dell'utente (%LOCALAPPDATA%\<appname>\) e restituisce il path assoluto
    del DB da usare.
    Se seed non esiste, crea un DB vuoto nella cartella utente.
    """
    base = _get_base_dir_for_resources()
    seed_path = os.path.normpath(os.path.join(base, seed_relpath))

    # cartella utente (scrivibile)
    local_appdata = os.environ.get("LOCALAPPDATA") or tempfile.gettempdir()
    user_dir = os.path.join(local_appdata, appname)
    os.makedirs(user_dir, exist_ok=True)

    target_db = os.path.join(user_dir, os.path.basename(seed_relpath))

    # copia seed se esiste, altrimenti crea file vuoto
    if not os.path.exists(target_db):
        if os.path.exists(seed_path):
            try:
                shutil.copy2(seed_path, target_db)
                print(f"[TAT] Copied seed DB from {seed_path} to {target_db}")
            except Exception as e:
                print(f"[TAT] Copy seed DB failed ({e}), creating empty DB at {target_db}")
                open(target_db, "a").close()
        else:
            print(f"[TAT] No seed DB found at {seed_path}, creating empty DB at {target_db}")
            open(target_db, "a").close()

    # verifica scrivibilità
    try:
        with open(target_db, "ab"):
            pass
    except Exception as e:
        # rilancia con messaggio chiaro
        raise RuntimeError(f"Database file not writable: {target_db!r}") from e

    return target_db

# --- Assicuriamoci di avere un DB scrivibile PRIMA di importare e creare l'app ---
try:
    db_file = ensure_writable_sqlite(seed_relpath="data/TAT_Database.db", appname="TAT")
    # Normalizza il path e costruisci una URI corretta (usando slash)
    db_file = os.path.abspath(db_file)
    db_file_posix = db_file.replace("\\", "/")
    sqlite_uri = f"sqlite:///{db_file_posix}"

    # imposta la URI come variabile d'ambiente così create_app (se legge le env) la userà
    os.environ["SQLALCHEMY_DATABASE_URI"] = sqlite_uri
    os.environ["DATABASE_URL"] = sqlite_uri

    # try to make file owner-writable (best-effort)
    try:
        os.chmod(db_file, stat.S_IRUSR | stat.S_IWUSR)
    except Exception as e:
        print("[TAT] chmod warning (ignored):", e)

    # prova a creare/rimuovere un file di test nella stessa cartella per verificare permessi
    try:
        testf = os.path.join(os.path.dirname(db_file), "tat_write_test.txt")
        with open(testf, "w") as fh:
            fh.write("ok")
        os.remove(testf)
        print("[TAT] write test ok in", os.path.dirname(db_file))
    except Exception as e:
        print("[TAT] write test failed:", e)

    print(f"[TAT] Using writable DB (normalized) at: {db_file} -> URI: {sqlite_uri}")
except Exception as e:
    # Non bloccare l'avvio: logghiamo ed andiamo avanti — create_app potrà comunque caricare config
    print(f"[TAT] Warning: could not prepare writable DB: {e}")

# Ora importiamo create_app DOPO che la env è stata impostata
from app import create_app

# Ora creiamo l'app (create_app dovrebbe leggere la config DB dall'ambiente o dal file di config)
app = create_app()

# ====== Endpoint debug DB (utile con exe) ======
from flask import current_app, jsonify

@app.route("/_tat_db_debug", methods=["GET"])
def _tat_db_debug():
    uri = current_app.config.get("SQLALCHEMY_DATABASE_URI")
    info = {"SQLALCHEMY_DATABASE_URI": uri}
    try:
        if uri and uri.startswith("sqlite:///"):
            dbpath = uri.replace("sqlite:///", "")
            info["dbpath"] = dbpath
            info["exists"] = os.path.exists(dbpath)
            try:
                info["size"] = os.path.getsize(dbpath) if info["exists"] else None
            except Exception as e:
                info["size_error"] = str(e)
            info["writable"] = os.access(dbpath, os.W_OK) if info["exists"] else False
            try:
                with open(dbpath, "rb"):
                    info["open"] = "ok"
            except Exception as e:
                info["open_error"] = str(e)
        else:
            info["note"] = "Non è una sqlite URI o non impostata"
    except Exception as e:
        info["error"] = str(e)

    print("[TAT] DB_DEBUG ->", info)
    return jsonify(info)

# ------------------------- Restante codice / gestione static -------------------------
def find_build_dir():
    """
    Prova molte posizioni possibili per la build SPA.
    Restituisce (build_dir, static_dir) dove static_dir è il folder che contiene js/css,
    oppure (None,None).
    """
    candidates = []

    # 1) percorso relativo al file sorgente (quando non frozen)
    try:
        file_dir = os.path.abspath(os.path.dirname(__file__))
        candidates.append(os.path.join(file_dir, "web"))
    except Exception:
        pass

    # 2) percorso relativo all'eseguibile (quando bundle/onefile)
    try:
        exec_dir = os.path.abspath(os.path.dirname(sys.executable))
        candidates.append(os.path.join(exec_dir, "web"))
        # anche la radice dell'exe (a volte extraction crea app.dist or similar)
        candidates.append(exec_dir)
    except Exception:
        pass

    # 3) cartella di lavoro corrente
    candidates.append(os.path.join(os.getcwd(), "web"))
    candidates.append(os.getcwd())

    # 4) cartelle di temp dove onefile viene estratto (cerca web foldes e index.html)
    tmp = tempfile.gettempdir()
    for p in glob.glob(os.path.join(tmp, "*")):
        # cerca sia 'web' dentro la temp
        if os.path.isdir(os.path.join(p, "web")):
            candidates.append(os.path.join(p, "web"))
        # e cartelle che contengono index.html
        if os.path.isdir(p) and os.path.isfile(os.path.join(p, "index.html")):
            candidates.append(p)

    # aggiungi possibili sottostrutture comuni (build, build_obf)
    expanded = []
    for c in candidates:
        expanded.append(c)
        expanded.append(os.path.join(c, "build"))
        expanded.append(os.path.join(c, "build_obf"))
        expanded.append(os.path.join(c, "frontend"))
        expanded.append(os.path.join(c, "dist"))
        expanded.append(os.path.join(c, "static"))
        expanded.append(os.path.join(c, "web", "static"))

    # deduplica mantenendo ordine
    seen = set(); filtered = []
    for p in expanded:
        if p not in seen:
            seen.add(p); filtered.append(p)

    # trova il primo che contiene index.html e una cartella static con js/css
    for c in filtered:
        index = os.path.join(c, "index.html")
        static_candidates = [
            os.path.join(c, "static"),
            os.path.join(c, "build", "static"),
            os.path.join(c, "build_obf", "static"),
            os.path.join(c, "web", "static"),
            os.path.join(c, "dist", "static")
        ]
        if os.path.isfile(index):
            for s in static_candidates:
                if os.path.isdir(s):
                    # verifica almeno un .js dentro
                    js_files = [f for f in glob.glob(os.path.join(s, "js", "*.js"))]
                    css_files = [f for f in glob.glob(os.path.join(s, "css", "*.css"))]
                    if js_files or css_files:
                        print(f"[TAT] Found front-end build at: {c}")
                        print(f"[TAT] Serving static from: {s}")
                        return c, s
            # se non ho trovato static ma ho index.html comunque ritorno c (fallback)
            print(f"[TAT] Found index.html at {c} but no static/* found there (will still use it)")
            return c, None

    # diagnostica: stampa cosa abbiamo controllato
    print("[TAT] Debug: nessuna build completa trovata. Ho controllato questi percorsi (prima 50):")
    for p in filtered[:50]:
        ok = os.path.isfile(os.path.join(p, "index.html")) or os.path.isdir(os.path.join(p, "static"))
        print(f"  - {p} (index: {'OK' if os.path.isfile(os.path.join(p,'index.html')) else 'MISSING'}, static: {'OK' if os.path.isdir(os.path.join(p,'static')) else 'MISSING'})")
    return None, None

# individuazione build e static al bootstrap
BUILD_DIR, STATIC_DIR = find_build_dir()

@app.route("/api/health", methods=["GET"])
def health():
    return {"status": "ok"}

# ---------- Nuove route dedicate per JS e CSS (diagnostica e affidabili) ----------
@app.route("/static/js/<path:fname>")
def serve_js(fname):
    try:
        js_dir = None
        if STATIC_DIR:
            js_dir = os.path.join(STATIC_DIR, "js")
        if not js_dir and BUILD_DIR:
            js_dir = os.path.join(BUILD_DIR, "static", "js")
        if js_dir:
            full = os.path.join(js_dir, fname)
            print(f"[TAT] serve_js -> trying: {full} (exists: {os.path.isfile(full)})")
            if os.path.isfile(full):
                return send_from_directory(js_dir, fname)
        # fallback: cerca ovunque sotto BUILD_DIR
        if BUILD_DIR:
            for root, dirs, files in os.walk(BUILD_DIR):
                candidate = os.path.join(root, "js", fname)
                if os.path.isfile(candidate):
                    print(f"[TAT] serve_js fallback found: {candidate}")
                    return send_from_directory(os.path.dirname(candidate), fname)
        print(f"[TAT] serve_js NOT FOUND: {fname}")
        abort(404)
    except Exception as e:
        print("[TAT] serve_js error:", e)
        abort(404)

@app.route("/static/css/<path:fname>")
def serve_css(fname):
    try:
        css_dir = None
        if STATIC_DIR:
            css_dir = os.path.join(STATIC_DIR, "css")
        if not css_dir and BUILD_DIR:
            css_dir = os.path.join(BUILD_DIR, "static", "css")
        if css_dir:
            full = os.path.join(css_dir, fname)
            print(f"[TAT] serve_css -> trying: {full} (exists: {os.path.isfile(full)})")
            if os.path.isfile(full):
                return send_from_directory(css_dir, fname)
        # fallback: cerca ovunque sotto BUILD_DIR
        if BUILD_DIR:
            for root, dirs, files in os.walk(BUILD_DIR):
                candidate = os.path.join(root, "css", fname)
                if os.path.isfile(candidate):
                    print(f"[TAT] serve_css fallback found: {candidate}")
                    return send_from_directory(os.path.dirname(candidate), fname)
        print(f"[TAT] serve_css NOT FOUND: {fname}")
        abort(404)
    except Exception as e:
        print("[TAT] serve_css error:", e)
        abort(404)

@app.route("/static/media/<path:fname>")
def serve_media(fname):
    try:
        # preferisci STATIC_DIR se impostata, altrimenti BUILD_DIR/static/media
        media_dir = None
        if STATIC_DIR:
            media_dir = os.path.join(STATIC_DIR, "media")
        if not media_dir and BUILD_DIR:
            media_dir = os.path.join(BUILD_DIR, "static", "media")

        if media_dir:
            full = os.path.join(media_dir, fname)
            print(f"[TAT] serve_media -> trying: {full} (exists: {os.path.isfile(full)})")
            if os.path.isfile(full):
                return send_from_directory(media_dir, fname)

        # fallback: cerca ovunque sotto BUILD_DIR
        if BUILD_DIR:
            for root, dirs, files in os.walk(BUILD_DIR):
                candidate = os.path.join(root, "media", fname)
                print(f"[TAT] serve_media fallback -> trying: {candidate} (exists: {os.path.isfile(candidate)})")
                if os.path.isfile(candidate):
                    return send_from_directory(os.path.dirname(candidate), fname)

        print(f"[TAT] serve_media NOT FOUND: {fname}")
        abort(404)
    except Exception as e:
        print("[TAT] serve_media error:", e)
        abort(404)


# ---------- Route generica /static fallback (mantienila) ----------
@app.route("/static/<path:filename>")
def static_files(filename):
    # 1) primo tentativo: STATIC_DIR definita (dal find_build_dir)
    tried = []
    if 'STATIC_DIR' in globals() and STATIC_DIR:
        path1 = os.path.join(STATIC_DIR, filename)
        tried.append(path1)
        print(f"[TAT] static request -> trying: {path1} (exists: {os.path.isfile(path1)})")
        if os.path.isfile(path1):
            return send_from_directory(STATIC_DIR, filename)

    # 2) fallback sotto BUILD_DIR/static
    if 'BUILD_DIR' in globals() and BUILD_DIR:
        cand = os.path.join(BUILD_DIR, "static", filename)
        tried.append(cand)
        print(f"[TAT] fallback -> trying: {cand} (exists: {os.path.isfile(cand)})")
        if os.path.isfile(cand):
            return send_from_directory(os.path.join(BUILD_DIR, "static"), filename)

    # 3) prova a cercare il file in tutta la gerarchia web
    if 'BUILD_DIR' in globals() and BUILD_DIR:
        for root, dirs, files in os.walk(BUILD_DIR):
            candidate = os.path.join(root, filename)
            tried.append(candidate)
            if os.path.isfile(candidate):
                print(f"[TAT] found file at: {candidate}")
                # serve aprendo il file manualmente con mime type corretto
                ctype, _ = mimetypes.guess_type(candidate)
                with open(candidate, "rb") as fh:
                    data = fh.read()
                return Response(data, mimetype=(ctype or "application/octet-stream"))


    # log completo dei tentativi
    print("[TAT] static NOT FOUND. Tried:")
    for p in tried[:50]:
        print("  -", p)
    # ritorna 404
    return ("", 404)

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_spa(path):
    # se non abbiamo BUILD_DIR
    if not BUILD_DIR:
        return {"error":"Front-end non trovato. Assicurati di aver copiato la build in backend/web"}, 500

    # se il file richiesto esiste relativo a BUILD_DIR, servilo
    requested = os.path.normpath(os.path.join(BUILD_DIR, path))
    if path and os.path.isfile(requested):
        rel = os.path.relpath(requested, BUILD_DIR)
        return send_from_directory(BUILD_DIR, rel)

    # fallback: se abbiamo index.html in BUILD_DIR servilo
    index_path = os.path.join(BUILD_DIR, "index.html")
    if os.path.isfile(index_path):
        return send_from_directory(BUILD_DIR, "index.html")

    # se STATIC_DIR è definita e contiene index.html
    if STATIC_DIR:
        candidate_index = os.path.join(STATIC_DIR, "..", "index.html")
        candidate_index = os.path.normpath(candidate_index)
        if os.path.isfile(candidate_index):
            return send_from_directory(os.path.dirname(candidate_index), os.path.basename(candidate_index))

    return {"error":"Front-end non trovato (after tries)."}, 500

def _open_browser_later(url: str, delay: float = 1.0):
    def _target():
        time.sleep(delay)
        try:
            webbrowser.open(url)
        except Exception:
            pass
    threading.Thread(target=_target, daemon=True).start()

if __name__ == "__main__":
    host = "localhost"
    port = int(os.environ.get("TAT_PORT", 5000))
    print(f"Avvio server Flask su http://{host}:{port}")
    _open_browser_later(f"http://{host}:{port}", delay=1.2)
    app.run(host=host, port=port, debug=False, use_reloader=False)
