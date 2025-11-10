// src/layouts/newproject/components/VerifyEdgesTableData.js
import React from "react";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import { FaArrowRight } from "react-icons/fa";

export default function tableData(edges, onEdit, onDelete) {
  const columns = [
    { Header: "Icona", accessor: "icon", width: "10%", align: "center" },
    { Header: "Source", accessor: "source", align: "left" },
    { Header: "Target", accessor: "target", align: "left" },
    { Header: "Tipo", accessor: "tipo", align: "left" },
    { Header: "Proprietà", accessor: "properties", align: "left" },
    { Header: "Azioni", accessor: "actions", align: "center" },
  ];

  const rows = edges.map((e) => ({
    icon: (
      <MDBox display="flex" justifyContent="center">
        <FaArrowRight />
      </MDBox>
    ),
    source: (
      <MDTypography variant="button" fontWeight="medium">
        {e.source}
      </MDTypography>
    ),
    target: (
      <MDTypography variant="button" fontWeight="medium">
        {e.target}
      </MDTypography>
    ),
    tipo: (
      <MDTypography variant="caption" color="text">
        Edge
      </MDTypography>
    ),
    properties: (
      <MDTypography variant="caption">
        <strong>protocol:</strong> {e.displayMetadata.protocol || "—"}
      </MDTypography>
    ),
    actions: (
      <MDBox display="flex" justifyContent="center" gap={1}>
        <MDButton size="small" variant="outlined" color="dark" onClick={() => onEdit(e.id)}>
          EDIT
        </MDButton>
      </MDBox>
    ),
  }));

  return { columns, rows };
}
