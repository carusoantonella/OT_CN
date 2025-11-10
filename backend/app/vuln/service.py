import os, requests
import logging
import requests
from flask import current_app

NVD_API_KEY = os.getenv("NVD_API_KEY")  # imposta in .env o configmap
logger = logging.getLogger(__name__)

def _get_api_key():
     return current_app.config.get("NVD_API_KEY")

def _nvd_request(params):
    base = "https://services.nvd.nist.gov/rest/json/cves/2.0"
    logger.debug("NVD request → URL=%s  params=%s", base, params)
    api_key = _get_api_key()
    hdrs = {"apiKey": api_key} if api_key else {}
    try:
        r = requests.get(base, params=params, headers=hdrs, timeout=10)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.HTTPError as e:
        # logga e restituisci vuoto invece di propagare l’errore
        logger.warning("NVD lookup failed (%s): %s", e.response.status_code, e.response.url)
        return {"vulnerabilities": []}

def query_cves(vendor: str, product: str, version: str):
    """
    Restituisce una lista CVE (id, severity, descrizione) matching vendor/product/version
    """
    params = {
        "keywordSearch": f"{vendor} {version}",
        "resultsPerPage": 20,
    }
    raw = _nvd_request(params)
    out = []
    for item in raw.get("vulnerabilities", []):
        cve = item["cve"]
        cvss = cve.get("metrics", {}).get("cvssMetricV31", [{}])[0].get("cvssData", {})
        out.append({
            "id": cve["id"],
            "severity": cvss.get("baseSeverity", "UNKNOWN"),
            "score": cvss.get("baseScore", "?"),
            "title": cve["descriptions"][0]["value"][:160] + "…",
            "url": f"https://nvd.nist.gov/vuln/detail/{cve['id']}",
        })
    logger.info(
        "query_cves → vendor=%s version=%s  returned %d CVEs",
        vendor,
        version,
        len(out),
    )
    return out
