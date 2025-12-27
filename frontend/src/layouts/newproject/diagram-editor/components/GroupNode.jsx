import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";
import { Handle, Position } from "reactflow";
import { NodeResizer } from "@reactflow/node-resizer";
import "@reactflow/node-resizer/dist/style.css";
import "./Node.css";

/**
 * ID ammessi per i gruppi (Purdue Model + cloud/onPremise)
 * Questi sono anche i valori ammessi per groupType / groupId logico.
 */
const ALLOWED_GROUP_IDS = [
  "OT.PM.5", // L5 - Enterprise Business Network
  "OT.PM.4", // L4 - Business Network at Plant
  "OT.PM.3.5", // L3.5 - OT DMZ - Major ICS Enforcement Boundary
  "OT.PM.3", // L3 - Site-Wide Supervisory
  "OT.PM.2", // L2 - Local Supervisory
  "OT.PM.1", // L1 - Local Controllers
  "OT.PM.0", // Level 0 - Field Devices
  "OT.PM.S", // LS - Safety Network
  "OT.PM.INT", // Rete Internet
  "cloud",
  "onPremise",
];

const isValidGroupId = (value) => ALLOWED_GROUP_IDS.includes(value);

/**
 * Configurazione centralizzata dei tipi di gruppo.
 * La chiave deve corrispondere ad un valore di ALLOWED_GROUP_IDS.
 */
const GROUP_TYPE_CONFIG = {
  cloud: {
    defaultLabel: "Cloud",
    style: {
      bg: "rgba(173, 216, 230, 0.3)",
      border: "2px solid rgba(173, 216, 230, 0.8)",
    },
  },
  onPremise: {
    defaultLabel: "OnPremise",
    style: {
      bg: "rgba(128, 128, 128, 0.2)",
      border: "2px solid rgba(128, 128, 128, 0.8)",
    },
  },

  // Purdue Model (OT)
  "OT.PM.5": {
    defaultLabel: "L5 - Enterprise Business Network",
    style: {
      bg: "rgba(0, 100, 0, 0.12)",
      border: "2px solid rgba(0, 100, 0, 0.70)",
    },
  },
  "OT.PM.4": {
    defaultLabel: "L4 - Business Network at Plant",
    style: {
      bg: "rgba(50, 205, 50, 0.12)",
      border: "2px solid rgba(50, 205, 50, 0.70)",
    },
  },
  "OT.PM.3.5": {
    defaultLabel: "L3.5 - OT DMZ - Major ICS Enforcement Boundary",
    style: {
      bg: "rgba(255, 165, 0, 0.15)",
      border: "2px solid rgba(255, 165, 0, 0.70)",
    },
  },
  "OT.PM.3": {
    defaultLabel: "L3 - Site-Wide Supervisory",
    style: {
      bg: "rgba(220, 20, 60, 0.12)",
      border: "2px solid rgba(220, 20, 60, 0.70)",
    },
  },
  "OT.PM.2": {
    defaultLabel: "L2 - Local Supervisory",
    style: {
      bg: "rgba(178, 34, 34, 0.12)",
      border: "2px solid rgba(178, 34, 34, 0.70)",
    },
  },
  "OT.PM.1": {
    defaultLabel: "L1 - Local Controllers",
    style: {
      bg: "rgba(139, 0, 0, 0.12)",
      border: "2px solid rgba(139, 0, 0, 0.70)",
    },
  },
  "OT.PM.0": {
    defaultLabel: "Level 0 - Field Devices",
    style: {
      bg: "rgba(64, 0, 0, 0.12)",
      border: "2px solid rgba(64, 0, 0, 0.70)",
    },
  },

  // Safety + Internet
  "OT.PM.S": {
    defaultLabel: "LS - Safety Network",
    style: {
      bg: "rgba(128, 0, 128, 0.10)",
      border: "2px solid rgba(128, 0, 128, 0.55)",
    },
  },
  "OT.PM.INT": {
    defaultLabel: "Rete Internet",
    style: {
      bg: "rgba(255, 215, 0, 0.12)",
      border: "2px solid rgba(255, 215, 0, 0.65)",
    },
  },
};

const DEFAULT_GROUP_CONFIG = {
  defaultLabel: "Group Area",
  style: {
    bg: "transparent",
    border: "1px dashed rgba(0, 0, 0, 0.2)",
  },
};

function getGroupConfig(groupType) {
  if (!groupType) return DEFAULT_GROUP_CONFIG;
  return GROUP_TYPE_CONFIG[groupType] || DEFAULT_GROUP_CONFIG;
}

export default function GroupNode({ id, data, selected }) {
  const groupType = data?.metadata?.groupType;
  const ipSubnet = data?.metadata?.ipSubnet;

  // groupId logico usato in analisi:
  // 1) se metadata.groupId è ammesso, uso quello
  // 2) altrimenti, se groupType è ammesso, uso groupType
  // 3) altrimenti fallback all'id del nodo React Flow
  const metaGroupId = data?.metadata?.groupId;
  const groupId = isValidGroupId(metaGroupId)
    ? metaGroupId
    : isValidGroupId(groupType)
    ? groupType
    : id;

  const childCount = data.childCount || 0;

  const config = getGroupConfig(groupType);

  const defaultTitle = config.defaultLabel;
  const [groupName, setGroupName] = useState(data.label || defaultTitle);

  const handleNameChange = (e) => {
    const newValue = e.target.value;
    setGroupName(newValue);
    // mantengo la compatibilità con il resto dell'app
    data.label = newValue;
  };

  const onResizeEnd = useCallback((_, params) => {
    console.log("Resized", params);
  }, []);

  const baseBg = config.style?.bg || DEFAULT_GROUP_CONFIG.style.bg;
  const baseBorder = config.style?.border || DEFAULT_GROUP_CONFIG.style.border;

  const border = selected ? "2px solid rgba(0, 123, 255, 0.5)" : baseBorder;

  const style = {
    position: "relative",
    cursor: "pointer",
    backgroundColor: baseBg,
    border,
    borderRadius: "4px",
  };

  return (
    <div
      className={`group-node ${selected ? "selected" : ""}`}
      style={style}
      data-group-id={groupId}
      data-group-type={groupType}
    >
      <button
        className="delete-btn"
        onClick={(e) => {
          e.stopPropagation();
          data.onDelete(id);
        }}
      >
        ×
      </button>

      <Handle
        type="target"
        id="target-top"
        position={Position.Top}
        style={{ pointerEvents: "all" }}
      />
      <Handle
        type="target"
        id="target-left"
        position={Position.Left}
        style={{ pointerEvents: "all" }}
      />
      <Handle
        type="source"
        id="source-right"
        position={Position.Right}
        style={{ pointerEvents: "all" }}
      />
      <Handle
        type="source"
        id="source-bottom"
        position={Position.Bottom}
        style={{ pointerEvents: "all" }}
      />

      <NodeResizer
        minWidth={200}
        minHeight={150}
        isVisible={selected}
        onResizeEnd={onResizeEnd}
        handleClassName="resize-handle"
      />

      <div
        className="group-header"
        onClick={(e) => {
          e.stopPropagation();
          data.openModal();
        }}
      >
        <input
          type="text"
          value={groupName}
          onChange={handleNameChange}
          className="group-name-input"
          onClick={(e) => e.stopPropagation()}
        />

        <div className="group-header-meta">
          {ipSubnet && <div className="node-subnet">{ipSubnet}</div>}
        </div>
      </div>

      <div className="group-body" style={{ pointerEvents: "none", height: "calc(100% - 40px)" }}>
        {childCount === 0 && <div className="drop-area-text">Trascina qui elementi</div>}
      </div>
    </div>
  );
}

GroupNode.propTypes = {
  id: PropTypes.string.isRequired,
  selected: PropTypes.bool,
  data: PropTypes.shape({
    label: PropTypes.string,
    metadata: PropTypes.shape({
      ipSubnet: PropTypes.string,
      groupType: PropTypes.oneOf(ALLOWED_GROUP_IDS),
      groupId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
    childCount: PropTypes.number,
    openModal: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
  }).isRequired,
};
