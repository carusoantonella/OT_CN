import React from "react";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDAvatar from "components/MDAvatar";
import { FaProjectDiagram } from "react-icons/fa";

// Se hai colori specifici sul gruppo, puoi metterli qui:
const iconMap = {
  group: <FaProjectDiagram style={{ fontSize: 20, color: "#888" }} />,
};

export default function tableData(groups, onEdit, onDelete) {
  const columns = [
    { Header: "Icona", accessor: "icon", width: "10%", align: "center" },
    { Header: "Label", accessor: "label", align: "left" },
    { Header: "Tipo", accessor: "nature", align: "center" },
    { Header: "Proprietà", accessor: "properties", align: "left" },
    { Header: "Azioni", accessor: "actions", align: "center" },
  ];

  const rows = groups.map((g) => ({
    icon: (
      <MDBox display="flex" justifyContent="center">
        {iconMap.group}
      </MDBox>
    ),
    label: (
      <MDTypography variant="button" fontWeight="medium">
        {g.label}
      </MDTypography>
    ),
    nature: (
      <MDTypography variant="caption" color="text">
        Gruppo
      </MDTypography>
    ),
    properties: (
      <MDBox display="flex" flexDirection="column" gap={0.5}>
        {/* mostra solo il campo trustBoundary e networkZone */}
        {["trustBoundary", "networkZone"].map((k) =>
          g.metadata[k] != null ? (
            <MDTypography variant="caption" key={k}>
              <strong>{k}:</strong> {String(g.metadata[k])}
            </MDTypography>
          ) : null
        )}
      </MDBox>
    ),
    actions: (
      <MDBox display="flex" justifyContent="center" gap={1}>
        <MDButton
          size="small"
          variant="outlined"
          color="dark"
          onClick={() => onEdit(g.id, g.metadata)}
        >
          EDIT
        </MDButton>
      </MDBox>
    ),
  }));

  return { columns, rows };
}
