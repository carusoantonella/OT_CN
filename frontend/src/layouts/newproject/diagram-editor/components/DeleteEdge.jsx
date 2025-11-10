// src/components/DeleteEdge.jsx
import React from "react";
import { getBezierPath, EdgeLabelRenderer, useReactFlow } from "reactflow";
import PropTypes from "prop-types";

export default function DeleteEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  style,
  markerEnd,
  label,
}) {
  const instance = useReactFlow();
  // path e coordinate per il centro etichetta
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleDelete = (evt) => {
    evt.stopPropagation();
    // rimuove l’edge dal set
    instance.setEdges((eds) => eds.filter((e) => e.id !== id));
  };

  return (
    <>
      {/* HIT-AREA INVISIBILE: stroke trasparente + strokeWidth ampio */}
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={10} pointerEvents="stroke" />

      {/* edge path */}
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />

      {/* label + × */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            display: "flex",
            alignItems: "center",
            gap: 4,
            pointerEvents: "all",
            fontSize: 10,
            fontStyle: "italic",
            color: "#222",
            background: "rgba(255,255,255,0.8)",
            padding: "2px 4px",
            borderRadius: 3,
          }}
        >
          {/* testo protocollo */}
          {label && <span>{label}</span>}
          {/* pulsantino grigio “×” */}
          <button
            onClick={handleDelete}
            style={{
              background: "transparent",
              border: "none",
              color: "#888",
              fontSize: 12,
              lineHeight: "12px",
              cursor: "pointer",
              padding: 0,
            }}
            title="Elimina connessione"
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

DeleteEdge.propTypes = {
  id: PropTypes.string.isRequired,
  sourceX: PropTypes.number,
  sourceY: PropTypes.number,
  targetX: PropTypes.number,
  targetY: PropTypes.number,
  sourcePosition: PropTypes.string,
  targetPosition: PropTypes.string,
  style: PropTypes.object,
  markerEnd: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  label: PropTypes.string,
};
