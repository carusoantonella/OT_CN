// src/utils/auth.js
export const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

export function getToken() {
  return localStorage.getItem("authToken");
}

function base64UrlDecode(str) {
  // JWT usa base64url: -_ invece di +/
  const s = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 === 2 ? "==" : s.length % 4 === 3 ? "=" : "";
  return atob(s + pad);
}
function decodeJwtPayload(token) {
  const [, payload] = token.split(".");
  if (!payload) throw new Error("Invalid JWT");
  return JSON.parse(base64UrlDecode(payload));
}

export function getUser() {
  try {
    const cached = localStorage.getItem("authUser");
    if (cached) return JSON.parse(cached);
  } catch {}

  const t = getToken();
  if (!t) return null;
  try {
    const p = decodeJwtPayload(t);
    const roles = collectRolesFromPayload(p);
    return { id: p.user_id, email: p.email, role: roles[0] || "client", roles };
  } catch {
    return null;
  }
}

// ---- NEW: roles helpers (centralizzati) ----
function collectRolesFromPayload(payload = {}) {
  const candidates = [];
  if (Array.isArray(payload.roles)) candidates.push(...payload.roles);
  if (typeof payload.role === "string") candidates.push(payload.role);
  if (Array.isArray(payload.authorities)) candidates.push(...payload.authorities);
  if (Array.isArray(payload.groups)) candidates.push(...payload.groups);

  if (payload.realm_access?.roles) candidates.push(...payload.realm_access.roles);
  if (payload.resource_access && typeof payload.resource_access === "object") {
    Object.values(payload.resource_access).forEach((ra) => {
      if (Array.isArray(ra?.roles)) candidates.push(...ra.roles);
    });
  }

  if (payload["cognito:groups"]) candidates.push(...[].concat(payload["cognito:groups"]));
  if (payload["custom:roles"]) candidates.push(...[].concat(payload["custom:roles"]));

  // normalizza e pulisci
  let roles = candidates
    .filter(Boolean)
    .map((r) => String(r).trim().toLowerCase())
    .map((r) => r.replace(/^role[_:-]/, "")) // ROLE_ADMIN -> admin
    .map((r) => r.replace(/^roles?[_:-]/, "")); // roles:admin -> admin

  if (roles.length === 0) roles = ["client"];
  return Array.from(new Set(roles));
}

export function getUserRoles() {
  const t = getToken();
  if (!t) return ["client"];
  try {
    const p = decodeJwtPayload(t);
    return collectRolesFromPayload(p);
  } catch {
    return ["client"];
  }
}

/** Ritorna true se l'utente ha almeno uno dei ruoli richiesti (OR, case-insensitive). */
export function userHasAnyRole(required = []) {
  const have = getUserRoles();
  const req = (required || []).map((r) => String(r).trim().toLowerCase());
  return req.length === 0 || req.some((r) => have.includes(r));
}

export function getRole() {
  const roles = getUserRoles();
  return roles[0] || "client";
}

export function authHeaders(extra = {}) {
  const t = getToken();
  return {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...extra,
  };
}
export async function authFetch(url, options = {}) {
  const headers = authHeaders(options.headers || {});
  return fetch(url, { ...options, headers });
}
