// src/layouts/newproject/WorkflowStepper.js
import React from "react";
import PropTypes from "prop-types";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const STEPS = [
  { label: "Fill in the form the project details to upload or draw the diagram." },
  { label: "Draw diagram" },
  { label: "Review detected objects" },
  { label: "Export analysis" },
];

export default function WorkflowStepper({
  activeStep = 0, // 0..3
  colorHex, // opzionale: forza colore della barra
  helperMediaPerStep = [], // [{ webm: "/path/file.webm", poster?: "/path/poster.png" }, ...]
  mediaSize = 48, // dimensione del cerchio (px)
}) {
  const theme = useTheme();
  const total = STEPS.length;
  const step = Math.min(Math.max(activeStep, 0), total - 1);

  // 25% per step: 0→25→50→75→100 (include lo step corrente)
  const value = Math.round(((step + 1) / total) * 100);
  const barColor = colorHex || theme.palette.success.main;

  return (
    <Box sx={{ background: "transparent" }}>
      {/* Barra di avanzamento custom (robusta contro override) */}
      <ProgressBar value={value} color={barColor} />

      {/* Media WebM per step (centrato) + testo descrittivo */}
      <Box
        sx={{
          mt: 1.25,
          px: 2,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.25,
        }}
      >
        <StepMedia step={step} mediaPerStep={helperMediaPerStep} size={mediaSize} />
        <SpeechBubble text={STEPS[step].label} />
      </Box>
    </Box>
  );
}

WorkflowStepper.propTypes = {
  activeStep: PropTypes.number,
  colorHex: PropTypes.string,
  helperMediaPerStep: PropTypes.arrayOf(
    PropTypes.shape({
      webm: PropTypes.string, // path al .webm per quello step
      poster: PropTypes.string, // opzionale: immagine statica di fallback
    })
  ),
  mediaSize: PropTypes.number,
};

/* ---------- Barra di avanzamento custom ---------- */
function ProgressBar({ value, color }) {
  return (
    <Box sx={{ px: 2, pt: 1 }}>
      <Box
        sx={{
          position: "relative",
          height: 6,
          borderRadius: 999,
          backgroundColor: "#e0e0e0",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${Math.max(0, Math.min(100, value))}%`,
            borderRadius: 999,
            backgroundColor: color,
            transition: "width 300ms ease",
          }}
        />
      </Box>
    </Box>
  );
}
ProgressBar.propTypes = {
  value: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
};

/* ---------- Media per step (WebM + poster, con rispetto a prefers-reduced-motion) ---------- */
function StepMedia({ step, mediaPerStep, size }) {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const item = mediaPerStep?.[step] || {};
  const { webm, poster } = item || {};

  if (!webm && !poster) return null; // niente da mostrare

  const commonBox = {
    width: size,
    height: size,
    borderRadius: "8px",
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    backgroundColor: "transparent",
    boxShadow: "none",
    border: "0",
    outline: "0",
  };

  // Se l'utente preferisce ridurre le animazioni, mostra solo il poster (se esiste)
  if (reduceMotion && poster) {
    return (
      <Box sx={commonBox}>
        <Box
          component="img"
          src={poster}
          alt=""
          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </Box>
    );
  }

  // WebM (autoplay inline, muto, loop) con poster opzionale
  if (webm) {
    return (
      <Box sx={commonBox}>
        <Box
          component="video"
          src={webm}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            backgroundColor: "transparent",
            border: 0,
            outline: 0,
          }}
        />
      </Box>
    );
  }

  // Fallback: solo poster
  return (
    <Box sx={commonBox}>
      <Box
        component="img"
        src={poster}
        alt=""
        sx={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </Box>
  );
}
StepMedia.propTypes = {
  step: PropTypes.number.isRequired,
  mediaPerStep: PropTypes.array,
  size: PropTypes.number.isRequired,
};

/* ---------- Nuvoletta con testo compatto/descrittivo ---------- */
function SpeechBubble({ text }) {
  const bg = "#fffde7"; // giallo chiaro
  const border = "#e5e26a"; // bordo giallo
  return (
    <Box
      sx={{
        position: "relative",
        display: "inline-block",
        px: 1.5,
        py: 0.75,
        borderRadius: 2,
        border: "2px solid",
        borderColor: border,
        backgroundColor: bg,
        color: "#111",
        fontSize: 13,
        lineHeight: 1.35,
        fontWeight: 500,
        textTransform: "none",
        letterSpacing: 0.1,
        maxWidth: 420,
        whiteSpace: "normal",
      }}
    >
      {text}
      <Box
        sx={{
          position: "absolute",
          left: -8,
          top: "50%",
          width: 16,
          height: 16,
          transform: "translateY(-50%) rotate(45deg)",
          backgroundColor: bg,
          borderLeft: `2px solid ${border}`,
          borderBottom: `2px solid ${border}`,
          borderTop: 0,
          borderRight: 0,
        }}
      />
    </Box>
  );
}
SpeechBubble.propTypes = { text: PropTypes.string.isRequired };
