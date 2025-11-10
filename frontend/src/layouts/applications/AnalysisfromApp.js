// src/layouts/applications/AnalysisfromApp.js
/* eslint react/prop-types: 0 */
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
  Box,
  Grid,
  Card,
  Chip,
  IconButton,
  MenuItem,
  Select,
  InputBase,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress";
import { styled, useTheme } from "@mui/material/styles";

import { DataGrid, gridClasses } from "@mui/x-data-grid";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import ComplexStatisticsCard from "examples/Cards/StatisticsCards/ComplexStatisticsCard";

import { API_BASE, authFetch } from "utils/auth";

// ──────────────────────────────────────────────────────────────────────────────
// UI helpers

const severityPalette = {
  Critical: { chip: "#ff1744" },
  High: { chip: "#e53935" },
  Medium: { chip: "#ffb300" },
  Low: { chip: "#29b6f6" },
  Info: { chip: "#26a69a" },
};
const severityOrder = { Critical: 5, High: 4, Medium: 3, Low: 2, Info: 1 };

const HeaderCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: "0 6px 22px rgba(0,0,0,0.08)",
  background:
    theme.palette.mode === "dark"
      ? "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))"
      : "linear-gradient(180deg, #ffffff, #fafafa)",
}));

const GlassToggle = styled(Card)(({ theme }) => ({
  padding: 8,
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  backdropFilter: "blur(6px)",
  border: `1px solid ${theme.palette.divider}`,
  background:
    theme.palette.mode === "dark"
      ? "rgba(255,255,255,0.06)"
      : "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(250,250,250,0.8))",
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
}));

const SearchInput = styled(InputBase)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 10,
  padding: "6px 10px",
  minWidth: 220,
}));

// Normalize severity (strings or from score)
const normalizeSeverity = (sev, score) => {
  if (sev != null) {
    const s = String(sev).trim().toLowerCase();
    if (["critical", "crit"].includes(s)) return "Critical";
    if (s === "high") return "High";
    if (s === "medium" || s === "moderate") return "Medium";
    if (s === "low") return "Low";
    if (["info", "informational", "none", "unknown", "n/a", ""].includes(s)) return "Info";
    // values like "cvss:7.5" or "7.5" → fall back to score parsing below
    const maybeNum = parseFloat(s);
    if (!Number.isNaN(maybeNum)) score = maybeNum;
  }
  const v = parseFloat(score);
  if (!Number.isNaN(v)) {
    if (v >= 9.0) return "Critical";
    if (v >= 7.0) return "High";
    if (v >= 4.0) return "Medium";
    if (v > 0) return "Low";
    return "Info";
  }
  return "Info";
};

// ──────────────────────────────────────────────────────────────────────────────

export default function AnalysisfromApp() {
  const { appId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [app, setApp] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [threats, setThreats] = useState([]);
  const [cves, setCves] = useState([]); // flat list

  const [tab, setTab] = useState("threats"); // "threats" | "cves"
  const [sevFilter, setSevFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [nodeFilter, setNodeFilter] = useState("ALL");

  // Fetch
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await authFetch(
          `${API_BASE}/applications/${appId}?include=threats,edges,nodes,cves`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!alive) return;

        setApp(data);
        const nodesIn = Array.isArray(data.nodes) ? data.nodes : [];
        const edgesIn = Array.isArray(data.edges) ? data.edges : [];
        const threatsIn = Array.isArray(data.threats) ? data.threats : [];
        const cvesIn = Array.isArray(data.cves) ? data.cves : [];

        // infer nodes se mancano
        let nodesOut = [...nodesIn];
        if (nodesOut.length === 0) {
          const inferred = new Set();
          for (const e of edgesIn) {
            if (e.source_node_id_xml) inferred.add(e.source_node_id_xml);
            if (e.target_node_id_xml) inferred.add(e.target_node_id_xml);
          }
          nodesOut = [...inferred].map((id) => ({
            id_xml: id,
            label:
              edgesIn.find((e) => e.source_node_id_xml === id)?.source_label ||
              edgesIn.find((e) => e.target_node_id_xml === id)?.target_label ||
              id,
            metadata: {},
          }));
        }

        setNodes(nodesOut);
        setEdges(edgesIn);
        setThreats(threatsIn);
        setCves(cvesIn);
      } catch (e) {
        setErr(String(e.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [appId]);

  const idToLabel = useMemo(() => {
    const acc = {};
    for (const n of nodes) acc[n.id_xml] = n.label || n.id_xml;
    for (const e of edges) {
      if (e.source_node_id_xml && e.source_label && !acc[e.source_node_id_xml])
        acc[e.source_node_id_xml] = e.source_label;
      if (e.target_node_id_xml && e.target_label && !acc[e.target_node_id_xml])
        acc[e.target_node_id_xml] = e.target_label;
    }
    return acc;
  }, [nodes, edges]);

  // ── KPI COUNTS (dinamici per tab)
  const threatCounts = useMemo(() => {
    const base = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0 };
    for (const t of threats) {
      const sev = normalizeSeverity(t.severity, null);
      base[sev] += 1;
    }
    return base;
  }, [threats]);

  const cveCounts = useMemo(() => {
    const base = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0 };
    for (const c of cves) {
      const sev = normalizeSeverity(c.severity, c.score ?? c.cvss_score);
      base[sev] += 1;
    }
    return base;
  }, [cves]);

  const kpis = tab === "threats" ? threatCounts : cveCounts;

  // ── Threats rows & filters
  const threatsRows = useMemo(() => {
    let rows = threats.map((t, i) => {
      const sev = normalizeSeverity(t.severity, null);
      return {
        id: t.id || `${t.rule_id}-${t.threat_id || i}`,
        name: t.threat_name || t.title || "Threat",
        severity: sev,
        flow: [t.edge_source_label, t.edge_target_label].filter(Boolean).join(" → "),
        description: t.description || "",
        rule_id: t.rule_id || "",
        category: t.category_name || "",
      };
    });

    if (sevFilter !== "All") {
      rows =
        sevFilter === "Info"
          ? rows.filter((r) => !["Critical", "High", "Medium", "Low"].includes(r.severity))
          : rows.filter((r) => r.severity === sevFilter);
    }

    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(s) ||
          r.flow.toLowerCase().includes(s) ||
          r.description.toLowerCase().includes(s) ||
          r.severity.toLowerCase().includes(s)
      );
    }

    rows.sort((a, b) => {
      const oa = severityOrder[a.severity] ?? 0;
      const ob = severityOrder[b.severity] ?? 0;
      if (ob !== oa) return ob - oa;
      return a.name.localeCompare(b.name);
    });

    return rows;
  }, [threats, sevFilter, search]);

  const threatsCols = [
    {
      field: "severity",
      headerName: "Severity",
      minWidth: 120,
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.value}
          sx={{
            fontWeight: 600,
            bgcolor: severityPalette[params.value]?.chip || "grey.500",
            color: "#fff",
          }}
        />
      ),
      sortable: false,
    },
    { field: "name", headerName: "Threat", flex: 1, minWidth: 200 },
    { field: "flow", headerName: "Flow", flex: 1, minWidth: 200 },
    { field: "description", headerName: "Description", flex: 1.5, minWidth: 260 },
  ];

  // ── CVE rows & filters
  const nodeOptions = useMemo(() => ["ALL", ...Object.keys(idToLabel)], [idToLabel]);

  const cveRows = useMemo(() => {
    let rows = (cves || []).map((c, i) => {
      const sev = normalizeSeverity(c.severity, c.score ?? c.cvss_score);
      return {
        id: `${c.id}-${i}`,
        cve: c.id,
        severity: sev,
        score: c.score ?? c.cvss_score ?? null,
        node: idToLabel[c.node_id_xml] || c.node_id_xml || "—",
        node_id: c.node_id_xml || "",
        title: c.title || "",
        url: c.url || "",
      };
    });

    if (sevFilter !== "All") {
      rows =
        sevFilter === "Info"
          ? rows.filter((r) => !["Critical", "High", "Medium", "Low"].includes(r.severity))
          : rows.filter((r) => r.severity === sevFilter);
    }

    if (nodeFilter !== "ALL") rows = rows.filter((r) => r.node_id === nodeFilter);

    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.cve || "").toLowerCase().includes(s) ||
          (r.title || "").toLowerCase().includes(s) ||
          (r.node || "").toLowerCase().includes(s) ||
          (r.severity || "").toLowerCase().includes(s)
      );
    }

    rows.sort((a, b) => parseFloat(b.score || 0) - parseFloat(a.score || 0));
    return rows;
  }, [cves, idToLabel, nodeFilter, search, sevFilter]);

  const cveCols = [
    { field: "cve", headerName: "CVE", minWidth: 130 },
    {
      field: "severity",
      headerName: "Severity",
      minWidth: 120,
      renderCell: (p) => (
        <Chip
          size="small"
          label={p.value}
          sx={{
            fontWeight: 600,
            bgcolor: severityPalette[p.value]?.chip || "grey.500",
            color: "#fff",
          }}
        />
      ),
      sortable: false,
    },
    {
      field: "score",
      headerName: "Score",
      minWidth: 90,
      type: "number",
      align: "center",
      headerAlign: "center",
    },
    { field: "node", headerName: "Node", minWidth: 200, flex: 1 },
    { field: "title", headerName: "Summary", minWidth: 260, flex: 1.5 },
    {
      field: "url",
      headerName: "",
      minWidth: 60,
      renderCell: (p) =>
        p.value ? (
          <Tooltip title="Open advisory" arrow>
            <IconButton size="small" component="a" href={p.value} target="_blank" rel="noreferrer">
              <Icon fontSize="small">open_in_new</Icon>
            </IconButton>
          </Tooltip>
        ) : null,
      sortable: false,
      filterable: false,
      align: "center",
      headerAlign: "center",
    },
  ];

  // ────────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox sx={{ py: 6, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }
  if (err) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox sx={{ py: 6, maxWidth: 960, mx: "auto" }}>
          <MDBox display="flex" alignItems="center" gap={1}>
            <Icon color="error">error</Icon>
            <MDTypography variant="h6" color="error">
              {err}
            </MDTypography>
          </MDBox>
          <MDButton sx={{ mt: 2 }} variant="gradient" color="dark" onClick={() => navigate(-1)}>
            Back
          </MDButton>
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <DashboardNavbar />

      {/* FULL-WIDTH / FULL-HEIGHT WRAPPER */}
      <MDBox
        sx={{
          px: 3,
          pb: 2,
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          width: "100%",
          alignSelf: "stretch",
        }}
      >
        {/* Header */}
        <HeaderCard sx={{ p: 2, mb: 2 }}>
          <MDBox display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
            <MDButton
              variant="outlined"
              color="dark"
              startIcon={<Icon>arrow_back</Icon>}
              onClick={() => navigate("/applications")}
              sx={{ borderRadius: 2 }}
            >
              Applications
            </MDButton>

            <MDTypography variant="h6" sx={{ fontWeight: 700 }}>
              Security Analysis
            </MDTypography>

            <MDTypography
              variant="body2"
              color="text.secondary"
              sx={{ ml: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
              title={`Application: ${app?.name || appId}`}
            >
              · {app?.name || appId}
            </MDTypography>

            <Box sx={{ flex: 1 }} />

            <Tooltip title="Export (coming soon)">
              <span>
                <MDButton
                  variant="outlined"
                  color="dark"
                  disabled
                  startIcon={<Icon>download</Icon>}
                >
                  Export
                </MDButton>
              </span>
            </Tooltip>
          </MDBox>
        </HeaderCard>

        {/* Segmented control moderno (sopra i KPI) */}
        <MDBox sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <GlassToggle>
            <ToggleButtonGroup
              color="primary"
              value={tab}
              exclusive
              onChange={(_e, v) => v && setTab(v)}
              sx={{
                "& .MuiToggleButton-root": {
                  textTransform: "none",
                  fontWeight: 600,
                  px: 2.5,
                  border: "none",
                  borderRadius: 999,
                },
              }}
            >
              <ToggleButton value="threats">
                <Icon fontSize="small" sx={{ mr: 1 }}>
                  security
                </Icon>
                Threats
              </ToggleButton>
              <ToggleButton value="cves">
                <Icon fontSize="small" sx={{ mr: 1 }}>
                  bug_report
                </Icon>
                CVE
              </ToggleButton>
            </ToggleButtonGroup>
          </GlassToggle>
        </MDBox>

        {/* KPI row (stile ComplexStatisticsCard, dinamici per tab) */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {[
            { label: "Critical", color: "primary", icon: "priority_high" },
            { label: "High", color: "error", icon: "error" },
            { label: "Medium", color: "warning", icon: "warning" },
            { label: "Low", color: "info", icon: "security" },
            { label: "Info", color: "success", icon: "info" },
          ].map(({ label, color, icon }) => (
            <Grid item xs={6} sm={4} md={2.4} key={label}>
              <MDBox
                onClick={() => setSevFilter(label)}
                sx={{
                  cursor: "pointer",
                  transition: "transform 0.15s ease, box-shadow .2s",
                  "&:hover": {
                    transform: "translateY(-3px)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  },
                  height: 120,
                  display: "flex",
                  alignItems: "stretch",
                  "& > .MuiCard-root": {
                    height: "100%",
                    display: "flex",
                    flex: 1,
                    flexDirection: "column",
                    justifyContent: "space-between",
                  },
                }}
              >
                <ComplexStatisticsCard
                  color={color}
                  icon={icon}
                  title={<MDTypography sx={{ fontSize: "1.1rem" }}>{label}</MDTypography>}
                  count={
                    <MDTypography variant="h3" sx={{ fontWeight: 800 }}>
                      {kpis[label] || 0}
                    </MDTypography>
                  }
                  percentage={{ color: "", amount: "" }}
                />
              </MDBox>
            </Grid>
          ))}
        </Grid>

        {/* Toolbar: filtri */}
        <Card sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
          <MDBox display="flex" gap={1} alignItems="center" flexWrap="wrap">
            {/* severity chips */}
            {["All", "Critical", "High", "Medium", "Low", "Info"].map((s) => (
              <Chip
                key={s}
                label={s}
                onClick={() => setSevFilter(s)}
                color={sevFilter === s ? "primary" : "default"}
                variant={sevFilter === s ? "filled" : "outlined"}
                sx={{ height: 28 }}
              />
            ))}

            <Box sx={{ flex: 1 }} />

            {/* node select (solo per CVE) */}
            {tab === "cves" && (
              <Select
                size="small"
                value={nodeFilter}
                onChange={(e) => setNodeFilter(e.target.value)}
                sx={{ minWidth: 220, borderRadius: 2 }}
              >
                {["ALL", ...Object.keys(idToLabel)].map((id) => (
                  <MenuItem key={id} value={id === "ALL" ? "ALL" : id}>
                    {id === "ALL" ? "All nodes" : `${idToLabel[id] || id}`}
                  </MenuItem>
                ))}
              </Select>
            )}

            {/* search */}
            <SearchInput
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              startAdornment={<Icon fontSize="small">search</Icon>}
            />
          </MDBox>
        </Card>

        {/* CONTENUTO ESPANDIBILE */}
        <MDBox sx={{ flex: 1, minHeight: 0, display: "flex" }}>
          {tab === "threats" ? (
            <Card
              sx={{
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ flex: 1, minHeight: 0, height: "100%", width: "100%" }}>
                <DataGrid
                  rows={threatsRows}
                  columns={threatsCols}
                  density="compact"
                  disableRowSelectionOnClick
                  sx={{
                    [`& .${gridClasses.cell}`]: { outline: "none" },
                    [`& .${gridClasses.columnHeader}`]: { fontWeight: 700 },
                  }}
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                />
              </div>
            </Card>
          ) : (
            <Card
              sx={{
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ flex: 1, minHeight: 0, height: "100%", width: "100%" }}>
                <DataGrid
                  rows={cveRows}
                  columns={cveCols}
                  density="compact"
                  disableRowSelectionOnClick
                  sx={{
                    [`& .${gridClasses.cell}`]: { outline: "none" },
                    [`& .${gridClasses.columnHeader}`]: { fontWeight: 700 },
                  }}
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                />
              </div>
            </Card>
          )}
        </MDBox>
      </MDBox>

      <Footer />
    </DashboardLayout>
  );
}
