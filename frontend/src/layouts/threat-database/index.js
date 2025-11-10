import { useEffect, useMemo, useState, useCallback } from "react";
import { API_BASE } from "utils/auth";

// MUI
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import TextField from "@mui/material/TextField";
import SearchIcon from "@mui/icons-material/Search";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import Chip from "@mui/material/Chip";
import Icon from "@mui/material/Icon";
import Autocomplete from "@mui/material/Autocomplete";
import Stack from "@mui/material/Stack";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import ClearIcon from "@mui/icons-material/Clear";

// MD2R
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DataTable from "examples/Tables/DataTable";
import PropTypes from "prop-types";

// --- UI helpers ---
const gradientCardSx = {
  p: 2,
  background: "linear-gradient(135deg, rgba(25,118,210,0.06) 0%, rgba(156,39,176,0.06) 100%)",
  backdropFilter: "blur(6px)",
  boxShadow: "0 10px 25px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.2)",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.18)",
};

const tableCardSx = {
  borderRadius: "16px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
};

// 🔹 stile “pill / segmented control” per i bottoni Rules / Threat Types
const segmentedSx = {
  borderRadius: 999,
  bgcolor: "background.paper",
  p: 0.5,
  boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
  border: "1px solid",
  borderColor: "divider",
  "& .MuiToggleButtonGroup-grouped": {
    border: "none",
    mx: 0.25,
    borderRadius: 999,
    textTransform: "none",
    px: 1.25,
    gap: 0.5,
  },
  "& .MuiToggleButton-root": {
    fontWeight: 600,
    fontSize: "0.85rem",
    color: "text.secondary",
    "& .MuiSvgIcon-root, & .MuiIcon-root": { fontSize: "1rem" },
  },
  "& .Mui-selected": {
    bgcolor: "primary.main",
    color: "primary.contrastText !important",
    "&:hover": { bgcolor: "primary.dark" },
  },
};

// 🔹 stile “pill” per gli Autocomplete
const pillAutocompleteSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 999,
    paddingRight: "8px !important",
  },
  "& .MuiAutocomplete-tag": {
    borderRadius: 999,
  },
};

function SeverityChip({ value }) {
  const v = String(value || "").toLowerCase();
  let color = "default";
  let label = value ?? "";
  if (v.includes("critical")) color = "error";
  else if (v.includes("high")) color = "error";
  else if (v.includes("med")) color = "warning";
  else if (v.includes("low")) color = "success";
  return (
    <Chip
      label={label}
      color={["error", "warning", "success"].includes(color) ? color : "default"}
      size="small"
      variant={color === "default" ? "outlined" : "filled"}
      sx={{ fontWeight: 600, textTransform: "capitalize" }}
    />
  );
}
SeverityChip.propTypes = { value: PropTypes.any };

function ThreatDatabase() {
  const [tab, setTab] = useState(0);

  const [q, setQ] = useState("");
  const [rules, setRules] = useState({
    data: [],
    total: 0,
    loading: false,
    limit: 10000,
    offset: 0,
  });
  const [types, setTypes] = useState({
    data: [],
    total: 0,
    loading: false,
    limit: 10000,
    offset: 0,
  });
  const [error, setError] = useState("");

  // filtri client-side (moderni e intuitivi)
  const [severityFilter, setSeverityFilter] = useState("ANY");
  const [categoryFilter, setCategoryFilter] = useState("ANY");

  const severityOptions = ["ANY", "CRITICAL", "HIGH", "MEDIUM", "LOW"];

  const fetchJson = async (url) => {
    const token = localStorage.getItem("authToken");
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  const fetchRules = useCallback(
    async (limit = rules.limit, offset = rules.offset, query = q) => {
      try {
        setError("");
        setRules((s) => ({ ...s, loading: true }));
        const url = `${API_BASE}/threatdb/rules?limit=${limit}&offset=${offset}${
          query ? `&q=${encodeURIComponent(query)}` : ""
        }`;
        const json = await fetchJson(url);
        setRules({
          data: Array.isArray(json?.data) ? json.data : [],
          total: Number.isFinite(json?.total) ? json.total : 0,
          loading: false,
          limit,
          offset,
        });
      } catch (e) {
        if (String(e.message || "").includes("HTTP 403")) {
          setError("Non hai i permessi per accedere al Threat Database.");
        } else {
          setError(e.message || "Errore di rete");
        }
      }
    },
    [q, rules.limit, rules.offset]
  );

  const fetchTypes = useCallback(
    async (limit = types.limit, offset = types.offset, query = q) => {
      try {
        setError("");
        setTypes((s) => ({ ...s, loading: true }));
        const url = `${API_BASE}/threatdb/threat-types?limit=${limit}&offset=${offset}${
          query ? `&q=${encodeURIComponent(query)}` : ""
        }`;
        const json = await fetchJson(url);
        setTypes({
          data: Array.isArray(json?.data) ? json.data : [],
          total: Number.isFinite(json?.total) ? json.total : 0,
          loading: false,
          limit,
          offset,
        });
      } catch (e) {
        setTypes((s) => ({ ...s, loading: false, data: [], total: 0 }));
        setError(`Threat Types load failed: ${e.message}`);
      }
    },
    [q, types.limit, types.offset]
  );

  // primo load
  useEffect(() => {
    fetchRules();
    fetchTypes();
  }, [fetchRules, fetchTypes, rules.limit]);

  // refetch quando cambi tab o query
  useEffect(() => {
    if (tab === 0) fetchRules(rules.limit, 0, q);
    else fetchTypes(types.limit, 0, q);
  }, [tab, q, fetchRules, fetchTypes, rules.limit, types.limit]);

  // --- Columns ---
  const rulesColumns = useMemo(
    () => [
      { Header: "ID", accessor: "id", align: "left", width: "6%" },
      { Header: "Threat ID", accessor: "id_threat", align: "left", width: "12%" },
      { Header: "Flow", accessor: "flow", align: "left", width: "8%" },
      { Header: "Source", accessor: "source", align: "left", width: "28%" },
      { Header: "Target", accessor: "target", align: "left", width: "28%" },
      { Header: "Attr. Source", accessor: "attribute_source", align: "left", width: "9%" },
      { Header: "Attr. Target", accessor: "attribute_target", align: "left", width: "9%" },
    ],
    []
  );

  const typesColumns = useMemo(
    () => [
      { Header: "ID", accessor: "id", align: "left", width: "8%" },
      { Header: "Short Title", accessor: "short_title", align: "left", width: "28%" },
      { Header: "Category", accessor: "category", align: "left", width: "14%" },
      { Header: "Severity", accessor: "severity", align: "left", width: "12%" },
      { Header: "SDL Phase", accessor: "sdl_phase", align: "left", width: "12%" },
      {
        Header: "Possible Mitigation",
        accessor: "possible_mitigation",
        align: "left",
        width: "26%",
      },
    ],
    []
  );

  // Mapping tollerante a maiuscole/minuscole + nomi alternativi, con styling MD
  const rulesRows = useMemo(
    () =>
      rules.data.map((r) => {
        const get = (k, alt = []) =>
          r?.[k] ?? alt.reduce((acc, key) => (acc !== undefined ? acc : r?.[key]), undefined) ?? "";
        const base = {
          id: get("id", ["ID"]),
          id_threat: get("id_threat", ["ID_THREAT", "threat_ref"]),
          flow: get("flow", ["FLOW"]),
          source: get("source", ["SOURCE"]),
          target: get("target", ["TARGET"]),
          attribute_source: get("attribute_source", ["ATTRIBUTE_SOURCE"]),
          attribute_target: get("attribute_target", ["ATTRIBUTE_TARGET"]),
        };

        return {
          id: (
            <MDTypography variant="button" fontWeight="bold">
              {base.id}
            </MDTypography>
          ),
          id_threat: (
            <MDTypography variant="button" color="info">
              {base.id_threat}
            </MDTypography>
          ),
          flow: (
            <MDTypography variant="caption" color="text">
              {base.flow}
            </MDTypography>
          ),
          source: (
            <MDTypography variant="caption" color="text">
              {base.source}
            </MDTypography>
          ),
          target: (
            <MDTypography variant="caption" color="text">
              {base.target}
            </MDTypography>
          ),
          attribute_source: (
            <MDTypography variant="caption" color="secondary">
              {base.attribute_source}
            </MDTypography>
          ),
          attribute_target: (
            <MDTypography variant="caption" color="secondary">
              {base.attribute_target}
            </MDTypography>
          ),
        };
      }),
    [rules.data]
  );

  // Filtri client-side su Threat Types
  const uniqueCategories = useMemo(() => {
    const set = new Set(
      types.data
        .map((t) => t?.category ?? t?.Category ?? "")
        .filter((x) => x !== null && x !== undefined && String(x).trim() !== "")
    );
    return ["ANY", ...Array.from(set).sort()];
  }, [types.data]);

  const filteredTypes = useMemo(() => {
    return types.data.filter((t) => {
      const sev = String(t?.severity ?? t?.Severity ?? "").toLowerCase();
      const cat = String(t?.category ?? t?.Category ?? "");
      const sevOk =
        severityFilter === "ANY" ||
        (severityFilter === "CRITICAL" && sev.includes("critical")) ||
        (severityFilter === "HIGH" && sev.includes("high")) ||
        (severityFilter === "MEDIUM" && sev.includes("med")) ||
        (severityFilter === "LOW" && sev.includes("low"));
      const catOk = categoryFilter === "ANY" || cat === categoryFilter;
      return sevOk && catOk;
    });
  }, [types.data, severityFilter, categoryFilter]);

  const typesRows = useMemo(
    () =>
      filteredTypes.map((t) => {
        const get = (k, alt = []) =>
          t?.[k] ?? alt.reduce((acc, key) => (acc !== undefined ? acc : t?.[key]), undefined) ?? "";

        const base = {
          id: get("id", ["Id"]),
          short_title: get("short_title", ["ShortTitle"]),
          category: get("category", ["Category"]),
          severity: get("severity", ["Severity"]),
          sdl_phase: get("sdl_phase", ["SDLPhase", "SDL phase", "SDL Phase"]),
          possible_mitigation: get("possible_mitigation", [
            "PossibleMitigation",
            "Possible Mitigation",
            "Possible Mitigation(s)",
          ]),
        };

        return {
          id: (
            <MDTypography variant="button" fontWeight="bold">
              {base.id}
            </MDTypography>
          ),
          short_title: (
            <MDTypography variant="button" color="dark">
              {base.short_title}
            </MDTypography>
          ),
          category: <MDTypography variant="caption">{base.category}</MDTypography>,
          severity: <SeverityChip value={base.severity} />,
          sdl_phase: <MDTypography variant="caption">{base.sdl_phase}</MDTypography>,
          possible_mitigation: (
            <MDTypography
              variant="caption"
              color="text"
              sx={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                lineHeight: 1.4,
                display: "block",
                maxWidth: 360, // puoi regolare la larghezza massima
              }}
            >
              {base.possible_mitigation}
            </MDTypography>
          ),
        };
      }),
    [filteredTypes]
  );

  const handleSearch = (e) => {
    const value = e.target.value;
    setQ(value);
    if (tab === 0) fetchRules(rules.limit, 0, value);
    else fetchTypes(types.limit, 0, value);
  };

  const resetFilters = () => {
    setSeverityFilter("ANY");
    setCategoryFilter("ANY");
  };

  // CSV export (client-side)
  const exportCSV = (rows, filename) => {
    const flat = rows.map((row) => {
      const extract = (v) =>
        typeof v === "string" ? v : v?.props?.children ?? (Array.isArray(v) ? v.join(" ") : "");
      const out = {};
      Object.keys(row).forEach((k) => {
        out[k] = extract(row[k]);
      });
      return out;
    });
    const headers = Object.keys(flat[0] || {});
    const csv = [
      headers.join(","),
      ...flat.map((r) =>
        headers
          .map((h) => {
            const cell = String(r[h] ?? "");
            const needsQuote = /[",\n]/.test(cell);
            return needsQuote ? `"${cell.replace(/"/g, '""')}"` : cell;
          })
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const TableCard = ({
    title,
    subtitle,
    columns,
    rows,
    total,
    loading,
    onPrev,
    onNext,
    canPrev,
    canNext,
    extraToolbar,
    onExport,
  }) => (
    <Card sx={tableCardSx}>
      <MDBox
        px={2}
        py={2}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          background: "linear-gradient(135deg, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0) 100%)",
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
        }}
      >
        <MDBox>
          <MDTypography variant="h6" fontWeight="bold">
            {title}
          </MDTypography>
          {subtitle && (
            <MDTypography variant="caption" color="text">
              {subtitle}
            </MDTypography>
          )}
        </MDBox>
        <MDBox display="flex" alignItems="center" gap={1}>
          {onExport && (
            <MDButton
              color="info"
              size="small"
              variant="gradient"
              onClick={onExport}
              startIcon={<Icon>download</Icon>}
            >
              Export CSV
            </MDButton>
          )}
          {extraToolbar}
        </MDBox>
      </MDBox>

      <MDBox p={2}>
        {loading ? (
          <MDBox display="flex" alignItems="center" justifyContent="center" py={6}>
            <CircularProgress />
          </MDBox>
        ) : rows.length === 0 ? (
          <MDBox py={6} textAlign="center">
            <MDTypography variant="button" color="text">
              Nessun dato da mostrare
            </MDTypography>
          </MDBox>
        ) : (
          <MDBox
            sx={
              title === "Threat Types"
                ? {
                    // Applica solo alla tab Threat Types:
                    "& table td:nth-of-type(6), & table th:nth-of-type(6)": {
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                      maxWidth: 360, // in armonia con la cella sopra
                    },
                  }
                : {}
            }
          >
            <DataTable
              table={{ columns, rows }}
              isSorted
              entriesPerPage
              showTotalEntries
              canSearch={false}
              noEndBorder
            />
          </MDBox>
        )}

        <MDBox display="flex" justifyContent="space-between" alignItems="center" mt={2}>
          <MDTypography variant="button" color="text">
            {`Totale: ${total}`}
          </MDTypography>
          <MDBox display="flex" gap={1}>
            <MDButton
              color="secondary"
              variant="outlined"
              size="small"
              onClick={onPrev}
              disabled={!canPrev || loading}
            >
              Prev
            </MDButton>
            <MDButton
              color="secondary"
              variant="outlined"
              size="small"
              onClick={onNext}
              disabled={!canNext || loading}
            >
              Next
            </MDButton>
          </MDBox>
        </MDBox>

        {error && (
          <MDBox mt={1}>
            <MDTypography variant="caption" color="error">
              {error}
            </MDTypography>
          </MDBox>
        )}
      </MDBox>
    </Card>
  );

  TableCard.propTypes = {
    title: PropTypes.node,
    subtitle: PropTypes.node,
    columns: PropTypes.array.isRequired,
    rows: PropTypes.array.isRequired,
    total: PropTypes.number.isRequired,
    loading: PropTypes.bool,
    onPrev: PropTypes.func,
    onNext: PropTypes.func,
    canPrev: PropTypes.bool,
    canNext: PropTypes.bool,
    extraToolbar: PropTypes.node,
    onExport: PropTypes.func,
  };

  TableCard.defaultProps = {
    loading: false,
    onPrev: () => {},
    onNext: () => {},
    canPrev: false,
    canNext: false,
    extraToolbar: null,
    onExport: null,
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={3} pb={2}>
        <MDTypography variant="h4" fontWeight="medium">
          Threat Database
        </MDTypography>
        <MDTypography variant="button" color="text">
          Visualizza <b>Rules</b> e <b>Threat Types</b> dal database.
        </MDTypography>
      </MDBox>

      {/* Header con gradient e controlli globali */}
      <MDBox mb={2}>
        <Card sx={gradientCardSx}>
          <MDBox display="flex" alignItems="center" gap={2} flexWrap="wrap" width="100%">
            {/* 🔁 Segmented control per le due tabelle */}
            <ToggleButtonGroup
              exclusive
              value={tab}
              onChange={(_, v) => typeof v === "number" && setTab(v)}
              sx={segmentedSx}
              size="small"
              aria-label="Seleziona tabella"
            >
              <ToggleButton value={0} aria-label="Rules">
                <Icon>rule</Icon> Rules
              </ToggleButton>
              <ToggleButton value={1} aria-label="Threat Types">
                <Icon>category</Icon> Threat Types
              </ToggleButton>
            </ToggleButtonGroup>

            {/* Search */}
            <MDBox sx={{ ml: "auto", minWidth: 320, maxWidth: 520, width: "100%" }}>
              <TextField
                fullWidth
                placeholder="Search…"
                size="small"
                value={q}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </MDBox>

            {/* Filtri moderni (Autocomplete pill) solo su Threat Types */}
            {tab === 1 && (
              <MDBox display="flex" alignItems="center" gap={1.5} flexWrap="wrap" width="100%">
                {/* Label sezione filtri */}
                <MDBox display="flex" alignItems="center" gap={0.5}>
                  <FilterAltIcon fontSize="small" />
                  <MDTypography variant="button">Filtri</MDTypography>
                </MDBox>

                {/* Severity */}
                <Autocomplete
                  size="small"
                  sx={{ minWidth: 220, ...pillAutocompleteSx }}
                  options={severityOptions}
                  value={severityFilter}
                  onChange={(_, v) => setSeverityFilter(v ?? "ANY")}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Severity"
                      placeholder="Any"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <InputAdornment position="start">
                              <Icon fontSize="small">report</Icon>
                            </InputAdornment>
                            {params.InputProps.startAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  clearOnEscape
                />

                {/* Category */}
                <Autocomplete
                  size="small"
                  sx={{ minWidth: 260, ...pillAutocompleteSx }}
                  options={uniqueCategories}
                  value={categoryFilter}
                  onChange={(_, v) => setCategoryFilter(v ?? "ANY")}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Category"
                      placeholder="Any"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <InputAdornment position="start">
                              <Icon fontSize="small">label</Icon>
                            </InputAdornment>
                            {params.InputProps.startAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  clearOnEscape
                />

                {/* Chips stato + Reset (a destra) */}
                <Stack direction="row" spacing={1} sx={{ ml: "auto" }} useFlexGap flexWrap="wrap">
                  {severityFilter !== "ANY" && (
                    <Chip
                      size="small"
                      color="primary"
                      variant="outlined"
                      label={`Severity: ${severityFilter.toLowerCase()}`}
                      onDelete={() => setSeverityFilter("ANY")}
                      deleteIcon={<ClearIcon />}
                    />
                  )}
                  {categoryFilter !== "ANY" && (
                    <Chip
                      size="small"
                      color="primary"
                      variant="outlined"
                      label={`Category: ${categoryFilter}`}
                      onDelete={() => setCategoryFilter("ANY")}
                      deleteIcon={<ClearIcon />}
                    />
                  )}
                  {(severityFilter !== "ANY" || categoryFilter !== "ANY") && (
                    <MDButton
                      color="secondary"
                      variant="outlined"
                      size="small"
                      onClick={resetFilters}
                    >
                      Reset filtri
                    </MDButton>
                  )}
                </Stack>
              </MDBox>
            )}
          </MDBox>
        </Card>
      </MDBox>

      <MDBox pt={1} pb={6}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            {tab === 0 ? (
              <TableCard
                title="Rules"
                subtitle="Mappa completa delle regole applicate ai flussi"
                columns={rulesColumns}
                rows={rulesRows}
                total={rules.total}
                loading={rules.loading}
                onPrev={() => fetchRules(rules.limit, Math.max(0, rules.offset - rules.limit), q)}
                onNext={() => fetchRules(rules.limit, rules.offset + rules.limit, q)}
                canPrev={rules.offset > 0}
                canNext={rules.offset + rules.limit < rules.total}
                onExport={() => exportCSV(rulesRows, "rules.csv")}
              />
            ) : (
              <TableCard
                title="Threat Types"
                subtitle="Classificazione, severità e mitigazioni suggerite"
                columns={typesColumns}
                rows={typesRows}
                total={filteredTypes.length}
                loading={types.loading}
                onPrev={() => fetchTypes(types.limit, Math.max(0, types.offset - types.limit), q)}
                onNext={() => fetchTypes(types.limit, types.offset + types.limit, q)}
                canPrev={types.offset > 0}
                canNext={types.offset + types.limit < types.total}
                extraToolbar={
                  <MDTypography variant="caption" color="text">
                    {filteredTypes.length} risultati filtrati
                  </MDTypography>
                }
                onExport={() => exportCSV(typesRows, "threat_types.csv")}
              />
            )}
          </Grid>
        </Grid>
      </MDBox>
    </DashboardLayout>
  );
}

export default ThreatDatabase;
