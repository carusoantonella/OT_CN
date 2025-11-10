// src/layouts/newproject/Upload.js
import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMaterialUIController, setWizardData } from "context";

// MUI components
import Card from "@mui/material/Card";

// MUI icons
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CreateIcon from "@mui/icons-material/Create";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import WorkflowStepper from "./WorkflowStepper";

// Layout & assets
import BasicLayout from "layouts/authentication/components/BasicLayout";
import bgImage from "assets/images/bg-sign-in-basic.jpeg";

export default function Upload() {
  const navigate = useNavigate();
  const [controller, dispatch] = useMaterialUIController();
  const fileInputRef = useRef(null);
  const projectInfo = controller.wizardData?.projectInfo || {};
  const [file, setFile] = useState(null);

  // Selezione file
  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected); // opzionale, per mostrare il nome file

    try {
      const xmlText = await selected.text();
      setWizardData(dispatch, { xmlString: xmlText });
      navigate("/newproject/diagram");
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert("Errore durante la lettura del file XML: " + err.message);
    }
  };
  const openFilePicker = () => fileInputRef.current?.click();

  // --- LOGICA di import XML e navigazione ---
  const handleUpload = async () => {
    if (!file) {
      alert("Seleziona prima un file XML.");
      return;
    }

    // 1) Leggi il testo XML
    const xmlText = await file.text();

    // 2) Naviga al DiagramEditor passando solo la stringa XML
    setWizardData(dispatch, { xmlString: xmlText });
    navigate("/newproject/diagram");
  };

  // Vai a un nuovo diagramma vuoto
  const handleDraw = () => {
    navigate("/newproject/diagram");
  };

  return (
    <BasicLayout image={bgImage}>
      <Card
        sx={{
          width: { xs: "90%", md: 700 },
          mx: "auto",
          my: 3,
          borderRadius: 2,
          boxShadow: 4,
        }}
      >
        {/* Contenuto */}
        <MDBox pt={2} pb={3} px={3}>
          {/* Stepper */}
          <WorkflowStepper activeStep={1} />

          {/* Info progetto */}
          <MDBox mb={3} sx={{ mt: 4 }}>
            <MDTypography variant="subtitle1">
              <strong>ID:</strong> {projectInfo.id || "—"}
            </MDTypography>
            <MDTypography variant="subtitle1">
              <strong>Progetto:</strong> {projectInfo.name || "—"}
            </MDTypography>
          </MDBox>

          {/* Selezione XML vs Nuovo Diagramma */}
          <MDBox
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              handleUpload();
            }}
            sx={{ display: "flex", flexDirection: "column", gap: 4 }}
          >
            <MDBox
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                gap: 2,
                alignItems: "stretch",
              }}
            >
              {/* Card: Carica XML esistente */}
              <Card
                variant="outlined"
                sx={{
                  cursor: "pointer",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0px 4px 20px rgba(0,0,0,0.12)",
                  },
                  flex: 1,
                  width: "100%",
                  p: 3,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  borderRadius: 1,
                  minHeight: 200,
                  border: (theme) => `2px dashed ${theme.palette.grey[300]}`,
                }}
                onClick={openFilePicker}
              >
                <CloudUploadIcon sx={{ fontSize: 48, mb: 1, color: "#1976d2" }} />
                <MDTypography variant="h6" gutterBottom>
                  Carica Diagramma XML
                </MDTypography>
                <MDTypography variant="body2" color="text">
                  Seleziona un file XML per modificare un diagramma esistente.
                </MDTypography>
                {file && (
                  <MDTypography variant="caption" color="text" sx={{ mt: 1 }}>
                    File selezionato: {file.name}
                  </MDTypography>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xml"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
              </Card>

              {/* Card: Disegna da zero */}
              <Card
                variant="outlined"
                sx={{
                  cursor: "pointer",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0px 4px 20px rgba(0,0,0,0.12)",
                  },
                  flex: 1,
                  width: "100%",
                  p: 3,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  borderRadius: 1,
                  minHeight: 200,
                  border: (theme) => `2px dashed ${theme.palette.warning.main}`,
                }}
                onClick={handleDraw}
              >
                <CreateIcon sx={{ fontSize: 48, mb: 1, color: "warning.main" }} />
                <MDTypography variant="h6" gutterBottom>
                  Crea Nuovo Diagramma
                </MDTypography>
                <MDTypography variant="body2" color="text">
                  Parti da zero e disegna il tuo threat model.
                </MDTypography>
              </Card>
            </MDBox>

            {/* Navigazione */}
            <MDBox sx={{ display: "flex", justifyContent: "space-between" }}>
              <MDButton
                variant="outlined"
                color="info"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate(-1)}
              >
                Indietro
              </MDButton>
            </MDBox>
          </MDBox>
        </MDBox>
      </Card>
    </BasicLayout>
  );
}
