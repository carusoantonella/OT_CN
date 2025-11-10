// src/layouts/newproject/components/VerifyObjects.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMaterialUIController, setWizardData } from "context";
import { xml2js } from "xml-js";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Paper,
  Button,
  Container,
} from "@mui/material";
// Material Dashboard 2 React components
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import MDBox from "components/MDBox";

// Template imports
import WorkflowStepper from "../WorkflowStepper";
import DataTable from "examples/Tables/DataTable";
import tableDataObjects from "./VerifyObjectsTableData";
import tableDataGroups from "./VerifyGroupsTableData";
import tableDataEdges from "./VerifyEdgesTableData";
import ItemCard from "./ItemCard";
import { API_BASE, authFetch } from "utils/auth";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
// WebM for step 2
import VerigyObjectWebM from "assets/images/Verify_Object.webm";

function arrayify(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

const SYSTEM_KEYS = [
  "id",
  "x",
  "y",
  "width",
  "height",
  "nature",
  "iconName",
  "groupType",
  "source",
  "target",
  "parentGroupId",
];

export default function VerifyObjects() {
  const [controller, dispatch] = useMaterialUIController();
  const { wizardData: state = {} } = controller;
  console.log("🚀 VerifyObjects.jsx wizardData:", state);
  const navigate = useNavigate();

  // XML e nodi da Context (wizardData)
  const xmlString = state.xmlString || "";
  const diagramImage = state.diagramImage || "";
  const projectId = state.projectId || null; // <-- aggiungi questa riga

  // states: oggetti+gruppi in “items”, edge in “edges”
  const [items, setItems] = useState([]);
  const [edges, setEdges] = useState([]);
  const [edgesVersion, setEdgesVersion] = useState(0);

  // per dialog di editing
  const [editingItem, setEditingItem] = useState(null);
  const [draftMeta, setDraftMeta] = useState({});

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loadingNext, setLoadingNext] = useState(false);
  // ─── Caricamento da XML o da initialNodes ─────────────────────────────────────────
  useEffect(() => {
    const initialNodesLocal = state.nodes || [];
    console.log(
      "[VerifyObjects] diagramImage length:",
      diagramImage?.length,
      diagramImage ? "(ricevuta)" : "(VUOTA o mancante)"
    );
    const parseEdgesFromXml = () => {
      if (!xmlString) return;
      const parsed = xml2js(xmlString, { compact: true });
      const diag = parsed.diagram || {};
      // arrayify su diag.connections (auto array se ce n'è uno solo)
      const rawConns = Array.isArray(diag.connections)
        ? diag.connections
        : diag.connections
        ? [diag.connections]
        : [];
      const connsArr = rawConns.map((c) => {
        const a = c._attributes || {};
        const displayMeta = Object.fromEntries(
          Object.entries(a).filter(([k]) => !SYSTEM_KEYS.includes(k))
        );
        return {
          id: a.id,
          label: a.label || `${a.source}→${a.target}`,
          source: a.source,
          target: a.target,
          nature: "connection", // deve corrispondere a VerifyEdgesTableData.js
          metadata: a,
          data: { metadata: a },
          displayMetadata: displayMeta,
        };
      });
      console.log(
        "🗺 parseEdgesFromXml ristampa:",
        connsArr.map((c) => c.displayMetadata.protocol)
      );
      setEdges(connsArr);
    };

    // se arrivo dal diagram (initialNodes)
    if (Array.isArray(initialNodesLocal) && initialNodesLocal.length > 0) {
      const objs = initialNodesLocal.map((n) => {
        // prendo metadata e displayMetadata direttamente dai campi che ho salvato
        const fullMeta = n.metadata || {};
        const displayMeta = Object.fromEntries(
          Object.entries(n.displayMetadata || fullMeta).filter(([k]) => !SYSTEM_KEYS.includes(k))
        );
        return {
          id: n.id,
          label: n.label,
          // se hai bisogno di distinguere gruppi, conserva anche n.nature o n.type
          nature: n.nature || (n.type === "groupNode" ? "group" : "generic"),
          metadata: fullMeta,
          displayMetadata: displayMeta,
        };
      });
      setItems(objs);
      parseEdgesFromXml();
    }

    // altrimenti da XML
    if (!xmlString) return;
    const parsed = xml2js(xmlString, { compact: true });
    const diag = parsed.diagram || {};

    // ── groups ─────────────────
    const rawGroups = Array.isArray(diag.groups) ? diag.groups : diag.groups ? [diag.groups] : [];
    const groupsArr = rawGroups.map((g) => {
      const a = g._attributes || {};
      const displayMeta = Object.fromEntries(
        Object.entries(a).filter(([k]) => !SYSTEM_KEYS.includes(k))
      );
      return {
        id: a.id,
        label: a.label,
        nature: "group",
        metadata: a,
        displayMetadata: displayMeta,
      };
    });

    // ── elements standalone ─────────────────
    const rawEls = Array.isArray(diag.elements)
      ? diag.elements
      : diag.elements
      ? [diag.elements]
      : [];
    const elsArr = rawEls.map((el) => {
      const b = el._attributes || {};
      const displayMeta = Object.fromEntries(
        Object.entries(b).filter(([k]) => !SYSTEM_KEYS.includes(k))
      );
      return {
        id: b.id,
        label: b.label,
        nature: b.nature || "generic",
        metadata: b,
        displayMetadata: displayMeta,
      };
    });

    // ── elementi figli dei gruppi ─────────────────
    const groupChildArr = rawGroups.flatMap((g) => {
      // g.elements può essere: undefined, un singolo oggetto, un array, o { elements: [...] }
      const container = g.elements?.elements ?? g.elements;
      const childs = Array.isArray(container) ? container : container ? [container] : [];
      return childs.map((el) => {
        const b = el._attributes || {};
        const displayMeta = Object.fromEntries(
          Object.entries(b).filter(([k]) => !SYSTEM_KEYS.includes(k))
        );
        return {
          id: b.id,
          label: b.label,
          nature: b.nature || "generic",
          metadata: b,
          displayMetadata: displayMeta,
        };
      });
    });

    // ── connections (edge) ─────────────────
    // ── connections (edge): ciascun <connections …/> è direttamente in diag.connections
    const rawConns = arrayify(diag.connections);
    console.log("Parsed rawConns:", rawConns);
    const connsArr = rawConns.map((c) => {
      const a = c._attributes || {};
      const displayMeta = Object.fromEntries(
        Object.entries(a).filter(([k]) => !SYSTEM_KEYS.includes(k))
      );
      return {
        id: a.id,
        source: a.source,
        target: a.target,
        nature: "connection",
        metadata: a,
        data: { metadata: a },
        displayMetadata: displayMeta,
      };
    });

    // includi anche gli elementi figli dei gruppi
    const combined = [...groupsArr, ...elsArr, ...groupChildArr];
    // rimuovi eventuali duplicati per id
    const unique = combined.filter(
      (item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx
    );
    setItems(unique);
    setEdges(connsArr);
  }, [xmlString, state.nodes, diagramImage]);

  // ─── Handlers per modify & delete ─────────────────────────────────────────────
  const handleItemChange = useCallback((id, newMeta) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        // preservo SOLO i campi di sistema
        const systemPart = Object.fromEntries(
          Object.entries(it.metadata).filter(([k]) => SYSTEM_KEYS.includes(k))
        );
        // ricostruisco metadata = systemPart + nuovi campi custom
        const fullMeta = { ...systemPart, ...newMeta };
        return {
          ...it,
          metadata: fullMeta,
          displayMetadata: newMeta,
        };
      })
    );
  }, []);

  const handleEdgeChange = useCallback((id, newMeta) => {
    setEdges((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        // preservo SOLO i campi di sistema
        const systemPart = Object.fromEntries(
          Object.entries(e.metadata).filter(([k]) => SYSTEM_KEYS.includes(k))
        );
        // ricostruisco metadata = systemPart + nuovi campi custom
        const fullMeta = { ...systemPart, ...newMeta };
        return {
          ...e,
          metadata: fullMeta,
          data: { metadata: fullMeta },
          displayMetadata: newMeta,
        };
      })
    );
  }, []);

  const handleItemDelete = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const handleEdgeDelete = useCallback((id) => {
    setEdges((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // ora prende solo l'id, carica SOLO displayMetadata
  const handleItemEdit = useCallback(
    (id) => {
      const it = items.find((i) => i.id === id);
      if (it) {
        setEditingItem({ ...it, isEdge: false });
        setDraftMeta(it.displayMetadata);
      } else {
        const e = edges.find((e) => e.id === id);
        if (e) {
          setEditingItem({
            id: e.id,
            label: `${e.source} → ${e.target}`,
            nature: e.nature,
            isEdge: true,
          });
          setDraftMeta(e.displayMetadata);
        }
      }
    },
    [items, edges]
  );

  // ─── Nuova versione di handleNext ───────────────────────────────────────────────
  const proceedNext = useCallback(async () => {
    setLoadingNext(true);
    // 1) Costruisco il payload JSON a partire da items (divido groups vs nodes) ed edges:
    const projectInfo = state.projectInfo || {};
    const groupsArray = items
      .filter((it) => it.nature === "group")
      .map((g) => ({
        id: g.id,
        label: g.label,
        metadata: g.metadata,
        displayMetadata: g.displayMetadata,
      }));

    const nodesArray = items
      .filter((it) => it.nature !== "group")
      .map((n) => ({
        id: n.id,
        label: n.label,
        metadata: n.metadata,
        displayMetadata: n.displayMetadata,
      }));

    const edgesArray = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      metadata: e.metadata,
      displayMetadata: e.displayMetadata,
    }));

    // Catalogo nodi per SM_Nodes (uno per ogni nodo NON di tipo group)
    const node_catalog = nodesArray.map((n) => {
      const meta = n.metadata || {};
      return {
        node_id_xml: n.id, // ID del nodo nel diagramma/XML
        label: n.label,
        nature: n.nature || meta.nature || "generic",
        iconName: meta.iconName || meta.icon_name || undefined,
        elementTypeName: meta.nature || n.nature || undefined,
        security_props: n.displayMetadata || {}, // proprietà "custom" visibili nel FE
      };
    });

    if (projectId) {
      try {
        const saveNodesRes = await authFetch(`${API_BASE}/newproject/${projectId}/nodes`, {
          method: "POST",
          body: JSON.stringify({ node_catalog }),
        });
        if (!saveNodesRes.ok) {
          const t = await saveNodesRes.text().catch(() => "");
          console.warn("Save SM_Nodes non OK:", saveNodesRes.status, t);
        }
      } catch (e) {
        console.warn("Errore salvataggio SM_Nodes:", e);
      }
    }

    const edge_catalog = (edges || []).map((e) => ({
      edge_source_xml: e.edge_source_xml || e.source || e.sourceId || e.from || null,
      edge_target_xml: e.edge_target_xml || e.target || e.targetId || e.to || null,
      security_property: e?.displayMetadata?.protocol || null,
    }));

    // invia gli edges
    if (projectId && edge_catalog.length > 0) {
      try {
        const saveEdgesRes = await authFetch(`${API_BASE}/newproject/${projectId}/edges`, {
          method: "POST",
          body: JSON.stringify({ edge_catalog }),
        });
        if (!saveEdgesRes.ok) {
          const t = await saveEdgesRes.text().catch(() => "");
          console.warn("Save SM_Edge non OK:", saveEdgesRes.status, t);
        }
      } catch (e) {
        console.warn("Errore salvataggio SM_Edge:", e);
      }
    }

    const payload = {
      project_id: projectId,
      node_catalog,
      groups: groupsArray,
      nodes: nodesArray,
      edges: edgesArray,
    };
    // ─── CVE lookup con fetch “plain” ──────────────────────
    const nodesWithVV = nodesArray.filter((n) => n.metadata.vendor && n.metadata.version);

    const cvePairs = await Promise.all(
      nodesWithVV.map(async (n) => {
        const { vendor, version } = n.metadata;
        const product = n.nature; // o altro campo prodotto
        try {
          const query = new URLSearchParams({ vendor, version }).toString();
          const res = await authFetch(`${API_BASE}/vuln/csv?${query}`);
          if (!res.ok) throw new Error(await res.text());
          const list = await res.json();
          return [n.id, list];
        } catch (err) {
          console.error("CVE lookup failed:", err);
          return [n.id, []];
        }
      })
    );
    const cveMap = Object.fromEntries(cvePairs);

    try {
      const res = await authFetch(`${API_BASE}/threats/detect`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        console.error("detect → 401 Unauthorized");
        navigate("/authentication/sign-in");
        return;
      }
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`detect failed: ${res.status} ${t}`);
      }
      const data = await res.json().catch(() => ({}));
      setWizardData(dispatch, {
        projectInfo,
        xmlString,
        diagramXml: xmlString,
        nodes: nodesArray,
        edges: edgesArray,
        diagramImage,
        detected: data.detected_threats,
        cveMap,
        groups: groupsArray,
        projectId,
      });
      navigate("/newproject/analysis");
    } catch (err) {
      console.error("Errore chiamando /threats/detect:", err);
      // opzionale: snackbar
      navigate("/newproject/analysis"); // se vuoi proseguire comunque
    } finally {
      setLoadingNext(false);
    }
  }, [items, edges, projectId, state.projectInfo, xmlString, diagramImage, dispatch, navigate]);

  const handleNext = useCallback(() => {
    setConfirmOpen(true);
  }, []);

  // ─── Preparo i 3 set di dati per DataTable ───────────────────────────────────
  const objectItems = items.filter((it) => it.nature !== "group");
  const groupItems = items.filter((it) => it.nature === "group");

  const objectsTable = tableDataObjects(objectItems, handleItemEdit, handleItemDelete);
  const groupsTable = tableDataGroups(groupItems, handleItemEdit, handleItemDelete);
  // ── Mappo ogni node id alla sua label
  const idToLabel = Object.fromEntries(items.map((it) => [it.id, it.label]));

  // ── Creo un array di edge con source/target già "tradotti" in label
  const edgesWithLabels = edges.map((e) => ({
    ...e,
    source: idToLabel[e.source] || e.source,
    target: idToLabel[e.target] || e.target,
  }));

  // ── Passo gli edge “etichettati” alla tabella
  const edgesTable = tableDataEdges(edgesWithLabels, handleItemEdit, handleEdgeDelete);

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
      {/* ─── Stepper Sticky ──────────────────────────────────────────── */}
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
          activeStep={2}
          helperMediaPerStep={[
            {}, // step 0
            {}, // step 1
            { webm: VerigyObjectWebM }, // step 2
            {}, // step 3
          ]}
          mediaSize={64}
        />
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={-6}>
          <MDTypography variant="h4" color="dark"></MDTypography>
          <Box sx={{ mr: 2 /* sposta il Box (e quindi il bottone) di 16px verso sinistra */ }}>
            <MDButton variant="gradient" color="dark" onClick={handleNext}>
              NEXT
            </MDButton>
          </Box>
        </Box>
      </Box>

      {/* ─── Area Scrollabile con 3 Tabelle ──────────────────────────────── */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", mt: 2 }}>
        {/* —————— Oggetti —————— */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <MDBox
            variant="gradient"
            bgColor="light"
            borderRadius="lg"
            coloredShadow="dark"
            mb={2}
            px={2}
            py={1}
            display="flex"
            flexDirection="column"
            gap={0.5}
          >
            <MDTypography variant="h5" color="dark">
              Assets Identified
            </MDTypography>
            <MDTypography variant="caption" color="text">
              Review properties before proceeding
            </MDTypography>
          </MDBox>
          <DataTable
            table={objectsTable}
            isSorted={false}
            entriesPerPage={false}
            showTotalEntries={false}
            noEndBorder
          />
        </Paper>

        {/* —————— Gruppi —————— */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <MDBox
            variant="gradient"
            bgColor="light"
            borderRadius="lg"
            coloredShadow="dark"
            mb={2}
            px={2}
            py={1}
            display="flex"
            flexDirection="column"
            gap={0.5}
          >
            <MDTypography variant="h5" color="dark">
              Identified Security Zones
            </MDTypography>
            <MDTypography variant="caption" color="text">
              Verify group metadata
            </MDTypography>
          </MDBox>
          <DataTable
            table={groupsTable}
            isSorted={false}
            entriesPerPage={false}
            showTotalEntries={false}
            noEndBorder
          />
        </Paper>

        {/* —————— Connessioni —————— */}
        <Paper sx={{ p: 3 }}>
          <MDBox
            variant="gradient"
            bgColor="light"
            borderRadius="lg"
            coloredShadow="dark"
            mb={2}
            px={2}
            py={1}
            display="flex"
            flexDirection="column"
            gap={0.5}
          >
            <MDTypography variant="h5" color="dark">
              Edge List
            </MDTypography>
            <MDTypography variant="caption" color="text">
              Review source, target, and edge properties.
            </MDTypography>
          </MDBox>
          <DataTable
            key={`edges-v${edgesVersion}`}
            // passo sempre un nuovo oggetto letterale,
            // così DataTable ricalcola colonne e righe
            table={{
              columns: edgesTable.columns,
              rows: edgesTable.rows,
            }}
            isSorted={false}
            entriesPerPage={false}
            showTotalEntries={false}
            noEndBorder
          />
        </Paper>
      </Box>

      {/* ─── Dialog Modifica ───────────────────────────────────────────── */}
      <Dialog
        open={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit {editingItem?.label}</DialogTitle>
        <DialogContent>
          <ItemCard
            id={editingItem?.id}
            label={editingItem?.label}
            nature={editingItem?.nature}
            metadata={draftMeta}
            onChange={(newMeta) => setDraftMeta(newMeta)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingItem(null)}>Cancel</Button>
          <Button
            sx={{
              backgroundColor: "#1976d2", // usa il tuo primary
              color: "#fff", // testo bianco forzato
              "&:hover": {
                backgroundColor: "#115293", // hover coerente con il tema
              },
            }}
            onClick={() => {
              if (editingItem?.isEdge) {
                handleEdgeChange(editingItem.id, { protocol: draftMeta.protocol });
              } else {
                handleItemChange(editingItem.id, draftMeta);
              }
              setEditingItem(null);
            }}
          >
            Salva
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: 6,
          },
        }}
      >
        <DialogTitle sx={{ textAlign: "center", fontWeight: 700 }}>
          Confirm items and properties
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            py: 3,
          }}
        >
          <MDTypography variant="body2" color="text" sx={{ mb: 2, textAlign: "center" }}>
            Next, the analysis will use:
          </MDTypography>

          <Paper
            elevation={3}
            sx={{
              width: "100%",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "center",
              }}
            >
              <thead style={{ backgroundColor: "#f5f5f5" }}>
                <tr>
                  <th style={{ padding: "8px", fontWeight: 600 }}>Assets</th>
                  <th style={{ padding: "8px", fontWeight: 600 }}>Edge</th>
                  <th style={{ padding: "8px", fontWeight: 600 }}>Zone</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "12px", fontSize: 18, fontWeight: 700 }}>
                    {items.filter((it) => it.nature !== "group").length}
                  </td>
                  <td style={{ padding: "12px", fontSize: 18, fontWeight: 700 }}>{edges.length}</td>
                  <td style={{ padding: "12px", fontSize: 18, fontWeight: 700 }}>
                    {items.filter((it) => it.nature === "group").length}
                  </td>
                </tr>
              </tbody>
            </table>
          </Paper>

          <MDTypography variant="caption" color="text" sx={{ mt: 2, textAlign: "center" }}>
            Your settings will be saved and applied during threat detection.
          </MDTypography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", p: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} sx={{ mr: 1 }}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              setConfirmOpen(false);
              await proceedNext();
            }}
            variant="contained"
            sx={{
              backgroundColor: "#1976d2",
              color: "#fff",
              px: 3,
              "&:hover": { backgroundColor: "#115293" },
            }}
          >
            Confirm & proceed
          </Button>
        </DialogActions>
      </Dialog>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loadingNext}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </Container>
  );
}
