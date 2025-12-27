// src/layouts/newproject/Review.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMaterialUIController } from "context";
import { API_BASE, authFetch } from "utils/auth";
import { Container, Box, Paper, Typography } from "@mui/material";
import WorkflowStepper from "./WorkflowStepper";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

import ComplexStatisticsCard from "examples/Cards/StatisticsCards/ComplexStatisticsCard";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import SecurityIcon from "@mui/icons-material/Security";
import BugReportIcon from "@mui/icons-material/BugReport";
import { Bar } from "react-chartjs-2";

import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";
import Chip from "@mui/material/Chip";
import CardContent from "@mui/material/CardContent";
import { useTheme } from "@mui/material/styles";
import { FaDownload } from "react-icons/fa";
import { buildThreatModelPdf } from "./utils/PdfExporter";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Checkbox from "@mui/material/Checkbox";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import LightModeIcon from "@mui/icons-material/LightMode";
import downloadCompletedWebm from "assets/images/download_completed.webm";
import { useParams } from "react-router-dom";
// WebM for step 0 (Project Info)
import AnalysisWebm from "assets/images/Analysis.webm";

Chart.register(ChartDataLabels);

export default function Analysis() {
  const ANALYSIS_LIST_PATH = "/applications";
  const navigate = useNavigate();
  const theme = useTheme();
  const [openExportDialog, setOpenExportDialog] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState({
    pdf: true,
    docx: false,
    xlsx: false,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [exportCompleted, setExportCompleted] = useState(false);
  const [controller] = useMaterialUIController();
  const { wizardData: state = {} } = controller;
  // prendo i threat e i nodes passati nello state
  const detected = state.detected || [];
  const nodes = state.nodes || [];
  const diagramXml = state.diagramXml || "";
  const diagramImage = state.diagramImage || "";
  const [croppedImg, setCroppedImg] = useState("");
  const cveMap = state.cveMap || {};

  const nodesWithCVEs = nodes.filter((n) => (cveMap[n.id] || []).length > 0);
  const [section, setSection] = useState(0);
  const [detail, setDetail] = useState({ nodeId: null, severity: null });
  // mappa id → label per ricavare le label originali
  const idToLabel = Object.fromEntries(nodes.map((n) => [n.id, n.label ?? n.data?.label ?? n.id]));
  const enrichedCves = Object.entries(cveMap).flatMap(([nodeId, list]) => {
    const node = nodes.find((n) => n.id === nodeId) || {};
    const label = idToLabel[nodeId] || nodeId;
    const version = node.metadata?.version || "";
    return list.map((c) => ({
      ...c,
      label,
      version,
    }));
  });

  const node_catalog = (state.nodes || [])
    .filter((n) => (n.nature || n.metadata?.nature) !== "group")
    .map((n) => {
      const meta = n.metadata || {};
      // NB: NON forniamo generic_node_id dal FE (così non tocchiamo logica esistente):
      //     passiamo chiavi utili per la risoluzione backend (nature/elementTypeName/iconName)
      return {
        node_id_xml: n.id,
        label: n.label,
        nature: n.nature || meta.nature || "generic",
        elementTypeName: meta.nature || n.nature || undefined, // usata dal backend per mappare GenericNode
        iconName: meta.iconName || meta.icon_name || undefined, // fallback utile
        security_props: n.displayMetadata || {}, // proprietà visibili lato FE
      };
    });

  // ─── Crop client-side di diagramImage (rimuove toolbar in alto e sidebar a sinistra) ───
  useEffect(() => {
    if (!diagramImage) return;
    const img = new Image();
    img.onload = () => {
      // Regola questi valori in px in base ai tuoi elementi UI
      const cropLeft = 30; // px da tagliare a sinistra
      const cropTop = 150; // px da tagliare in alto
      const cropRight = 20; // px da tagliare a destra
      const cropBottom = 40; // px da tagliare in basso

      const w = img.width - cropLeft - cropRight;
      const h = img.height - cropTop - cropBottom;
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const ctx = off.getContext("2d");

      // Disegna solo l’area interna al crop
      ctx.drawImage(
        img,
        cropLeft,
        cropTop, // x,y di inizio ritaglio
        w,
        h, // w,h di sorgente
        0,
        0, // x,y destinazione
        w,
        h // w,h destinazione
      );

      setCroppedImg(off.toDataURL("image/png"));
    };

    img.src = diagramImage;
  }, [diagramImage]);

  const handleFormatChange = (format) => {
    setSelectedFormats((prev) => ({ ...prev, [format]: !prev[format] }));
  };

  const handleExport = () => {
    if (!selectedFormats.pdf) return;
    console.log("DEBUG — wizardData.nodes:", nodes);
    buildThreatModelPdf({
      appName: state?.projectInfo?.name,
      creationDate: new Date().toLocaleDateString("it-IT"),
      registryInfo: {
        "ID progetto": state?.projectInfo?.id,
        "Nome progetto": state?.projectInfo?.name,
        Descrizione: state?.projectInfo?.description,
        Referente: state?.projectInfo?.referent,
      },
      diagramImage: croppedImg || diagramImage,
      diagramXml,
      objects: nodes,
      edges: state?.edges || [],
      groups: state?.groups || [],
      threatSchema: detected,
      detectedCve: enrichedCves,
      remediationPlan: [],
    });
  };

  // Costruisco il payload per il backend, come fai in VerifyObjects prima del fetch
  // Solo minacce + cve: il progetto è già stato creato in App.jsx
  const buildAnalysisPayload = () => {
    const threats = (detected || []).map((t) => ({
      rule_id: t.rule_id,
      threat_id: t.threat_id || t.threatId || t.id,
      // manda sia title che threat_name per massima compatibilità
      title: t.threat_name || t.title || t.rule_name || "",
      threat_name: t.threat_name, // opzionale

      severity: t.severity || "Info",
      description: t.description || t.reason || "",
      mitigation: t.possible_mitigation || t.mitigation || "",

      // NUOVO: passa le label degli edge
      edge_source_label: t.edge_source_label || t.source_label,
      edge_target_label: t.edge_target_label || t.target_label,
    }));

    // CVE: node_id_xml (NON node_id)
    const cves = Object.entries(cveMap || {}).flatMap(([nodeId, list]) =>
      (list || []).map((c) => ({
        node_id_xml: nodeId,
        cve_id: c.id || c.cve || "",
        cvss_score: Number(c.score ?? c.cvss_score ?? 0) || null,
        severity: c.severity || "",
        summary: c.title || c.summary || c.description || "",
        published: c.published || c.publishedDate || c.lastModified || null,
      }))
    );

    return { threats, cves };
  };

  const saveAnalysisAndExport = () => {
    setSaveError("");
    setSaving(true);

    const { threats, cves } = buildAnalysisPayload();

    // Se abbiamo già projectId (creato in App.jsx), usiamo l'endpoint /analysis

    const projectId = state.projectId;
    if (!projectId) {
      setSaving(false);
      return;
    }
    const endpoint = `${API_BASE}/newproject/${projectId}/analysis`;
    const body = {
      project_id: projectId,
      threats,
      cves,
      node_catalog,
    };
    authFetch(endpoint, {
      method: "POST",
      body: JSON.stringify({
        ...body,
        node_catalog,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(() => {})
      .catch((err) => {
        console.error("Errore salvataggio analisi:", err);
        setSaveError(String(err.message || err));
      })
      .finally(() => setSaving(false));
  };

  // Normalizza la severità in un set chiuso di valori
  const normSeverity = (s) => {
    const val = (s || "").toString().trim().toLowerCase();

    if (!val) return "Info"; // default

    if (val === "critical") return "Critical";
    if (val === "high") return "High";
    if (val === "medium" || val === "med") return "Medium";
    if (val === "low") return "Low";
    if (val === "info" || val === "informational") return "Info";

    // fallback: tutto ciò che non è tra i precedenti viene considerato Info
    return "Info";
  };

  const isInfoSeverity = (s) => normSeverity(s) === "Info";

  // Ordine di severità per sorting
  const severityOrder = {
    Critical: 5,
    High: 4,
    Medium: 3,
    Low: 2,
    Info: 1,
  };

  // Versione normalizzata dei threat (aggiungiamo severityNorm)
  const detectedNorm = (detected || []).map((t) => ({
    ...t,
    severityNorm: normSeverity(t.severity),
  }));

  // Ordino per severità normalizzata
  const sorted = [...detectedNorm].sort((a, b) => {
    const oa = severityOrder[a.severityNorm] ?? 0;
    const ob = severityOrder[b.severityNorm] ?? 0;
    return ob - oa;
  });

  // calcolo dei conteggi per ciascuna gravità (usando severityNorm)
  const criticalCount = detectedNorm.filter((t) => t.severityNorm === "Critical").length;
  const highCount = detectedNorm.filter((t) => t.severityNorm === "High").length;
  const mediumCount = detectedNorm.filter((t) => t.severityNorm === "Medium").length;
  const lowCount = detectedNorm.filter((t) => t.severityNorm === "Low").length;
  const infoCount = detectedNorm.filter((t) => t.severityNorm === "Info").length;

  // state per severità selezionata (All, High, Medium, Low, Info)
  const [selectedSeverity, setSelectedSeverity] = useState("All");

  // elenco filtrato in base a selectedSeverity (sempre usando severityNorm)
  const filtered =
    selectedSeverity === "All"
      ? sorted
      : sorted.filter((t) => {
          const sev = t.severityNorm;
          if (selectedSeverity === "Info") {
            return sev === "Info"; // stessa logica usata per infoCount
          }
          return sev === selectedSeverity; // Critical/High/Medium/Low
        });

  // Palette colori full‐background per severity
  const severityStyles = {
    Critical: { backgroundColor: "#ffb4bb" }, // ex-High → Critical (rosso scuro)
    High: { backgroundColor: "#ffcdd2" }, // ex-Medium → High (rosso chiaro)
    Medium: { backgroundColor: "#fffde7" }, // ex-Low    → Medium (giallo chiaro)
    Low: { backgroundColor: "#e3f2fd" }, // nuovo Low  → azzurrino chiaro
    Info: { backgroundColor: "#e8f5e9" }, // Info       → verdino chiaro
    default: { backgroundColor: "#f5f5f5" },
  };
  const severityBorder = {
    Critical: "4px solid #f80000",
    High: "4px solid #f44336",
    Medium: "4px solid #ffeb3b",
    Low: "4px solid #90caf9",
    Info: "4px solid #66bb6a",
    default: "4px solid #bdbdbd",
  };

  const severityLabels = Object.keys(severityOrder);

  const nodeCveCounts = Object.entries(cveMap).map(([nodeId, list]) => {
    const counts = severityLabels.map(
      (lvl) => list.filter((c) => c.severity?.toLowerCase() === lvl.toLowerCase()).length
    );
    const node = nodes.find((n) => n.id === nodeId) || {};
    const metadata = node.metadata ?? node.data?.metadata ?? {};
    const label = node.label ?? node.data?.label ?? nodeId;
    return {
      id: nodeId,
      label,
      metadata,
      counts,
    };
  });

  const handleBarClick = (nodeId, severity) => {
    setDetail({ nodeId, severity });
  };

  const handleCardClick = (nodeId) => {
    setDetail({ nodeId, severity: null });
  };

  return (
    <Container
      disableGutters
      maxWidth={false}
      sx={{
        width: "100% !important",
        maxWidth: "100% !important",
        display: "flex",
        flexDirection: "column",
        height: "87vh",
        pt: 2,
        pb: 2,
        px: 3,
      }}
    >
      {/* ─── Stepper Sticky + Bottoni Avanti/Indietro ───────────────────── */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1100,
          backgroundColor: "background.paper",
          pb: 2,
        }}
      >
        <WorkflowStepper
          activeStep={3}
          helperMediaPerStep={[
            {}, // step 0
            {}, // step 1
            {}, // step 2
            { webm: AnalysisWebm }, // step 3
          ]}
          mediaSize={100}
        />
        <Box
          display="flex"
          justifyContent="flex-end"
          alignItems="center"
          mt={-6.5}
          sx={{
            transform: "scale(0.97)",
            transformOrigin: "top center",
          }}
        >
          <MDButton
            variant="gradient"
            color="dark"
            onClick={() => {
              saveAnalysisAndExport();
              setOpenExportDialog(true);
            }}
            disabled={saving}
          >
            {saving ? "Exporting..." : "Download"}
          </MDButton>

          {saveError && (
            <MDTypography color="error" sx={{ ml: 2 }}>
              {saveError}
            </MDTypography>
          )}
        </Box>
      </Box>
      {/* ─── Header Orizzontale Compatto ───────────────────────────────────────────── */}
      <Card
        elevation={4}
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          width: "100%",
          maxWidth: "100%",
          p: 2,
          mb: 3,
          background: "linear-gradient(90deg, #f5f5f5 0%, #fafafa 100%)",
          border: "1px solid",
          borderColor: "grey.300",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          borderRadius: 3,
        }}
      >
        {/* Titolo */}
        <MDTypography variant="h6" sx={{ fontWeight: 500, mr: 2, whiteSpace: "nowrap" }}>
          SECURITY ANALYSIS
        </MDTypography>

        {/* Accent bar verticale */}
        <Box
          component="span"
          sx={{
            width: 4,
            height: 40,
            bgcolor: "primary.main",
            borderRadius: 1,
            mr: 2,
          }}
        />

        {/* Descrizione */}
        <MDTypography
          variant="body2"
          color="text.secondary"
          sx={{
            flex: 1,
            lineHeight: 1.4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title="The Threats section summarizes the risks detected across the diagram and flows, categorized by severity level, while the CVE Notes section lists known vulnerabilities (CVEs) associated with the identified assets"
        >
          The Threats section summarizes the risks detected across the diagram and flows,
          categorized by severity level, while the CVE Notes section lists known vulnerabilities
          (CVEs) associated with the identified assets
        </MDTypography>
      </Card>
      {/* ─── Switch Sezione: Threats vs Vulnerabilità ───────────── */}
      <MDBox display="flex" justifyContent="center" gap={2} mb={4}>
        <MDButton
          variant={section === 0 ? "gradient" : "outlined"}
          color="dark"
          startIcon={<SecurityIcon />}
          onClick={() => setSection(0)}
        >
          Threats
        </MDButton>
        <MDButton
          variant={section === 1 ? "gradient" : "outlined"}
          color="dark"
          startIcon={<BugReportIcon />}
          onClick={() => setSection(1)}
        >
          CVE Note
        </MDButton>
      </MDBox>
      {/* ─── Complesso di statistiche in alto ─────────────────────────────── */}
      {section === 0 && (
        <MDBox mb={3}>
          <Grid container spacing={3} columns={{ xs: 2, sm: 4, md: 5 }}>
            <Grid item xs={2} sm={2} md={1}>
              <MDBox
                mb={1.5}
                sx={{
                  cursor: "pointer",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0px 4px 20px rgba(0,0,0,0.12)",
                  },
                  height: 120, // ← fissa un’altezza uguale per tutte
                  display: "flex", // ← imposta layout flex
                  alignItems: "stretch", // ← fa sì che il figlio Card si estenda verticalmente
                  "& > .MuiCard-root": {
                    // ← targetta il Card interno generato da ComplexStatisticsCard
                    height: "100%", // → occuperà tutta l’altezza del wrapper
                    display: "flex",
                    flex: 1,
                    flexDirection: "column",
                    justifyContent: "space-between", // → spinge header e descrizione agli estremi
                  },
                }}
                onClick={() => setSelectedSeverity("Critical")}
              >
                <ComplexStatisticsCard
                  color="primary" // rosso scuro per Critical
                  icon="priority_high" // puoi cambiare icona
                  title={<MDTypography sx={{ fontSize: "1.2rem" }}>Critical</MDTypography>}
                  count={
                    <Typography
                      variant="h1" // h2 è più grande di default
                      sx={{ fontWeight: 800 }} // grassetto
                    >
                      {criticalCount}
                    </Typography>
                  }
                  percentage={{
                    color: "",
                    amount: "",
                  }}
                />
              </MDBox>
            </Grid>
            <Grid item xs={2} sm={2} md={1}>
              <MDBox
                mb={1.5}
                sx={{
                  cursor: "pointer",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0px 4px 20px rgba(0,0,0,0.12)",
                  },
                  height: 120, // ← fissa un’altezza uguale per tutte
                  display: "flex", // ← imposta layout flex
                  alignItems: "stretch", // ← fa sì che il figlio Card si estenda verticalmente
                  "& > .MuiCard-root": {
                    // ← targetta il Card interno generato da ComplexStatisticsCard
                    height: "100%", // → occuperà tutta l’altezza del wrapper
                    display: "flex",
                    flex: 1,
                    flexDirection: "column",
                    justifyContent: "space-between", // → spinge header e descrizione agli estremi
                  },
                }}
                onClick={() => setSelectedSeverity("High")}
              >
                <ComplexStatisticsCard
                  color="error" // rosso per High
                  icon="error" // icona “error”
                  title={<MDTypography sx={{ fontSize: "1.2rem" }}>High</MDTypography>}
                  count={
                    <Typography
                      variant="h1" // h2 è più grande di default
                      sx={{ fontWeight: 700 }} // grassetto
                    >
                      {highCount}
                    </Typography>
                  }
                  percentage={{
                    color: selectedSeverity === "High" ? "info" : "secondary",
                    amount: "",
                  }}
                />
              </MDBox>
            </Grid>
            <Grid item xs={2} sm={2} md={1}>
              <MDBox
                mb={1.5}
                sx={{
                  cursor: "pointer",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0px 4px 20px rgba(0,0,0,0.12)",
                  },
                  height: 120, // ← fissa un’altezza uguale per tutte
                  display: "flex", // ← imposta layout flex
                  alignItems: "stretch", // ← fa sì che il figlio Card si estenda verticalmente
                  "& > .MuiCard-root": {
                    // ← targetta il Card interno generato da ComplexStatisticsCard
                    height: "100%", // → occuperà tutta l’altezza del wrapper
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between", // → spinge header e descrizione agli estremi
                  },
                }}
                onClick={() => setSelectedSeverity("Medium")}
              >
                <ComplexStatisticsCard
                  color="warning" // arancione per Medium
                  icon="warning" // icona “warning”
                  title={<MDTypography sx={{ fontSize: "1.2rem" }}>Medium</MDTypography>}
                  count={
                    <Typography
                      variant="h1" // h2 è più grande di default
                      sx={{ fontWeight: 700 }} // grassetto
                    >
                      {mediumCount}
                    </Typography>
                  }
                  percentage={{
                    color: selectedSeverity === "Medium" ? "info" : "secondary",
                    amount: "",
                  }}
                />
              </MDBox>
            </Grid>
            <Grid item xs={2} sm={2} md={1}>
              <MDBox
                mb={1.5}
                sx={{
                  cursor: "pointer",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0px 4px 20px rgba(0,0,0,0.12)",
                  },
                  height: 120, // ← fissa un’altezza uguale per tutte
                  display: "flex", // ← imposta layout flex
                  alignItems: "stretch", // ← fa sì che il figlio Card si estenda verticalmente
                  "& > .MuiCard-root": {
                    // ← targetta il Card interno generato da ComplexStatisticsCard
                    height: "100%", // → occuperà tutta l’altezza del wrapper
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between", // → spinge header e descrizione agli estremi
                  },
                }}
                onClick={() => setSelectedSeverity("Low")}
              >
                <ComplexStatisticsCard
                  color="info"
                  icon="security"
                  title={<MDTypography sx={{ fontSize: "1.2rem" }}>Low</MDTypography>}
                  count={
                    <Typography
                      variant="h1" // h2 è più grande di default
                      sx={{ fontWeight: 700 }} // grassetto
                    >
                      {lowCount}
                    </Typography>
                  }
                  percentage={{
                    color: selectedSeverity === "Low" ? "info" : "secondary",
                    amount: "",
                  }}
                />
              </MDBox>
            </Grid>
            <Grid item xs={2} sm={2} md={1}>
              <MDBox
                mb={1.5}
                sx={{
                  cursor: "pointer",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0px 4px 20px rgba(0,0,0,0.12)",
                  },
                  height: 120, // ← fissa un’altezza uguale per tutte
                  display: "flex", // ← imposta layout flex
                  alignItems: "stretch", // ← fa sì che il figlio Card si estenda verticalmente
                  "& > .MuiCard-root": {
                    // ← targetta il Card interno generato da ComplexStatisticsCard
                    height: "100%", // → occuperà tutta l’altezza del wrapper
                    display: "flex",
                    flex: 1,
                    flexDirection: "column",
                    justifyContent: "space-between", // → spinge header e descrizione agli estremi
                  },
                }}
                onClick={() => setSelectedSeverity("Info")}
              >
                <ComplexStatisticsCard
                  color="success"
                  icon="info" // icona “info”
                  title={<MDTypography sx={{ fontSize: "1.2rem" }}>Info</MDTypography>}
                  count={
                    <Typography
                      variant="h1" // h2 è più grande di default
                      sx={{ fontWeight: 500 }} // grassetto
                    >
                      {infoCount}
                    </Typography>
                  }
                  percentage={{
                    color: selectedSeverity === "Info" ? "info" : "secondary",
                    amount: "",
                  }}
                />
              </MDBox>
            </Grid>
          </Grid>
        </MDBox>
      )}
      {/* ─── Elenco verticale full‐width ─────────────────────────────────── */}
      {section === 0 && (
        <MDBox
          key={selectedSeverity}
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            height: "75vh",
            px: 2,
            py: 1,
            // ⬇️ da qui: griglia responsive 1 colonna (xs) / 2 colonne (sm+)
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
            alignContent: "start",
          }}
        >
          {filtered.length === 0 ? (
            <MDTypography variant="body1" color="text" textAlign="center">
              Nessuna minaccia individuata per “{selectedSeverity}”.
            </MDTypography>
          ) : (
            filtered.map((t) => {
              const sev = t.severityNorm || normSeverity(t.severity);
              const bgStyle = severityStyles[sev] || severityStyles.default;
              const borderStyle = severityBorder[sev] || severityBorder.default;
              const categoryLabel = t.category_name || t.category || t.threat_category || "-";
              const sourceLabel =
                idToLabel[t.edge_source_label] ||
                idToLabel[t.source_payload_id] || // fallback se usi i nuovi campi debug
                t.edge_source_label ||
                t.source_payload_id ||
                "-";

              const targetLabel =
                idToLabel[t.edge_target_label] ||
                idToLabel[t.target_payload_id] ||
                t.edge_target_label ||
                t.target_payload_id ||
                "-";

              const mitigationText =
                t.possible_mitigation || t.possibleMitigation || t.mitigation || "";
              const ruleId = t.rule_id || t.ruleId || "-";
              const threatid = t.threat_id || t.threatId || "-";
              return (
                <Paper
                  key={`${t.rule_id}-${t.threat_id}`}
                  elevation={3}
                  sx={{
                    ...bgStyle,
                    borderLeft: borderStyle,
                    p: 2,
                    borderRadius: 1,
                    width: "100%",
                  }}
                >
                  {/* Titolo + Badge severity */}
                  <MDBox display="flex" alignItems="center" mb={1}>
                    <MDTypography variant="h6" sx={{ flexGrow: 1 }}>
                      {t.threat_name}
                    </MDTypography>
                    <MDTypography
                      variant="subtitle2"
                      sx={{
                        backgroundColor:
                          sev === "Critical"
                            ? "#f80000"
                            : sev === "High"
                            ? "#f44336"
                            : sev === "Medium"
                            ? "#ffeb3b"
                            : sev === "Low"
                            ? "#90caf9"
                            : sev === "Info"
                            ? "#66bb6a"
                            : "#bdbdbd",
                        color: "#fff",
                        px: 1,
                        py: 0.25,
                        borderRadius: "4px",
                        textTransform: "uppercase",
                        fontSize: "0.75rem",
                      }}
                    >
                      {sev}
                    </MDTypography>
                  </MDBox>
                  <MDTypography variant="body2" color="text" sx={{ mt: 0.5 }}>
                    <strong>Rule ID:</strong> {ruleId}
                  </MDTypography>
                  <MDTypography variant="body2" color="text" sx={{ mt: 0.5 }}>
                    <strong>Threat ID:</strong> {threatid}
                  </MDTypography>
                  <MDTypography variant="body2" color="text" sx={{ mt: 0.5 }}>
                    <strong>Source:</strong> {sourceLabel}
                  </MDTypography>

                  <MDTypography variant="body2" color="text">
                    <strong>Target:</strong> {targetLabel}
                  </MDTypography>

                  {/* Categoria */}
                  <MDTypography variant="body2" color="text">
                    <strong>Categoria:</strong> {categoryLabel}
                  </MDTypography>

                  {/* Descrizione */}
                  <MDTypography variant="body2" color="text" sx={{ mt: 1 }}>
                    {t.description}
                  </MDTypography>
                  {mitigationText && (
                    <MDTypography variant="body2" color="text" sx={{ mt: 1 }}>
                      <strong>Mitigation:</strong> {mitigationText}
                    </MDTypography>
                  )}
                </Paper>
              );
            })
          )}
        </MDBox>
      )}
      {section === 1 && (
        <>
          <MDBox
            sx={{
              position: "sticky",
              top: 190, // regola in base all’altezza di header+toggle
              backgroundColor: "transparent",
              zIndex: 1100,
              pb: 2,
            }}
          >
            {/* titolo */}
            <Grid container spacing={3} justifyContent="center">
              {nodeCveCounts.map(({ id, label, metadata, counts }) => (
                <Grid item xs={12} sm={6} md={4} key={id}>
                  <Card
                    elevation={3}
                    onClick={() => handleCardClick(id)} // ← click sulla card
                    sx={{
                      cursor: "pointer",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      mx: "auto",
                    }}
                  >
                    {/* Header con label e badge numero CVE */}
                    <CardContent
                      sx={{
                        pb: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: "#F0F8FF",
                      }}
                    >
                      <MDBox>
                        {/* Titolo della card: label del nodo */}
                        <MDTypography variant="h6" gutterBottom>
                          {label}
                        </MDTypography>
                        {/* Qui mostriamo vendor e version in modo un po’ più leggibile */}
                        {(metadata.vendor || metadata.version) && (
                          <MDTypography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {metadata.vendor && `${metadata.vendor}`}
                            {metadata.vendor && metadata.version && " · "}
                            {metadata.version && `v${metadata.version}`}
                          </MDTypography>
                        )}
                      </MDBox>
                      <Chip
                        label={`${counts.reduce((sum, v) => sum + v, 0)} CVE`}
                        size="small"
                        color="info"
                      />
                    </CardContent>
                    <Box
                      sx={{
                        flex: 1,
                        p: 2,
                        display: "flex",
                        justifyContent: "center",
                        backgroundColor: "#FFFFFF",
                      }}
                    >
                      <Bar
                        data={{
                          labels: severityLabels,
                          datasets: [
                            {
                              label: "CVE",
                              data: counts,
                              // usa i colori pieni principali del theme
                              backgroundColor: severityLabels.map((lvl, i) =>
                                counts[i] > 0
                                  ? lvl === "Critical"
                                    ? theme.palette.error.main
                                    : lvl === "High"
                                    ? theme.palette.error.light
                                    : lvl === "Medium"
                                    ? theme.palette.warning.main
                                    : lvl === "Low"
                                    ? theme.palette.warning.light
                                    : lvl === "Info"
                                    ? theme.palette.info.main
                                    : theme.palette.success.main
                                  : "transparent"
                              ),
                              borderWidth: 0,
                            },
                          ],
                        }}
                        options={{
                          plugins: {
                            datalabels: {
                              anchor: "end",
                              align: "start",
                              formatter: (value) => value,
                              display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0,
                              font: {
                                size: 14, // aumenta questo valore finché non arriva alla dimensione desiderata
                                weight: "bold",
                              },
                            },
                            legend: { display: false },
                            tooltip: { enabled: true },
                          },
                          scales: {
                            x: {
                              ticks: {
                                font: {
                                  size: 14, // oppure 16, 18… finché non ti convince
                                },
                              },
                            },
                            y: {
                              beginAtZero: true,
                            },
                          },
                          onClick: (evt, elements) => {
                            if (elements.length > 0) {
                              const idx = elements[0].index;
                              handleBarClick(id, severityLabels[idx]);
                            }
                          },
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: { y: { beginAtZero: true } },
                        }}
                        height={150}
                      />
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </MDBox>
          <MDBox
            sx={{
              flexGrow: 1,
              overflowY: "auto",
              height: "calc(100% - 190px)", // usa lo stesso valore di `top`
              px: 2,
              mt: 2,
            }}
          >
            {/* ─── Dettaglio in Card/Paper ─────────────────────────────────── */}
            {detail.nodeId != null && (
              <MDBox mt={3} sx={{ width: "100%" }}>
                <Paper
                  elevation={4}
                  sx={{
                    p: 3,
                    width: "100%",
                    mx: "auto",
                    boxSizing: "border-box",
                    backgroundColor: "background.paper",
                    borderLeft: `6px solid ${
                      (severityBorder[detail.severity] || severityBorder.default).split(" ")[2]
                    }`,
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 2,
                  }}
                >
                  {/* header che occupa entrambe le colonne */}
                  <MDBox
                    sx={{
                      gridColumn: "1 / -1",
                      display: "flex",
                      alignItems: "center",
                      mb: 1,
                    }}
                  >
                    <MDTypography variant="h6" fontWeight="bold">
                      Tutte le CVE per “{idToLabel[detail.nodeId]}”
                    </MDTypography>
                    {detail.severity && (
                      <Chip label={detail.severity} size="small" sx={{ ml: 2 }} />
                    )}
                  </MDBox>

                  {/* elenco CVE: verranno disposte due per riga */}
                  {cveMap[detail.nodeId]
                    .filter((c) =>
                      detail.severity
                        ? c.severity.toLowerCase() === detail.severity.toLowerCase()
                        : true
                    )
                    .sort((a, b) => parseFloat(b.score) - parseFloat(a.score))
                    .map((c, idx) => (
                      <Box
                        component="a"
                        key={c.id}
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        sx={{
                          display: "block",
                          p: 2,
                          border: "1px solid",
                          borderColor: "grey.300",
                          borderRadius: 1,
                          boxSizing: "border-box",
                          textDecoration: "none",
                          color: "inherit",
                          "&:hover": { backgroundColor: "grey.100" },
                        }}
                      >
                        <Box component="span" sx={{ fontWeight: 400 }}>
                          {idx + 1}. {c.id}
                        </Box>
                        <MDTypography variant="body1" sx={{ mt: 1, fontSize: "1rem" }}>
                          <strong> Severity: </strong> {c.severity}
                        </MDTypography>
                        <MDTypography variant="body1" sx={{ mt: 1, fontSize: "1rem" }}>
                          <strong> Score: </strong> ({c.score})
                        </MDTypography>
                        <MDTypography
                          variant="body1"
                          sx={{
                            mt: 1,
                            fontSize: "1rem",
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                          }}
                        >
                          <strong> Description: </strong> {c.title}
                        </MDTypography>
                      </Box>
                    ))}
                </Paper>
              </MDBox>
            )}
          </MDBox>
        </>
      )}
      <Dialog
        keepMounted
        open={openExportDialog}
        onClose={() => setOpenExportDialog(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 4,
            px: 4,
            py: 3,
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            background: " #ffffff",
            backdropFilter: "blur(8px)",
          },
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
            <LightModeIcon sx={{ color: "#1976d2" }} />
            <MDTypography variant="h5" fontWeight="bold" color="dark">
              Esporta il Threat Model
            </MDTypography>
          </Box>
        </DialogTitle>

        <DialogContent>
          {exportCompleted ? (
            <Box display="flex" flexDirection="column" alignItems="center" textAlign="center" p={2}>
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                textAlign="center"
                p={2}
              >
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  width={150}
                  height={150}
                  style={{ marginBottom: "1rem", borderRadius: 8 }}
                >
                  <source src={downloadCompletedWebm} type="video/webm" />
                  Il tuo browser non supporta il video WebM.
                </video>
                <MDTypography variant="h6" mt={1}>
                  Export completato!
                </MDTypography>
                <MDTypography variant="body2" color="text.secondary" mt={1}>
                  Il report è stato generato correttamente.
                </MDTypography>
              </Box>
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" alignItems="center" gap={3}>
              <MDTypography variant="body1" color="text.primary" textAlign="center">
                Seleziona i formati in cui desideri esportare il report.
              </MDTypography>

              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedFormats.docx}
                      onChange={() => handleFormatChange("docx")}
                    />
                  }
                  label={
                    <MDTypography variant="body1" fontWeight="medium" color="text.secondary">
                      PDF
                    </MDTypography>
                  }
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedFormats.xlsx}
                      onChange={() => handleFormatChange("xlsx")}
                    />
                  }
                  label={
                    <MDTypography variant="body1" fontWeight="medium" color="text.secondary">
                      DOCX
                    </MDTypography>
                  }
                />
              </FormGroup>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: "center", mt: 2 }}>
          {exportCompleted ? (
            <MDButton variant="gradient" color="info" onClick={() => navigate(ANALYSIS_LIST_PATH)}>
              Vai a “Analisi Effettuate”
            </MDButton>
          ) : (
            <>
              <MDButton onClick={() => setOpenExportDialog(false)} color="secondary">
                Annulla
              </MDButton>
              <MDButton
                variant="gradient"
                color="dark"
                onClick={() => {
                  if (selectedFormats.pdf) {
                    handleExport(); // esegue solo PDF
                  }

                  setExportCompleted(true);
                }}
              >
                Download
              </MDButton>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
}
