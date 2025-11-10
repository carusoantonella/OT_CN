// src/layouts/newproject/SubAppLayout.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box } from "@mui/material"; // Box di MUI per il grid
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

import ProjectInfo from "./ProjectInfo";
import Upload from "./Upload";
import Analysis from "./Analysis";
import DiagramEditor from "./diagram-editor/App";
import VerifyObjects from "./VO_step/VerifyObjects";
import { useLocation } from "react-router-dom";

function SubAppLayout() {
  const location = useLocation();
  // se la path include "/diagram" NON centriamo
  const isDiagram = location.pathname.includes("/diagram");
  return (
    <DashboardLayout>
      {/* 
        Grid: header auto, contenuto 1fr, footer auto 
        height:100vh assicura che usi tutto il viewport
      */}
      <Box
        sx={{
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          height: "100vh",
          width: "100%",
        }}
      >
        {/* riga 1: navbar */}
        <DashboardNavbar />

        {/* riga 2: area di contenuto */}
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            width: "100%", // ← riempi tutta la cella 1fr
            height: "100%", // ← riempi tutta la cella 1fr
            // se NON siamo in /diagram, usa flex per centrare
            display: isDiagram ? "block" : "flex",
            alignItems: isDiagram ? undefined : "center",
            justifyContent: isDiagram ? undefined : "center",
          }}
        >
          <Routes>
            <Route path="project-info" element={<ProjectInfo />} />
            <Route path="upload" element={<Upload />} />
            <Route path="analysis" element={<Analysis />} />
            <Route path="verify" element={<VerifyObjects />} />

            {/* riga diagram: occuperà tutto lo spazio 1fr */}
            <Route path="diagram" element={<DiagramEditor />} />

            <Route path="*" element={<Navigate to="project-info" replace />} />
          </Routes>
        </Box>

        {/* riga 3: footer */}
        <Footer />
      </Box>
    </DashboardLayout>
  );
}

export default SubAppLayout;
