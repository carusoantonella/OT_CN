// src/layouts/common/WorkInProgress.jsx
import React from "react";
import PropTypes from "prop-types";
import { Box, Typography, Chip } from "@mui/material";
import Icon from "@mui/material/Icon";

export default function WorkInProgress({ title, subtitle }) {
  return (
    <Box
      sx={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        p: 4,
        background:
          "radial-gradient(1200px 600px at 10% 10%, rgba(99,102,241,0.08), transparent 60%), radial-gradient(1000px 500px at 90% 20%, rgba(34,197,94,0.06), transparent 60%)",
      }}
    >
      <Box
        sx={{
          textAlign: "center",
          p: { xs: 3, md: 5 },
          borderRadius: 4,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          backdropFilter: "blur(6px)",
          backgroundColor: "rgba(255,255,255,0.7)",
        }}
      >
        <Box
          sx={{
            width: 84,
            height: 84,
            borderRadius: "24px",
            mx: "auto",
            mb: 2,
            display: "grid",
            placeItems: "center",
            boxShadow: "0 10px 24px rgba(99,102,241,0.2)",
            background: "linear-gradient(135deg, rgba(99,102,241,1) 0%, rgba(79,70,229,1) 100%)",
            color: "#fff",
          }}
        >
          <Icon fontSize="large">build</Icon>
        </Box>
        <Chip label="WIP" variant="outlined" sx={{ mb: 1, fontWeight: 600, letterSpacing: 1 }} />
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          {title}
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: 600, mx: "auto", mb: 0.5 }}
        >
          {subtitle}
        </Typography>
        <Typography variant="body2" color="text.disabled">
          Torna presto: stiamo rifinendo UI, logiche e permessi.
        </Typography>
      </Box>
    </Box>
  );
}

// ✅ Validazione props
WorkInProgress.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
};

// ✅ Default values (se non passati)
WorkInProgress.defaultProps = {
  title: "Work in progress",
  subtitle: "Feature in sviluppo",
};
