// src/layouts/newproject/ProjectInfo.js
import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMaterialUIController, setWizardData } from "context";

// MUI components
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";

// MUI icons
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CreateIcon from "@mui/icons-material/Create";

// MD components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import WorkflowStepper from "./WorkflowStepper";

// Layout & assets
import BasicLayout from "layouts/authentication/components/BasicLayout";
import bgImage from "assets/images/bg-sign-in-basic.jpeg";

// WebM for step 0 (Project Info)
import keyboardTypingWebm from "assets/images/Keyboard_Typing.webm";
// optional poster
// import keyboardTypingPoster from "assets/images/Keyboard_Typing.png";

export default function ProjectInfo() {
  const [controller, dispatch] = useMaterialUIController();
  const navigate = useNavigate();

  // --- Project details form state ---
  const [idprogetto, setIDProgetto] = useState("");
  const [nomeProgetto, setNomeProgetto] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [referente, setReferente] = useState("");

  const isComplete =
    idprogetto.trim() && nomeProgetto.trim() && descrizione.trim() && referente.trim();

  // Save project info WHEN clicking one of the two bottom actions
  const saveProjectInfo = (showAlert = true) => {
    const trimmedId = idprogetto.trim();
    const trimmedName = nomeProgetto.trim();
    const trimmedDesc = descrizione.trim();
    const trimmedReferent = referente.trim();

    if (!trimmedId || !trimmedName || !trimmedDesc || !trimmedReferent) {
      if (showAlert) {
        const missing = [];
        if (!trimmedId) missing.push("Project ID");
        if (!trimmedName) missing.push("Project Name");
        if (!trimmedDesc) missing.push("Description");
        if (!trimmedReferent) missing.push("Contact Person");
        // eslint-disable-next-line no-alert
        alert(`The following fields are required:\n• ${missing.join("\n• ")}`);
      }
      return false;
    }

    setWizardData(dispatch, {
      projectInfo: {
        id: trimmedId,
        name: trimmedName,
        description: trimmedDesc,
        referent: trimmedReferent,
      },
    });
    return true;
  };

  // --- Bottom actions (Upload / Draw) ---
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);

  const openFilePicker = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);

    // Ensure project info is saved even if picker is triggered directly
    saveProjectInfo(false);

    try {
      const xmlText = await selected.text();
      setWizardData(dispatch, { xmlString: xmlText });
      navigate("/newproject/diagram");
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert("Error while reading the XML file: " + err.message);
    }
  };

  const handleUpload = async () => {
    if (!saveProjectInfo()) return;

    if (!file) {
      // eslint-disable-next-line no-alert
      alert("Please select an XML file first.");
      return;
    }
    const xmlText = await file.text();
    setWizardData(dispatch, { xmlString: xmlText });
    navigate("/newproject/diagram");
  };

  const handleDraw = () => {
    if (!saveProjectInfo()) return;
    navigate("/newproject/diagram");
  };

  // Disabled state for action cards (visible but inactive initially)
  const actionsDisabled = !isComplete;

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
        <MDBox pt={2} pb={3} px={3}>
          {/* Stepper */}
          <WorkflowStepper
            activeStep={0}
            helperMediaPerStep={[
              { webm: keyboardTypingWebm /*, poster: keyboardTypingPoster */ }, // step 0
              {}, // step 1
              {}, // step 2
              {}, // step 3
            ]}
            mediaSize={100}
          />

          <Divider sx={{ mx: 1, mb: 2, mt: 1, opacity: 0.2 }} />

          {/* Form (no Next button; submit prevented) */}
          <MDBox
            component="form"
            role="form"
            onSubmit={(e) => e.preventDefault()}
            sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
          >
            <MDTypography variant="h6" sx={{ mt: 0, mb: 0.5 }}>
              Project Details
            </MDTypography>

            <MDInput
              label="Project ID *"
              placeholder="e.g., TM-2025-001"
              value={idprogetto}
              onChange={(e) => setIDProgetto(e.target.value)}
              fullWidth
              inputProps={{ sx: { height: 25 } }}
            />

            <MDInput
              label="Project Name *"
              placeholder="e.g., Threat Model for App X"
              value={nomeProgetto}
              onChange={(e) => setNomeProgetto(e.target.value)}
              fullWidth
              inputProps={{ sx: { height: 25 } }}
            />

            <MDInput
              label="Description *"
              placeholder="Short description of the project and objectives"
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              multiline
              rows={3}
              fullWidth
            />

            <MDInput
              label="Contact Person *"
              placeholder="Full name of the contact"
              value={referente}
              onChange={(e) => setReferente(e.target.value)}
              fullWidth
              inputProps={{ sx: { height: 25 } }}
            />

            {!isComplete && (
              <MDTypography
                variant="caption"
                color="text"
                sx={{ mt: 0.5, textAlign: "center", opacity: 0.9 }}
              >
                Fill in all required fields to enable the actions below.
              </MDTypography>
            )}
          </MDBox>

          {/* Bottom actions: ALWAYS visible, disabled until form complete */}
          <Divider sx={{ mx: 1, my: 3, opacity: 0.15 }} />

          <MDBox
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!actionsDisabled) handleUpload();
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
              {/* Card: Upload XML */}
              <Card
                variant="outlined"
                aria-disabled={actionsDisabled}
                tabIndex={actionsDisabled ? -1 : 0}
                sx={{
                  flex: 1,
                  width: "100%",
                  p: 3,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 1,
                  minHeight: 200,
                  border: (theme) =>
                    `2px dashed ${
                      actionsDisabled ? theme.palette.grey[300] : theme.palette.grey[300]
                    }`,
                  opacity: actionsDisabled ? 0.55 : 1,
                  filter: actionsDisabled ? "grayscale(0.3)" : "none",
                  cursor: actionsDisabled ? "not-allowed" : "pointer",
                  pointerEvents: actionsDisabled ? "none" : "auto",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  "&:hover": actionsDisabled
                    ? {}
                    : {
                        transform: "translateY(-4px)",
                        boxShadow: "0px 4px 20px rgba(0,0,0,0.12)",
                      },
                }}
                onClick={() => {
                  if (!saveProjectInfo()) return;
                  openFilePicker();
                }}
              >
                <CloudUploadIcon
                  sx={{
                    fontSize: 48,
                    mb: 1,
                    color: actionsDisabled ? "text.disabled" : "#1976d2",
                  }}
                />
                <MDTypography
                  variant="h6"
                  gutterBottom
                  sx={{ color: actionsDisabled ? "text.disabled" : "inherit" }}
                >
                  Upload XML Diagram
                </MDTypography>
                <MDTypography
                  variant="body2"
                  color={actionsDisabled ? "text.secondary" : "text"}
                  sx={{ textAlign: "center" }}
                >
                  Select an XML file to edit an existing diagram.
                </MDTypography>
                {file && (
                  <MDTypography variant="caption" color="text" sx={{ mt: 1 }}>
                    Selected file: {file.name}
                  </MDTypography>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xml"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                  disabled={actionsDisabled}
                />
              </Card>

              {/* Card: Create from scratch */}
              <Card
                variant="outlined"
                aria-disabled={actionsDisabled}
                tabIndex={actionsDisabled ? -1 : 0}
                sx={{
                  flex: 1,
                  width: "100%",
                  p: 3,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 1,
                  minHeight: 200,
                  border: (theme) =>
                    `2px dashed ${
                      actionsDisabled ? theme.palette.grey[300] : theme.palette.warning.main
                    }`,
                  opacity: actionsDisabled ? 0.55 : 1,
                  filter: actionsDisabled ? "grayscale(0.3)" : "none",
                  cursor: actionsDisabled ? "not-allowed" : "pointer",
                  pointerEvents: actionsDisabled ? "none" : "auto",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  "&:hover": actionsDisabled
                    ? {}
                    : {
                        transform: "translateY(-4px)",
                        boxShadow: "0px 4px 20px rgba(0,0,0,0.12)",
                      },
                }}
                onClick={() => {
                  if (!saveProjectInfo()) return;
                  handleDraw();
                }}
              >
                <CreateIcon
                  sx={{
                    fontSize: 48,
                    mb: 1,
                    color: actionsDisabled ? "text.disabled" : "warning.main",
                  }}
                />
                <MDTypography
                  variant="h6"
                  gutterBottom
                  sx={{ color: actionsDisabled ? "text.disabled" : "inherit" }}
                >
                  Create New Diagram
                </MDTypography>
                <MDTypography
                  variant="body2"
                  color={actionsDisabled ? "text.secondary" : "text"}
                  sx={{ textAlign: "center" }}
                >
                  Start from scratch and draw your threat model.
                </MDTypography>
              </Card>
            </MDBox>
          </MDBox>
        </MDBox>
      </Card>
    </BasicLayout>
  );
}
