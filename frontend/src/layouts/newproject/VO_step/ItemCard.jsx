import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import { schema } from "../diagram-editor/components/SecurityOption";

export default function ItemCard({ id, label, metadata, nature, onChange }) {
  const [localMeta, setLocalMeta] = useState(metadata);

  useEffect(() => {
    setLocalMeta(metadata);
  }, [metadata]);

  // baseFields, esattamente come in SecurityModal
  const baseFields = [{ name: "ipSubnet", label: "IP/Subnet", type: "text" }];
  const fields = schema[nature] || [];
  const allFields = [...baseFields, ...fields];

  const handleField = (field, value) => {
    const updated = { ...localMeta, [field]: value };
    setLocalMeta(updated);
    onChange(updated);
  };

  const handleCheckbox = (field, option) => {
    const raw = localMeta[field];
    const prev = Array.isArray(localMeta[field]) ? localMeta[field] : [];
    const next = prev.includes(option) ? [] : [option];
    handleField(field, next);
  };

  return (
    <MDBox p={2} border="1px solid #e0e0e0" borderRadius="8px">
      <MDTypography variant="h6">{label}</MDTypography>
      {allFields.map(({ name, label: lbl, type, options }) => (
        <MDBox key={name} mt={1}>
          <MDTypography variant="subtitle2">{lbl}</MDTypography>
          {type === "text" && (
            <MDInput
              fullWidth
              value={localMeta[name] || ""}
              onChange={(e) => handleField(name, e.target.value)}
            />
          )}
          {type === "dropdown" && (
            <select
              style={{ width: "100%", padding: "8px", borderRadius: 4 }}
              value={localMeta[name] || ""}
              onChange={(e) => handleField(name, e.target.value)}
            >
              <option value="">— seleziona —</option>
              {options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          )}
          {type === "checkbox" && (
            <MDBox display="flex" flexWrap="wrap" gap={1} mt={0.5}>
              {options.map((opt) => (
                <label key={opt} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input
                    type="checkbox"
                    checked={(localMeta[name] || []).includes(opt)}
                    onChange={() => handleCheckbox(name, opt)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </MDBox>
          )}
        </MDBox>
      ))}
    </MDBox>
  );
}

ItemCard.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  metadata: PropTypes.object,
  nature: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};
