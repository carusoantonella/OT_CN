// src/App.jsx
import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMaterialUIController, setWizardData } from "context";
import { API_BASE, authFetch } from "utils/auth";
import { Box } from "@mui/material";
import MDButton from "components/MDButton";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Panel,
  MarkerType,
} from "reactflow";
import { v4 as uuidv4 } from "uuid";
import { FaBroom, FaDownload } from "react-icons/fa";
import "reactflow/dist/style.css";
import "./App.css";

import SplitPane from "react-split-pane";

import DeleteEdge from "./components/DeleteEdge.jsx";
import Sidebar from "./components/Sidebar.jsx";
import GenericNode from "./components/GenericNode.jsx";
import GroupNode from "./components/GroupNode.jsx";
import SecurityOption from "./components/SecurityOption.jsx";
import EdgeProtocol from "./components/EdgeProtocol.jsx";
import WorkflowStepper from "../WorkflowStepper";
import { useTheme } from "@mui/material/styles";
import { js2xml, xml2js } from "xml-js";
import { toPng } from "html-to-image";

// WebM for step 1
import DiagramEditorWebM from "assets/images/Diagram_Editor.webm";

const nodeTypes = {
  genericNode: GenericNode,
  groupNode: GroupNode,
};
const edgeTypes = { default: DeleteEdge };
export default function App() {
  const navigate = useNavigate();
  // Base URL dell'API (usa .env se presente)
  const [savingDiagram, setSavingDiagram] = useState(false);
  const [controller, dispatch] = useMaterialUIController();
  const { wizardData } = controller;
  const theme = useTheme();
  const xmlToImport = wizardData?.xmlString;
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // se stiamo importando, inizializziamo con quelli, altrimenti con array vuoti
  const initialNodesFromState = wizardData?.nodes || [];
  const initialEdgesFromState = wizardData?.edges || [];

  const [nodes, setNodes, onNodesChangeRaw] = useNodesState(initialNodesFromState);
  const [edges, setEdges, onEdgesChangeRaw] = useEdgesState(initialEdgesFromState);

  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);

  // HISTORY (undo/redo)
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const flowContainerRef = useRef(null);

  useEffect(() => {
    if (reactFlowInstance) {
      historyRef.current = [
        {
          nodes: reactFlowInstance.getNodes(),
          edges: reactFlowInstance.getEdges(),
        },
      ];
      historyIndexRef.current = 0;
    }
  }, [reactFlowInstance]);

  const pushHistory = useCallback(() => {
    if (!reactFlowInstance) return;
    const snap = {
      nodes: reactFlowInstance.getNodes(),
      edges: reactFlowInstance.getEdges(),
    };
    const idx = historyIndexRef.current;
    const newHist = historyRef.current.slice(0, idx + 1);
    newHist.push(snap);
    historyRef.current = newHist;
    historyIndexRef.current = idx + 1;
  }, [reactFlowInstance]);

  // gestione tasti (undo e delete)
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") {
        e.preventDefault();
        const idx = historyIndexRef.current;
        if (idx > 0) {
          historyIndexRef.current = idx - 1;
          const prev = historyRef.current[idx - 1];
          setNodes(prev.nodes);
          setEdges(prev.edges);
        }
      } else if (e.key === "Delete") {
        // rimuovi nodi selezionati
        setNodes((nds) => nds.filter((n) => !n.selected));
        // rimuovi anche gli edge selezionati
        setEdges((eds) =>
          eds.filter(
            (edge) =>
              !edge.selected &&
              !nodes.some((n) => n.selected && (edge.source === n.id || edge.target === n.id))
          )
        );
        pushHistory();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [nodes, pushHistory, setNodes, setEdges]);

  // wrapper per modifiche
  const handleNodesChange = useCallback(
    (changes) => {
      onNodesChangeRaw(changes);
      pushHistory();
    },
    [onNodesChangeRaw, pushHistory]
  );
  const handleEdgesChange = useCallback(
    (changes) => {
      onEdgesChangeRaw(changes);
      pushHistory();
    },
    [onEdgesChangeRaw, pushHistory]
  );

  // creazione nuova connessione con metadata e stile di default
  const onConnect = useCallback(
    (params) => {
      setEdges((eds) => {
        // proteggi eds da undefined
        const list = Array.isArray(eds) ? eds : [];
        if (list.some((e) => e.source === params.source && e.target === params.target)) {
          return list;
        }
        return [
          ...list,
          {
            id: `e-${uuidv4()}`,
            ...params,
            markerEnd: { type: MarkerType.Arrow },
            data: { metadata: { protocol: "" } },
            label: "",
            labelBgPadding: [6, 3],
            labelBgBorderRadius: 3,
            labelBgStyle: { fill: "#fff", fillOpacity: 0.8 },
            labelStyle: {
              fill: "#222",
              fontSize: 10,
              fontWeight: "10",
              fontStyle: "italic",
            },
            style: { stroke: "#555", strokeWidth: 2 },
          },
        ];
      });
      pushHistory();
    },
    [setEdges, pushHistory]
  );

  // clic su edge → apri ProtocolModal
  const handleEdgeClick = useCallback((_, edge) => {
    setSelectedNode(null);
    setSelectedEdge(edge);
  }, []);

  // salva protocollo e aggiorna colore stroke
  const handleSaveEdge = useCallback(
    (id, protocol) => {
      const colorMap = { http: "#f1c40f", https: "#2ecc71", ftp: "#3498db" };
      const strokeColor = colorMap[protocol] || "#555";
      setEdges((eds = []) =>
        eds.map((e) =>
          e.id === id
            ? {
                ...e,
                data: { metadata: { protocol } },
                style: { ...e.style, stroke: strokeColor, strokeWidth: 2 },
                label: protocol.toUpperCase(),
                labelStyle: {
                  fill: "#222",
                  fontSize: 10,
                  fontWeight: "10",
                  fontStyle: "italic",
                },
              }
            : e
        )
      );
      pushHistory();
      setSelectedEdge(null);
    },
    [setEdges, setSelectedEdge, pushHistory]
  );

  // elimina singolo nodo
  const handleDeleteSingleNode = useCallback(
    (id) => {
      setNodes((nds = []) => nds.filter((n) => n.id !== id));
      setEdges((eds = []) => eds.filter((e) => e.source !== id && e.target !== id));
      setSelectedNode(null);
      pushHistory();
    },
    [setNodes, setEdges, pushHistory]
  );

  // pulisci tutto
  const handleClean = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    pushHistory();
  }, [setNodes, setEdges, setSelectedNode, pushHistory]);

  // salva metadata nodo
  const handleSaveMetadata = useCallback(
    (id, metadata) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, metadata } } : n))
      );
      pushHistory();
      setSelectedNode(null);
    },
    [setNodes, pushHistory]
  );

  // drag & drop nodi
  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);
  const onDrop = useCallback(
    (evt) => {
      evt.preventDefault();
      if (!reactFlowInstance || !reactFlowWrapper.current) return;
      const rect = reactFlowWrapper.current.getBoundingClientRect();
      const data = JSON.parse(evt.dataTransfer.getData("application/reactflow"));
      const pos = reactFlowInstance.project({
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top,
      });
      const id = `${data.type}-${uuidv4()}`;
      const isGroup = data.type === "group";
      const node = {
        id,
        type: isGroup ? "groupNode" : "genericNode",
        position: pos,
        data: {
          label: data.label,
          nature: data.type,
          metadata: {
            ...(data.metadata || {}),
            groupType: data.groupType,
            iconName: data.iconName,
          },
          childCount: 0,
          onDelete: () => handleDeleteSingleNode(id),
          openModal: () => {
            const n = reactFlowInstance.getNode(id);
            if (n) setSelectedNode(n);
          },
          onSaveLabel: handleSaveMetadata,
        },
        style: isGroup
          ? {
              width: 400,
              height: 300,
              backgroundColor: "transparent",
              border: "none",
              borderRadius: "5px",
              padding: "10px",
              zIndex: 1,
            }
          : { zIndex: 10 },
        connectable: true,
      };
      setNodes((nds) => {
        // Assicuriamoci che nds sia sempre un array
        const list = Array.isArray(nds) ? nds : [];
        return [...list, node];
      });
      pushHistory();
    },
    [reactFlowInstance, handleDeleteSingleNode, pushHistory, setNodes, handleSaveMetadata]
  );

  // logica gruppi + child
  const initialDragRef = useRef(null);
  const isNodeInGroup = useCallback((n, g) => {
    if (!g.style || !n.position || !g.position) return false;
    return (
      n.position.x > g.position.x &&
      n.position.y > g.position.y &&
      n.position.x < g.position.x + (g.style.width || 250) &&
      n.position.y < g.position.y + (g.style.height || 150)
    );
  }, []);

  // Restituisce il gruppo "più interno" che contiene il nodo,
  // cioè quello con area width*height più piccola tra quelli che lo contengono.
  // Restituisce il gruppo "più interno" che contiene il nodo,
  // cioè quello con area width*height più piccola tra quelli che lo contengono.
  const getDirectParentGroup = (node, groupNodes) => {
    if (!Array.isArray(groupNodes) || !groupNodes.length) return null;

    // tutti i gruppi che contengono il nodo (può essere nonno, padre, ecc.)
    const containers = groupNodes.filter((g) => isNodeInGroup(node, g));
    if (!containers.length) return null;

    // scegliamo il gruppo con bounding box più piccola
    return containers.reduce((best, g) => {
      const w = g.style?.width || 0;
      const h = g.style?.height || 0;
      const area = w * h;

      const bw = best.style?.width || 0;
      const bh = best.style?.height || 0;
      const bestArea = bw * bh;

      return area < bestArea ? g : best;
    });
  };

  // ID logico del gruppo: uno dei 10 valori (Level_x_P2M, cloud, onPremise)
  // fallback: id del nodo se manca tutto
  const getGroupLogicalId = (groupNode) =>
    groupNode?.data?.metadata?.groupId || groupNode?.data?.metadata?.groupType || groupNode?.id;

  // Restituisce la lista di nodi con data.metadata.parentGroup* impostato
  const attachParentGroupToNodes = (allNodes, groupNodes) => {
    const result = allNodes.map((node) => {
      // non toccare i groupNode stessi
      if (node.type === "groupNode") return node;

      // 🔹 QUI: passo l'ARRAY dei gruppi, non il singolo g
      const parent = getDirectParentGroup(node, groupNodes);
      const parentNodeId = parent ? parent.id : null;
      const parentLogicalId = parent ? getGroupLogicalId(parent) : null;
      const parentLabel = parent ? parent.data?.label || "" : "";

      const updated = {
        ...node,
        data: {
          ...node.data,
          metadata: {
            ...(node.data?.metadata || {}),
            parentGroupId: parentNodeId, // legacy
            parentGroupNodeId: parentNodeId, // istanza
            parentGroupLogicalId: parentLogicalId,
            parentLabel,
          },
        },
      };

      return updated;
    });

    console.log(
      "[DEBUG] attachParentGroupToNodes → parentGroup per nodo:",
      result.map((n) => ({
        id: n.id,
        label: n.data?.label,
        parentGroupId: n.data?.metadata?.parentGroupId ?? null,
        parentGroupNodeId: n.data?.metadata?.parentGroupNodeId ?? null,
        parentGroupLogicalId: n.data?.metadata?.parentGroupLogicalId ?? null,
        parentLabel: n.data?.metadata?.parentLabel ?? null,
      }))
    );

    return result;
  };

  const handleNodeDragStart = useCallback(
    (_, node) => {
      if (node.type === "groupNode") {
        // prendi TUTTI i nodi (genericNode o groupNode) che ricadono dentro il gruppo
        const children = nodes
          .filter((n) => n.id !== node.id && isNodeInGroup(n, node))
          .map((n) => n.id);
        const positions = {};
        nodes.forEach((n) => {
          if (children.includes(n.id)) {
            positions[n.id] = { x: n.position.x, y: n.position.y };
          }
        });
        initialDragRef.current = {
          id: node.id,
          sx: node.position.x,
          sy: node.position.y,
          children,
          positions,
        };
      }
    },
    [nodes, isNodeInGroup]
  );
  const handleNodeDragStop = useCallback(
    (_, node) => {
      const info = initialDragRef.current;
      if (info && node.type === "groupNode" && info.id === node.id) {
        const dx = node.position.x - info.sx;
        const dy = node.position.y - info.sy;

        // sposta tutti i figli
        setNodes((nds = []) =>
          nds.map((n) =>
            info.children.includes(n.id)
              ? {
                  ...n,
                  position: {
                    x: info.positions[n.id].x + dx,
                    y: info.positions[n.id].y + dy,
                  },
                }
              : n
          )
        );

        // ricalcolo parentGroupId con l'ID logico del gruppo
        // --- ricalcolo parentGroup* per tutti i genericNode ---
        setNodes((nds) => {
          const groups = nds.filter((g) => g.type === "groupNode");

          return nds.map((n) => {
            if (n.type !== "genericNode") return n;

            const parent = getDirectParentGroup(n, groups);
            const parentNodeId = parent ? parent.id : null;
            const parentLogicalId = parent ? getGroupLogicalId(parent) : null;
            const parentLabel = parent ? parent.data?.label || "" : "";

            return {
              ...n,
              data: {
                ...n.data,
                metadata: {
                  ...(n.data?.metadata || {}),
                  parentGroupId: parentNodeId, // legacy
                  parentGroupNodeId: parentNodeId, // istanza
                  parentGroupLogicalId: parentLogicalId,
                  parentLabel,
                },
              },
            };
          });
        });

        initialDragRef.current = null;
        pushHistory();
      }
    },
    [setNodes, isNodeInGroup, pushHistory]
  );

  // click su nodo
  const handleNodeClick = useCallback((_, node) => {
    setSelectedEdge(null);
    setSelectedNode(node);
  }, []);

  const handleDeleteEdge = useCallback(
    (id) => {
      setEdges((eds = []) => eds.filter((e) => e.id !== id));
      pushHistory();
      setSelectedEdge(null);
    },
    [setEdges, pushHistory, setSelectedEdge]
  );

  const xmlEscape = (str) =>
    String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  // Escapa tutte le stringhe negli attributi XML
  const sanitizeAttributesForXml = (attrs) => {
    const result = {};
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (typeof value === "string") {
        result[key] = xmlEscape(value);
      } else {
        result[key] = value;
      }
    });
    return result;
  };

  const exportToXml = useCallback(() => {
    // 1) Costruisci l’oggetto JS da serializzare
    const groupNodes = nodes.filter((n) => n.type === "groupNode");
    const genericNodes = nodes.filter((n) => n.type === "genericNode");
    const xmlObj = {
      diagram: {
        _attributes: { version: "1.0", date: new Date().toISOString() },
        elements: [],
        groups: [],
        connections: [],
      },
    };

    groupNodes.forEach((g) => {
      const rawAttrs = {
        id: g.id,
        label: g.data.label,
        x: g.position.x,
        y: g.position.y,
        width: g.style?.width,
        height: g.style?.height,
        nature: "group",
        ...g.data.metadata,
      };
      const attrs = sanitizeAttributesForXml(rawAttrs);

      const grp = { _attributes: attrs, elements: [] };

      genericNodes.forEach((n) => {
        const parent = getDirectParentGroup(n, groupNodes);
        if (parent && parent.id === g.id) {
          const rawChildAttrs = {
            id: n.id,
            label: n.data.label,
            x: n.position.x,
            y: n.position.y,
            nature: n.data.nature || "generic",
            ...n.data.metadata,
          };
          grp.elements.push({
            _attributes: sanitizeAttributesForXml(rawChildAttrs),
          });
        }
      });
      xmlObj.diagram.groups.push(grp);
    });

    genericNodes.forEach((n) => {
      if (!groupNodes.some((g) => isNodeInGroup(n, g))) {
        const rawStandaloneAttrs = {
          id: n.id,
          label: n.data.label,
          x: n.position.x,
          y: n.position.y,
          nature: n.data.nature || "generic",
          ...n.data.metadata,
        };
        xmlObj.diagram.elements.push({
          _attributes: sanitizeAttributesForXml(rawStandaloneAttrs),
        });
      }
    });

    edges.forEach((e) => {
      xmlObj.diagram.connections.push({
        _attributes: {
          id: e.id,
          source: e.source,
          target: e.target,
          protocol: e.data?.metadata?.protocol || "",
        },
      });
    });

    // 2) Serializza in XML
    const xml = js2xml({ diagram: xmlObj.diagram }, { compact: true, spaces: 4 });

    // 3) Crea un Blob e forza il download
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.xml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [nodes, edges, isNodeInGroup]);

  // Salva il diagramma (XML) creando il progetto sul backend.
  const saveDiagramToServer = useCallback(
    async (xmlStr) => {
      const projectInfo = wizardData?.projectInfo || {};
      const payload = {
        nome_progetto: projectInfo.name || "Untitled Project",
        descrizione: projectInfo.description || "",
        xml_text: xmlStr,
        id_progetto: projectInfo.id || projectInfo.projectId || "",
        referente: projectInfo.referent || projectInfo.referente || "",
      };

      const authToken = localStorage.getItem("authToken");
      const res = await authFetch(`${API_BASE}/newproject`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error(
          "Errore salvataggio diagramma:",
          res.status,
          await res.text().catch(() => "")
        );
        return {};
      }
      const data = await res.json().catch(() => ({}));
      return {
        project_id: data.project_id,
        xml_url: data.xml_url,
        upload_file: data.upload_file,
      };
    },
    [wizardData]
  );

  const handleContinue = useCallback(async () => {
    // 1) Ricrea l’oggetto JS esattamente come in exportToXml
    const groupNodes = nodes.filter((n) => n.type === "groupNode");
    const genericNodes = nodes.filter((n) => n.type === "genericNode");
    const xmlObj = {
      diagram: {
        _attributes: { version: "1.0", date: new Date().toISOString() },
        elements: [],
        groups: [],
        connections: [],
      },
    };

    groupNodes.forEach((g) => {
      const rawAttrs = {
        id: g.id,
        label: g.data.label,
        x: g.position.x,
        y: g.position.y,
        width: g.style?.width,
        height: g.style?.height,
        nature: "group",
        ...g.data.metadata,
      };
      const attrs = sanitizeAttributesForXml(rawAttrs);

      const grp = { _attributes: attrs, elements: [] };
      genericNodes.forEach((n) => {
        if (
          n.position.x > g.position.x &&
          n.position.y > g.position.y &&
          n.position.x < g.position.x + (g.style?.width || 0) &&
          n.position.y < g.position.y + (g.style?.height || 0)
        ) {
          const b = {
            id: n.id,
            label: n.data.label,
            x: n.position.x,
            y: n.position.y,
            nature: n.data.nature || "generic",
            ...n.data.metadata,
          };
          grp.elements.push({ _attributes: sanitizeAttributesForXml(b) });
        }
      });
      xmlObj.diagram.groups.push(grp);
    });

    genericNodes.forEach((n) => {
      const insideGroup = groupNodes.some(
        (g) =>
          n.position.x > g.position.x &&
          n.position.y > g.position.y &&
          n.position.x < g.position.x + (g.style?.width || 0) &&
          n.position.y < g.position.y + (g.style?.height || 0)
      );
      if (!insideGroup) {
        const b = {
          id: n.id,
          label: n.data.label,
          x: n.position.x,
          y: n.position.y,
          nature: n.data.nature || "generic",
          ...n.data.metadata,
        };
        xmlObj.diagram.elements.push({ _attributes: sanitizeAttributesForXml(b) });
      }
    });

    edges.forEach((e) => {
      xmlObj.diagram.connections.push({
        _attributes: {
          id: e.id,
          source: e.source,
          target: e.target,
          protocol: e.data?.metadata?.protocol || "",
        },
      });
    });

    // 2) Serializza in XML
    const xmlStr = js2xml({ diagram: xmlObj.diagram }, { compact: true, spaces: 4 });

    // ▷1◁ Catturo l’immagine del canvas ReactFlow
    let diagramImage = "";

    try {
      // se il ref è valido, toPng restituisce una stringa lunga ~30-70 kB
      const dataUrl = await toPng(flowContainerRef.current, { cacheBust: true });
      diagramImage = dataUrl; //  <--  ASSEGNA QUI
    } catch (err) {
      console.error("Impossibile fare snapshot del diagramma:", err);
    }

    // ▷2◁ SALVA SUBITO IL DIAGRAMMA (XML) SUL BACKEND
    setSavingDiagram(true);
    const { project_id, xml_url, upload_file } = await saveDiagramToServer(xmlStr);
    setSavingDiagram(false);
    // ⬇️ prendo i groupNode
    const groupNodess = nodes.filter((n) => n.type === "groupNode");

    // ⬇️ applico la funzione che calcola il parentGroupId
    const nodesWithGroup = attachParentGroupToNodes(nodes, groupNodess);

    // ⬇️ LOG sintetico prima di salvare nello stato globale
    console.log(
      "[DEBUG] handleContinue → nodi con parentGroupId:",
      nodesWithGroup.map((n) => ({
        id: n.id,
        label: n.data?.label,
        parentGroupId: n.data?.metadata?.parentGroupId ?? null,
      }))
    );
    // 2) naviga passando anche la dataURL
    setWizardData(dispatch, {
      projectInfo: wizardData.projectInfo,
      xmlString: xmlStr,
      nodes: nodesWithGroup,
      edges,
      diagramImage,
      projectId: project_id || null, // useremo questo più avanti per agganciare minacce/CVE
      xmlUrl: xml_url || null, // comodo per linkare/riaprire
      uploadFile: upload_file || null,
    });
    navigate("/newproject/verify");
  }, [nodes, edges, navigate, dispatch, wizardData?.projectInfo, saveDiagramToServer]);

  const importDiagram = useCallback(
    (xmlString) => {
      const parsed = xml2js(xmlString, { compact: true });
      const diag = parsed.diagram || {};
      const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []);

      // Costruisci i nodi (gruppi + standalone)
      const nodesArr = [];

      const rawGroups =
        (diag.groups &&
          (Array.isArray(diag.groups)
            ? diag.groups
            : diag.groups.groups
            ? diag.groups.groups
            : [diag.groups])) ||
        [];
      rawGroups.forEach((g) => {
        const a = g._attributes || {};
        // Nodo gruppo
        nodesArr.push({
          id: a.id,
          type: "groupNode",
          position: { x: parseFloat(a.x) || 0, y: parseFloat(a.y) || 0 },
          data: {
            label: a.label,
            nature: "group",
            metadata: a,
            onDelete: () => handleDeleteSingleNode(a.id),
            openModal: () => {
              const nodeObj = reactFlowInstance?.getNode(a.id);
              if (nodeObj) setSelectedNode(nodeObj);
            },
            onSaveLabel: handleSaveMetadata,
          },
          style: {
            width: parseFloat(a.width) || 300,
            height: parseFloat(a.height) || 200,
            backgroundColor: "transparent",
            zIndex: 1,
          },
        });

        // Figli del gruppo
        const rawChilds =
          (g.elements &&
            (Array.isArray(g.elements)
              ? g.elements
              : g.elements.elements
              ? g.elements.elements
              : [g.elements])) ||
          [];
        rawChilds.forEach((el) => {
          const b = el._attributes || {};
          // ← QUI: inietto l’id del gruppo padre
          b.parentGroupId = a.groupId || a.groupType || a.id;
          nodesArr.push({
            id: b.id,
            type: "genericNode",
            position: { x: parseFloat(b.x) || 0, y: parseFloat(b.y) || 0 },
            data: {
              label: b.label,
              nature: b.nature || "generic",
              metadata: b,
              onDelete: () => handleDeleteSingleNode(b.id),
              openModal: () => {
                const nodeObj = reactFlowInstance?.getNode(b.id);
                if (nodeObj) setSelectedNode(nodeObj);
              },
              onSaveLabel: handleSaveMetadata,
            },
            style: { zIndex: 10 },
          });
        });
      });

      // ───────────────────────────────────────────────────
      // 2) Elementi standalone (fuori da ogni gruppo)
      // ───────────────────────────────────────────────────
      const rawStandalone =
        (diag.elements &&
          (Array.isArray(diag.elements)
            ? diag.elements
            : diag.elements.elements
            ? diag.elements.elements
            : [diag.elements])) ||
        [];
      rawStandalone.forEach((el) => {
        const b = el._attributes || {};
        nodesArr.push({
          id: b.id,
          type: "genericNode",
          position: { x: parseFloat(b.x) || 0, y: parseFloat(b.y) || 0 },
          data: {
            label: b.label,
            nature: b.nature || "generic",
            metadata: b,
            onDelete: () => handleDeleteSingleNode(b.id),
            openModal: () => {
              const nodeObj = reactFlowInstance?.getNode(b.id);
              if (nodeObj) setSelectedNode(nodeObj);
            },
            onSaveLabel: handleSaveMetadata,
          },
          style: { zIndex: 10 },
        });
      });
      // ───────────────────────────────────────────────────
      // 3) Connessioni (gestione array vs singolo)
      // ───────────────────────────────────────────────────
      const rawConns =
        (diag.connections &&
          (Array.isArray(diag.connections)
            ? diag.connections
            : diag.connections.connection
            ? diag.connections.connection
            : [diag.connections])) ||
        [];

      // Prepara una mappa id → posizione nodo
      const nodePositions = {};
      nodesArr.forEach((n) => {
        nodePositions[n.id] = n.position;
      });

      const edgesArr = rawConns.map((c) => {
        const e = c._attributes || {};
        const proto = e.protocol || "";
        const colorMap = { http: "#f1c40f", https: "#2ecc71", ftp: "#3498db" };

        // calcola handle dinamici in base alla geometria
        const srcPos = nodePositions[e.source] || { x: 0, y: 0 };
        const tgtPos = nodePositions[e.target] || { x: 0, y: 0 };
        const dx = tgtPos.x - srcPos.x;
        const dy = tgtPos.y - srcPos.y;
        // Solo due possibili accoppiate:
        //  • orizzontale → source→right, target→left
        //  • verticale   → source→bottom, target→top
        let sourceHandle, targetHandle;
        if (Math.abs(dx) > Math.abs(dy)) {
          sourceHandle = "source-right";
          targetHandle = "target-left";
        } else {
          sourceHandle = "source-bottom";
          targetHandle = "target-top";
        }

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle,
          targetHandle,
          markerEnd: { type: MarkerType.Arrow },
          data: { metadata: { protocol: proto } },
          style: { stroke: colorMap[proto.toLowerCase()] || "#555", strokeWidth: 2 },
          label: proto.toUpperCase(),
          labelBgPadding: [6, 3],
          labelBgBorderRadius: 3,
          labelBgStyle: { fill: "#fff", fillOpacity: 0.8 },
          labelStyle: { fill: "#222", fontSize: 10, fontWeight: "10", fontStyle: "italic" },
        };
      });

      setNodes(nodesArr);
      setEdges(edgesArr);
    },
    [reactFlowInstance, setNodes, setEdges, handleSaveMetadata, handleDeleteSingleNode]
  );

  useEffect(() => {
    if (xmlToImport) {
      importDiagram(xmlToImport);
    }
  }, [xmlToImport, importDiagram]);

  return (
    <div className="diagram-page">
      {/* ─── Stepper Sticky + Next ──────────────────────────────────────────── */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1100,
          backgroundColor: "background.paper",
          pb: 2,
          pt: 2,
          px: 3,
        }}
      >
        <WorkflowStepper
          activeStep={1}
          helperMediaPerStep={[
            {}, // step 0
            { webm: DiagramEditorWebM }, // step 1
            {}, // step 2
            {}, // step 3
          ]}
          mediaSize={100}
        />
        {/* Qui posizioniamo Back a sinistra e Prosegui a destra */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={-6.5}>
          <MDButton
            variant="outlined"
            color="info"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
          >
            BACK
          </MDButton>

          <MDButton
            variant="gradient"
            color="dark"
            onClick={handleContinue}
            disabled={savingDiagram}
          >
            {savingDiagram ? "Saving..." : "Next"}
          </MDButton>
        </Box>
      </Box>

      <div className="app-container">
        <ReactFlowProvider>
          <SplitPane
            split="vertical"
            minSize={320}
            defaultSize={320}
            style={{ height: "100%", width: "100%" }}
          >
            {/* SIDEBAR */}
            <div className="sidebar-container">
              <Sidebar />
            </div>

            {/* CANVAS + DRAWER */}
            <div
              className="reactflow-wrapper"
              ref={(el) => {
                reactFlowWrapper.current = el;
                flowContainerRef.current = el;
              }}
              onDragOver={onDragOver}
              onDrop={onDrop}
              tabIndex={0}
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                onConnect={onConnect}
                edgeTypes={edgeTypes}
                onEdgeClick={handleEdgeClick}
                onInit={setReactFlowInstance}
                onNodeDragStart={handleNodeDragStart}
                onNodeDragStop={handleNodeDragStop}
                onNodeClick={handleNodeClick}
                onPaneClick={() => {
                  // clic su area vuota: chiudi entrambi i pannelli
                  setSelectedNode(null);
                  setSelectedEdge(null);
                }}
                nodeTypes={nodeTypes}
                fitView
                style={{ width: "100%", height: "100%" }}
              >
                <Background variant="dots" gap={12} size={1} />
                <Controls />
                <Panel
                  position="top-right"
                  style={{
                    display: "flex",
                    gap: "8px",
                    zIndex: 1000,
                    right: selectedNode ? "328px" : "8px",
                  }}
                >
                  <button onClick={handleClean} className="clean-button" title="Clean">
                    <FaBroom />
                  </button>
                  <button
                    onClick={exportToXml}
                    className="export-button"
                    title="Export XML"
                    style={{
                      backgroundColor: "#93C5FD",
                      border: "none",
                      padding: 8,
                    }}
                  >
                    <FaDownload />
                  </button>
                </Panel>
              </ReactFlow>

              {/* Drawer per edge */}
              <EdgeProtocol
                edge={selectedEdge}
                open={!!selectedEdge}
                onSave={handleSaveEdge}
                onClose={() => setSelectedEdge(null)}
              />

              {/* Drawer per node */}
              {/* Drawer per node + selezione proprietà edge */}
              <SecurityOption
                node={selectedNode}
                edges={edges}
                nodes={nodes}
                onSaveNode={handleSaveMetadata}
                onSaveEdges={(updates) => {
                  const colorMap = { http: "#f1c40f", https: "#2ecc71", ftp: "#3498db" };
                  setEdges((eds) =>
                    eds.map((e) => {
                      if (updates[e.id] !== undefined) {
                        const protocol = updates[e.id];
                        return {
                          ...e,
                          data: { metadata: { protocol } },
                          label: protocol.toUpperCase(),
                          style: {
                            ...e.style,
                            stroke: colorMap[protocol] || "#555",
                            strokeWidth: 2,
                          },
                        };
                      }
                      return e;
                    })
                  );
                }}
                onDeleteEdge={handleDeleteEdge}
                onClose={() => setSelectedNode(null)}
              />
            </div>
          </SplitPane>
        </ReactFlowProvider>
      </div>
    </div>
  );
}
