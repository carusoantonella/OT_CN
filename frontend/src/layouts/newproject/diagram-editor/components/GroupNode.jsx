import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";
import { Handle, Position, useReactFlow } from "reactflow";
import { NodeResizer } from "@reactflow/node-resizer";
import "@reactflow/node-resizer/dist/style.css";
import "./Node.css";

export default function GroupNode({ id, data, selected }) {
  // default title in base al tipo
  const defaultTitle =
    data.metadata.groupType === "cloud"
      ? "Cloud Area"
      : data.metadata.groupType === "onPremise"
      ? "On-Premise Area"
      : data.label;
  const [groupName, setGroupName] = useState(data.label || defaultTitle);
  const ipSubnet = data.metadata?.ipSubnet;
  const childCount = data.childCount || 0;

  const handleNameChange = (e) => {
    setGroupName(e.target.value);
    data.label = e.target.value;
  };

  const onResizeEnd = useCallback((_, params) => {
    console.log("Resized", params);
  }, []);

  // stili in base al groupType
  const type = data.metadata.groupType;
  const bgMap = {
    cloud: "rgba(173, 216, 230, 0.3)", // azzurrino
    onPremise: "rgba(128, 128, 128, 0.2)", // grigio chiaro
  };
  const PURDUE_COLORS = {
    Level_5_P2M: { bg: "rgba(  0,100,  0,0.12)", border: "2px solid rgba(  0,100,  0,0.70)" }, // dark-green
    Level_4_P2M: { bg: "rgba( 50,205, 50,0.12)", border: "2px solid rgba( 50,205, 50,0.70)" }, // lime-green
    Level_3_DMZ_P2M: { bg: "rgba(255,165,0,0.15)", border: "2px solid rgba(255,165,0,0.70)" },
    Level_3_P2M: { bg: "rgba(220, 20, 60,0.12)", border: "2px solid rgba(220, 20, 60,0.70)" }, // crimson
    Level_2_P2M: { bg: "rgba(178, 34, 34,0.12)", border: "2px solid rgba(178, 34, 34,0.70)" }, // firebrick
    Level_1_BC_P2M: { bg: "rgba(139,  0,  0,0.12)", border: "2px solid rgba(139,  0,  0,0.70)" }, // dark-red
    Level_1_SP_P2M: { bg: "rgba(102,  0,  0,0.12)", border: "2px solid rgba(102,  0,  0,0.70)" }, // deeper
    Level_0_P2M: { bg: "rgba( 64,  0,  0,0.12)", border: "2px solid rgba( 64,  0,  0,0.70)" }, // darkest
  };

  const borderMap = {
    cloud: "2px solid rgba(173, 216, 230, 0.8)",
    onPremise: "2px solid rgba(128, 128, 128, 0.8)",
  };
  const defaultBorder = selected
    ? "2px solid rgba(0, 123, 255, 0.5)"
    : "1px dashed rgba(0, 0, 0, 0.2)";

  const style = {
    position: "relative",
    cursor: "pointer",
    backgroundColor: PURDUE_COLORS[type]?.bg ?? bgMap[type] ?? "transparent",
    border: PURDUE_COLORS[type]?.border ?? borderMap[type] ?? defaultBorder,
    borderRadius: "4px",
  };

  return (
    <div className={`group-node ${selected ? "selected" : ""}`} style={style}>
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
      {/* multipli: Right + Bottom uscita */}
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
        {ipSubnet && <div className="node-subnet">{ipSubnet}</div>}
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
      groupType: PropTypes.string,
    }),
    childCount: PropTypes.number,
    openModal: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
  }).isRequired,
};
