/* eslint react/prop-types: 0 */
import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";

import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Chip from "@mui/material/Chip";
import InputBase from "@mui/material/InputBase";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuList from "@mui/material/MenuList";
import MenuItemM from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Skeleton from "@mui/material/Skeleton";
import Badge from "@mui/material/Badge";

import LinearProgress from "@mui/material/LinearProgress";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { API_BASE, authFetch, getRole } from "utils/auth";
import { useNavigate } from "react-router-dom";

// ————————————————————————————————————————————————————————————————
// Helpers UI

const RoleChip = ({ role }) => (
  <Chip label={(role || "").toUpperCase()} size="small" sx={{ fontWeight: 600, opacity: 0.9 }} />
);
RoleChip.propTypes = { role: PropTypes.string };

const RiskPill = ({ score }) => {
  // 0-100 (fittizio se non arriva): colori e testo
  let color = "success";
  let label = "LOW";
  if (score >= 70) {
    color = "error";
    label = "HIGH";
  } else if (score >= 40) {
    color = "warning";
    label = "MEDIUM";
  }
  return (
    <Chip
      label={`Risk ${label} • ${Math.round(score)}%`}
      size="small"
      color={color}
      sx={{ fontWeight: 600 }}
    />
  );
};
RiskPill.propTypes = { score: PropTypes.number.isRequired };

const StatusDot = ({ ok }) => (
  <Badge
    variant="dot"
    color={ok ? "success" : "warning"}
    overlap="circular"
    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
  >
    <Avatar
      sx={{ width: 28, height: 28, fontWeight: 700, bgcolor: "primary.main", color: "white" }}
    >
      <Icon fontSize="small">assessment</Icon>
    </Avatar>
  </Badge>
);
StatusDot.propTypes = { ok: PropTypes.bool };

// Preferiti in localStorage
const favKey = "apps_favorites";
const getFavs = () => {
  try {
    return JSON.parse(localStorage.getItem(favKey) || "[]");
  } catch {
    return [];
  }
};
const setFavs = (ids) => localStorage.setItem(favKey, JSON.stringify(ids));

// ————————————————————————————————————————————————————————————————
// Card (Grid view)

function ApplicationCard({ app, onOpenAnalysis, onOpenProject, fav, toggleFav }) {
  const seed = Number(app?.id || 1);
  const riskScore = useMemo(() => {
    const base = app?.id_analisi ? (app.id_analisi.length * 13) % 100 : (seed * 7) % 100;
    return base;
  }, [app, seed]);

  const ok = (app?.id_analisi || "").toString().length % 2 === 0; // “ultimo check” fittizio
  const riskColor = riskScore >= 70 ? "error" : riskScore >= 40 ? "warning" : "success";
  // Menu azioni
  const [anchor, setAnchor] = useState(null);
  const openMenu = (e) => setAnchor(e.currentTarget);
  const closeMenu = () => setAnchor(null);
  const clamped = Math.max(0, Math.min(100, Number(riskScore) || 0));

  return (
    <Card
      sx={{
        p: 0,
        borderRadius: "20px",
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "transform .12s ease, box-shadow .12s ease",
        "&:hover": { transform: "translateY(-2px)", boxShadow: 4 },
        border: "1px solid",
        borderColor: "divider",
        backdropFilter: "saturate(180%) blur(4px)",
      }}
      variant="outlined"
    >
      {/* Header glassy */}
      <MDBox
        px={2}
        py={1.5}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          background: "linear-gradient(135deg, rgba(25,118,210,.14) 0%, rgba(25,118,210,.06) 100%)",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <MDBox display="flex" alignItems="center" gap={1.25}>
          <StatusDot ok={ok} />
          <MDTypography variant="h6" fontWeight="bold" sx={{ lineHeight: 1.1 }}>
            {app.name}
          </MDTypography>
        </MDBox>

        <MDBox display="flex" alignItems="center" gap={1}>
          <Tooltip title={fav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}>
            <IconButton size="small" onClick={toggleFav}>
              <Icon color={fav ? "warning" : "inherit"}>{fav ? "star" : "star_border"}</Icon>
            </IconButton>
          </Tooltip>
          <Tooltip title="Azioni">
            <IconButton size="small" onClick={openMenu}>
              <Icon>more_vert</Icon>
            </IconButton>
          </Tooltip>

          <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={closeMenu}>
            <MenuList dense sx={{ minWidth: 220 }}>
              <MenuItemM
                onClick={() => {
                  closeMenu();
                  onOpenProject?.(app);
                }}
              >
                <Icon sx={{ mr: 1 }}>open_in_new</Icon> Apri progetto
              </MenuItemM>
              <MenuItemM
                onClick={() => {
                  closeMenu();
                  onOpenAnalysis?.(app);
                }}
              >
                <Icon sx={{ mr: 1 }}>analytics</Icon> Apri analisi
              </MenuItemM>
              <Divider />
              <MenuItemM
                onClick={() => {
                  closeMenu();
                  navigator.clipboard.writeText(String(app.id));
                }}
              >
                <Icon sx={{ mr: 1 }}>content_copy</Icon> Copia ID
              </MenuItemM>
            </MenuList>
          </Menu>
        </MDBox>
      </MDBox>

      {/* Body */}
      <MDBox p={2} display="flex" flexDirection="column" gap={1.25} sx={{ flexGrow: 1 }}>
        <MDTypography variant="button" color="text" sx={{ minHeight: 40 }}>
          {app.description || "—"}
        </MDTypography>

        <MDBox display="flex" gap={1} alignItems="center" flexWrap="wrap">
          <RoleChip role={app.created_by_role} />
          {app?.id_progetto && <Chip size="small" label={`#${app.id_progetto}`} />}
          <Chip
            size="small"
            icon={<Icon fontSize="small">bug_report</Icon>}
            label={`CVE: ${app.cve_count ?? 0}`}
            variant="outlined"
          />
          <Chip
            size="small"
            icon={<Icon fontSize="small">security</Icon>}
            label={`Threat: ${app.threat_count ?? 0}`}
            variant="outlined"
          />
        </MDBox>

        <MDBox display="flex" alignItems="center" justifyContent="space-between" mt={0.5}>
          <RiskPill score={riskScore} />
          <MDTypography variant="caption" color="text">
            {app.created_at ? new Date(app.created_at).toLocaleString() : "—"}
          </MDTypography>
        </MDBox>

        {/* Indicatore compatto di “salute”/rischio */}
        <MDBox mt={0.5} display="flex" alignItems="center" gap={1}>
          <MDBox
            sx={{
              position: "relative",
              flex: 1,
              height: 8,
              borderRadius: 4,
              bgcolor: (theme) => theme.palette.grey[200],
              overflow: "hidden",
            }}
          >
            <MDBox
              sx={{
                position: "absolute",
                inset: 0,
                width: `${clamped}%`, // 👈 Larghezza percentuale vera
                bgcolor: (theme) => theme.palette[riskColor].main, // 👈 Colore coerente (success/warning/error)
                transition: "width .25s ease",
                borderRadius: 4,
              }}
            />
          </MDBox>
          <MDTypography variant="caption" sx={{ minWidth: 36, textAlign: "right" }}>
            {`${Math.round(clamped)}%`}
          </MDTypography>
        </MDBox>
      </MDBox>

      {/* Footer azioni rapide */}
      <MDBox
        px={2}
        py={1.25}
        display="flex"
        alignItems="center"
        justifyContent="flex-end"
        sx={{ borderTop: "1px dashed", borderColor: "divider" }}
      >
        <MDBox display="flex" gap={1}>
          {/* Blu default con hover */}
          <MDButton
            size="small"
            variant="gradient"
            color="dark"
            onClick={() => onOpenProject?.(app)}
          >
            Open
          </MDButton>
          <MDButton
            size="small"
            variant="gradient"
            color="dark"
            onClick={() => onOpenAnalysis?.(app)}
          >
            Analysis
          </MDButton>
          <MDButton
            size="small"
            variant="outlined"
            color="black"
            onClick={() => onOpenAnalysis?.(app)}
            startIcon={<Icon>ios_share</Icon>}
          >
            PDF
          </MDButton>
        </MDBox>
      </MDBox>
    </Card>
  );
}
ApplicationCard.propTypes = {
  app: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    created_by_role: PropTypes.string.isRequired,
    created_at: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.instanceOf(Date),
    ]),
    owner_id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    id_analisi: PropTypes.any,
    referente: PropTypes.string,
    id_progetto: PropTypes.any,
  }).isRequired,
  onOpenAnalysis: PropTypes.func,
  onOpenProject: PropTypes.func,
  fav: PropTypes.bool,
  toggleFav: PropTypes.func,
  cve_count: PropTypes.number,
  threat_count: PropTypes.number,
};

// ————————————————————————————————————————————————————————————————
// List row (List view)

function ApplicationRow({ app, fav, toggleFav, onOpenAnalysis, onOpenProject }) {
  const seed = Number(app?.id || 1);
  const riskScore = app?.id_analisi ? (app.id_analisi.length * 13) % 100 : (seed * 7) % 100;

  // dettagli extra + progress compatto
  const clamped = Math.max(0, Math.min(100, Number(riskScore) || 0));
  const riskColor = riskScore >= 70 ? "error" : riskScore >= 40 ? "warning" : "success";

  return (
    <Card
      variant="outlined"
      sx={{
        px: 2,
        py: 1.25,
        borderRadius: "16px",
        display: "flex",
        flexDirection: "column",
        gap: 1,
        "&:hover": { boxShadow: 3 },
        height: "100%",
      }}
    >
      {/* Intestazione + azioni veloci */}
      <MDBox display="flex" alignItems="center" gap={1.25}>
        <Icon color="info">apps</Icon>
        <MDBox sx={{ minWidth: 0, flex: 1 }}>
          <MDTypography variant="button" fontWeight="bold" noWrap>
            {app.name}
          </MDTypography>
          <MDTypography variant="caption" color="text" noWrap>
            {"    " + app.description || "—"}
          </MDTypography>
        </MDBox>

        <Tooltip title={fav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}>
          <IconButton size="small" onClick={toggleFav}>
            <Icon color={fav ? "warning" : "inherit"}>{fav ? "star" : "star_border"}</Icon>
          </IconButton>
        </Tooltip>
      </MDBox>

      {/* Metadati compatti + chips */}
      <MDBox display="flex" alignItems="center" gap={1} flexWrap="wrap">
        <RoleChip role={app.created_by_role} />
        {app?.id_progetto && <Chip size="small" label={`#${app.id_progetto}`} />}
        <Chip
          size="small"
          icon={<Icon fontSize="small">bug_report</Icon>}
          label={`CVE: ${app.cve_count ?? 0}`}
          variant="outlined"
        />
        <Chip
          size="small"
          icon={<Icon fontSize="small">security</Icon>}
          label={`Threat: ${app.threat_count ?? 0}`}
          variant="outlined"
        />
        <MDBox sx={{ flexGrow: 1 }} />
        <MDTypography variant="caption" color="text">
          {app.created_at ? new Date(app.created_at).toLocaleString() : "—"}
        </MDTypography>
      </MDBox>

      {/* Rischio compatto */}
      <MDBox display="flex" alignItems="center" gap={1}>
        <RiskPill score={riskScore} />
        <MDBox
          sx={{
            position: "relative",
            flex: 1,
            height: 8,
            borderRadius: 4,
            bgcolor: (theme) => theme.palette.grey[200],
            overflow: "hidden",
          }}
        >
          <MDBox
            sx={{
              position: "absolute",
              inset: 0,
              width: `${clamped}%`,
              bgcolor: (theme) => theme.palette[riskColor].main,
              transition: "width .25s ease",
              borderRadius: 4,
            }}
          />
        </MDBox>
        <MDTypography variant="caption" sx={{ minWidth: 36, textAlign: "right" }}>
          {`${Math.round(clamped)}%`}
        </MDTypography>
      </MDBox>

      {/* Bottoni sempre visibili (stile come richiesto) */}
      <MDBox display="flex" gap={1} justifyContent="flex-end">
        <MDButton size="small" variant="gradient" color="dark" onClick={() => onOpenProject?.(app)}>
          Open
        </MDButton>
        <MDButton
          size="small"
          variant="gradient"
          color="dark"
          onClick={() => onOpenAnalysis?.(app)}
        >
          Analysis
        </MDButton>
        <MDButton
          size="small"
          variant="outlined"
          color="black"
          onClick={() => onOpenAnalysis?.(app)}
          startIcon={<Icon>ios_share</Icon>}
        >
          PDF
        </MDButton>
      </MDBox>
    </Card>
  );
}
ApplicationRow.propTypes = ApplicationCard.propTypes;

// ————————————————————————————————————————————————————————————————
// Pagina

export default function ApplicationsList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [order, setOrder] = useState("created_at");
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [view, setView] = useState("grid"); // grid | list
  const [roleFilter, setRoleFilter] = useState("all"); // all | client | admin | root
  const [favorites, setFavorites] = useState(getFavs());
  const limit = 24;
  const myRole = (getRole?.() || "").toLowerCase();

  const fetchData = async (reset = false) => {
    setLoading(true);
    const params = new URLSearchParams({
      ...(q ? { q } : {}),
      ...(order ? { order } : {}),
      limit: String(limit),
      offset: String(reset ? 0 : offset),
    });

    const res = await authFetch(`${API_BASE}/applications?${params.toString()}`);
    const data = await res.json();

    if (reset) {
      setItems(data.items || []);
      setOffset((data.items || []).length);
      setTotal(data.total || 0);
    } else {
      setItems((prev) => [...prev, ...(data.items || [])]);
      setOffset((prev) => prev + (data.items?.length || 0));
      setTotal(data.total || total);
    }
    setLoading(false);
  };

  // debounce su q+order
  useEffect(() => {
    const t = setTimeout(() => fetchData(true), 300);
    return () => clearTimeout(t);
  }, [q, order]);

  useEffect(() => {
    fetchData(true);
  }, []);

  const canLoadMore = items.length < total;

  // filtri client-side aggiuntivi
  const filtered = useMemo(() => {
    let out = items;
    if (roleFilter !== "all") {
      out = out.filter((a) => (a.created_by_role || "").toLowerCase() === roleFilter);
    }

    // Ordinamento client-side per risk score
    if (order === "risk_asc" || order === "risk_desc") {
      out = [...out].sort((a, b) => {
        const getRisk = (app) =>
          app?.risk ??
          (app?.id_analisi ? (app.id_analisi.length * 13) % 100 : (Number(app?.id) * 7) % 100);

        const ra = getRisk(a);
        const rb = getRisk(b);
        return order === "risk_asc" ? ra - rb : rb - ra;
      });
    }

    return out;
  }, [items, roleFilter, order]);

  // KPI header
  const kpi = useMemo(() => {
    const visibili = filtered.length;
    const client = filtered.filter(
      (x) => (x.created_by_role || "").toLowerCase() === "client"
    ).length;
    const admin = filtered.filter((x) =>
      (x.created_by_role || "").toLowerCase().includes("admin")
    ).length;
    const lastTs = filtered[0]?.created_at
      ? new Date(filtered[0].created_at).toLocaleString()
      : "—";
    return { tot: total, visibili, client, admin, lastTs };
  }, [filtered, total]);

  const onOpenAnalysis = (app) => navigate(`/analysis/${app.id}`);
  const onOpenProject = (app) => navigate(`/projects/${app.id}`);

  const isFav = (id) => favorites.includes(String(id));
  const toggleFav = (id) => {
    const idS = String(id);
    const next = isFav(idS) ? favorites.filter((x) => x !== idS) : [...favorites, idS];
    setFavorites(next);
    setFavs(next);
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />

      {/* HEADER HERO compatto */}
      <MDBox
        sx={{
          borderRadius: "18px",
          p: 2.5,
          mb: 2,
          background: "linear-gradient(135deg, rgba(25,118,210,.12), rgba(25,118,210,.04))",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <MDBox
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          gap={2}
          flexWrap="wrap"
        >
          <MDBox>
            <MDTypography variant="h5" fontWeight="bold">
              Application List
            </MDTypography>
          </MDBox>

          {/* KPI compatti */}
          <MDBox display="flex" gap={2} flexWrap="wrap">
            <Card variant="outlined" sx={{ px: 2, py: 1, borderRadius: "12px" }}>
              <MDTypography variant="caption" color="text">
                # Application
              </MDTypography>
              <MDTypography variant="h6">{kpi.tot}</MDTypography>
            </Card>
            <Card variant="outlined" sx={{ px: 2, py: 1, borderRadius: "12px" }}>
              <MDTypography variant="caption" color="text">
                Last Project Entry Date
              </MDTypography>
              <MDTypography variant="button">{kpi.lastTs}</MDTypography>
            </Card>
          </MDBox>
        </MDBox>
      </MDBox>

      {/* TOOLBAR */}
      <MDBox
        mb={2}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={2}
      >
        <MDBox display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <MDBox
            px={2}
            py={1}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              borderRadius: "12px",
              bgcolor: "background.paper",
              boxShadow: 1,
              minWidth: 280,
            }}
          >
            <Icon>search</Icon>
            <InputBase
              placeholder="Cerca per nome o descrizione…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              sx={{
                flex: 1,
                fontSize: "0.8rem", // 👈 testo più piccolo
                "& input::placeholder": {
                  // 👈 anche placeholder più piccolo
                  fontSize: "0.8rem",
                },
              }}
              inputProps={{ "aria-label": "Cerca applicazioni" }}
            />
          </MDBox>
          <Select
            size="small"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            sx={{ borderRadius: "12px" }}
          >
            <MenuItem value="created_at">Latest</MenuItem>
            <MenuItem value="name">Name (A→Z)</MenuItem>
            <MenuItem value="risk_asc">Risk ↑ (ascending)</MenuItem>
            <MenuItem value="risk_desc">Rischio ↓ (descending)</MenuItem>
          </Select>

          <MDTypography variant="caption" color="text">
            Order: {order.startsWith("risk") ? "Risk Score" : order === "name" ? "Nome" : "Data"}
          </MDTypography>
        </MDBox>

        <ToggleButtonGroup size="small" value={view} exclusive onChange={(_, v) => v && setView(v)}>
          <ToggleButton value="grid">
            <Icon fontSize="small">grid_view</Icon>
          </ToggleButton>
          <ToggleButton value="list">
            <Icon fontSize="small">list</Icon>
          </ToggleButton>
        </ToggleButtonGroup>
      </MDBox>

      {/* CONTENT */}
      <MDBox>
        {/* Loading iniziale: skeleton elegante */}
        {loading && (
          <Grid container spacing={2}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={`sk-${i}`}>
                <Card sx={{ p: 2, borderRadius: "20px" }} variant="outlined">
                  <Skeleton variant="rounded" height={36} sx={{ mb: 1 }} />
                  <Skeleton variant="text" />
                  <Skeleton variant="text" width="80%" />
                  <Skeleton variant="rounded" height={54} sx={{ mt: 1.5 }} />
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {filtered.length === 0 && (
          <Card
            sx={{
              p: 4,
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            variant="outlined"
          >
            <MDBox display="flex" flexDirection="column" alignItems="center" gap={1}>
              <Icon sx={{ fontSize: 40 }}>hourglass_empty</Icon>
              <MDTypography variant="button" color="text">
                No results with the current filters. Try removing some filters.
              </MDTypography>
            </MDBox>
          </Card>
        )}

        {filtered.length > 0 && view === "grid" && (
          <Grid container spacing={2}>
            {filtered.map((app) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={app.id}>
                <ApplicationCard
                  app={app}
                  fav={isFav(app.id)}
                  toggleFav={() => toggleFav(app.id)}
                  onOpenAnalysis={onOpenAnalysis}
                  onOpenProject={onOpenProject}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {filtered.length > 0 && view === "list" && (
          <Grid container spacing={1.5}>
            {filtered.map((app) => (
              <Grid item xs={12} md={6} key={`row-${app.id}`}>
                <ApplicationRow
                  app={app}
                  fav={isFav(app.id)}
                  toggleFav={() => toggleFav(app.id)}
                  onOpenAnalysis={onOpenAnalysis}
                  onOpenProject={onOpenProject}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {/* Paginazione */}
        {filtered.length > 0 && (
          <MDBox mt={3} display="flex" justifyContent="center">
            {items.length < total ? (
              <MDButton
                variant="gradient"
                color="info"
                onClick={() => fetchData(false)}
                disabled={loading}
                startIcon={<Icon>expand_more</Icon>}
              >
                {loading ? "Caricamento…" : "Carica altri"}
              </MDButton>
            ) : (
              <MDTypography variant="button" color="text">
                All {total} applications have been displayed.
              </MDTypography>
            )}
          </MDBox>
        )}
      </MDBox>

      <Footer />
    </DashboardLayout>
  );
}
