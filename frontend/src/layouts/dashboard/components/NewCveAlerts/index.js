import React, { useState, useCallback } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import { API_BASE, authFetch } from "utils/auth";

async function getNewAlerts() {
  const endpoint = `${API_BASE}/vuln/alerts/new?include_details=1&debug=0`;

  const res = await authFetch(endpoint, { method: "GET" });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `HTTP ${res.status}`);
  }

  const json = await res.json();
  return (json?.alerts || []).filter((a) => (a?.new_cve_count || 0) > 0);
}

export { getNewAlerts };

function severityColor(sev) {
  const s = (sev || "").toUpperCase();
  if (s.includes("CRIT")) return "error";
  if (s.includes("HIGH")) return "error";
  if (s.includes("MED")) return "warning";
  if (s.includes("LOW")) return "success";
  return "default";
}

export default function NewCveAlerts() {
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getNewAlerts();
      setAlerts(data);
    } catch (e) {
      setError(e?.message || "Fetch error");
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <Box
      sx={{
        position: "relative",
        p: 2.5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        background: (t) =>
          `linear-gradient(180deg, ${t.palette.background.paper} 0%, ${alpha(
            t.palette.primary.light,
            0.06
          )} 100%)`,
        boxShadow: (t) =>
          `0 8px 24px ${alpha(t.palette.common.black, 0.08)}, inset 0 1px 0 ${alpha(
            t.palette.common.white,
            0.25
          )}`,
        overflow: "hidden",
      }}
    >
      {/* Left accent stripe for the “message bubble” vibe */}
      <Box
        sx={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          bgcolor: (t) => alpha(t.palette.primary.main, 0.9),
        }}
      />

      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
        <Stack direction="row" alignItems="center" gap={1.25}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
              color: "primary.main",
              boxShadow: (t) => `inset 0 0 0 1px ${alpha(t.palette.primary.main, 0.24)}`,
            }}
          >
            <ShieldOutlinedIcon fontSize="small" />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            CVE Updates
          </Typography>
        </Stack>

        <Tooltip title="Recalculate and show only newly added CVEs">
          <span>
            <Button
              onClick={refresh}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : <RefreshRoundedIcon />}
              sx={{
                px: 1.5,
                py: 1,
                fontWeight: 700,
                borderRadius: 2,
                backgroundColor: (t) => alpha(t.palette.primary.main, 0.12),
                color: "primary.main",
                border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.25)}`,
                textTransform: "none",
                transition: "all .15s ease-in-out",
                "&:hover": {
                  backgroundColor: (t) => alpha(t.palette.primary.main, 0.22),
                  transform: "translateY(-1px)",
                },
                "&:active": {
                  backgroundColor: (t) => alpha(t.palette.primary.main, 0.1),
                  transform: "translateY(0)",
                },
                "&.Mui-disabled": {
                  opacity: 0.6,
                },
              }}
            >
              {loading ? "Updating..." : "Refresh CVEs"}
            </Button>
          </span>
        </Tooltip>
      </Stack>

      <Divider sx={{ my: 2 }} />

      {/* Body / Message */}
      {error ? (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      ) : alerts.length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
          No new CVEs right now. Press <strong>Refresh CVEs</strong> to scan for updates.
        </Typography>
      ) : (
        <Stack gap={1.5}>
          {alerts.map((a) => (
            <Box
              key={a.project_id}
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                background: (t) => alpha(t.palette.primary.main, 0.035),
                transition: "background .15s ease-in-out, transform .15s ease-in-out",
                "&:hover": {
                  background: (t) => alpha(t.palette.primary.main, 0.06),
                  transform: "translateY(-1px)",
                },
              }}
            >
              {/* “Text message” line */}
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                <strong>{a.project_name}</strong>{" "}
                <Typography component="span" variant="body2" sx={{ color: "text.secondary" }}>
                  — {a.new_cve_count} new CVE{a.new_cve_count > 1 ? "s" : ""} added
                </Typography>
              </Typography>

              {/* Optional latest list */}
              {Array.isArray(a.latest) && a.latest.length > 0 && (
                <Stack direction="row" flexWrap="wrap" gap={1} mt={1}>
                  {a.latest.map((cve) => (
                    <Chip
                      key={cve.cve_id}
                      clickable
                      component="a"
                      href={`https://www.cve.org/CVERecord?id=${encodeURIComponent(cve.cve_id)}`}
                      target="_blank"
                      rel="noreferrer"
                      label={
                        cve.severity
                          ? `${cve.cve_id} · ${cve.severity}${
                              typeof cve.cvss_score === "number" ? ` ${cve.cvss_score}` : ""
                            }`
                          : cve.cve_id
                      }
                      color={severityColor(cve.severity)}
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        "&:hover": {
                          boxShadow: (t) => `0 0 0 2px ${alpha(t.palette.primary.main, 0.25)}`,
                        },
                      }}
                    />
                  ))}
                </Stack>
              )}
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
