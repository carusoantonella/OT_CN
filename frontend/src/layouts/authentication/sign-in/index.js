import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// @mui material components
import Card from "@mui/material/Card";
import Switch from "@mui/material/Switch";
import Grid from "@mui/material/Grid";
import MuiLink from "@mui/material/Link";

// @mui icons
import FacebookIcon from "@mui/icons-material/Facebook";
import GitHubIcon from "@mui/icons-material/GitHub";
import GoogleIcon from "@mui/icons-material/Google";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";

// Authentication layout components
import BasicLayout from "layouts/authentication/components/BasicLayout";

// Images
import bgImage from "assets/images/bg-sign-in-basic.jpeg";

import logo from "assets/images/logo/Logo_bkg_transparent.svg";

function Basic() {
  const navigate = useNavigate();
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSetRememberMe = () => setRememberMe(!rememberMe);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const response = await fetch("http://localhost:5000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Errore durante il login");
      } else {
        // Salva il token in localStorage
        localStorage.setItem("authToken", data.token);
        // opzionale: salva anche user se il backend NON lo manda
        if (data.user) {
          localStorage.setItem("authUser", JSON.stringify(data.user));
        } else {
          // fallback: decodifica dal token
          try {
            const [, payload] = data.token.split(".");
            const p = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
            localStorage.setItem(
              "authUser",
              JSON.stringify({ id: p.user_id, email: p.email, role: p.role || "client" })
            );
          } catch {}
        }
        if (data.user) localStorage.setItem("authUser", JSON.stringify(data.user));
        // Reindirizza l'utente all'area protetta (Dashboard)
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Errore di rete:", err);
      setError("Errore di rete");
    }
  };

  return (
    <BasicLayout image={bgImage}>
      <Card
        sx={{
          mx: "auto", // centra in orizzontale
          width: {
            xs: "95%", // 95% su mobile
            sm: "85%", // 85% su small
            md: 500, // 600px su medium
            lg: 450, // 600px su large
          },
          maxWidth: 500, // non più larga di 700px
          height: "auto", // altezza adattiva
          minHeight: "auto",
          py: 3, // padding verticale
          px: 2, // padding orizzontale
        }}
      >
        {/* Logo in testa alla form, senza box sovrapposto */}
        <MDBox textAlign="center" pt={3}>
          <MDBox
            component="img"
            src={logo}
            alt="CyNextA Logo"
            sx={{
              width: ["130px", "180px", "230px"], // xs, sm, md+
              height: "auto",
              display: "block",
              margin: "0 auto",
            }}
          />
        </MDBox>

        <MDBox pt={4} pb={3} px={3}>
          <MDBox component="form" role="form" onSubmit={handleSubmit}>
            <MDBox mb={2}>
              <MDInput
                type="email"
                label="Email"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </MDBox>
            <MDBox mb={2}>
              <MDInput
                type="password"
                label="Password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </MDBox>
            <MDBox display="flex" alignItems="center" ml={-1}>
              <Switch checked={rememberMe} onChange={handleSetRememberMe} />
              <MDTypography
                variant="button"
                fontWeight="regular"
                color="text"
                onClick={handleSetRememberMe}
                sx={{ cursor: "pointer", userSelect: "none", ml: -1 }}
              >
                &nbsp;&nbsp;Remember me
              </MDTypography>
            </MDBox>
            {error && (
              <MDTypography variant="caption" color="error">
                {error}
              </MDTypography>
            )}
            <MDBox mt={4} mb={1}>
              <MDButton variant="gradient" color="info" fullWidth type="submit">
                Sign in
              </MDButton>
            </MDBox>
            <MDBox mt={3} mb={1} textAlign="center">
              <MDTypography variant="button" color="text">
                Don&apos;t have an account?{" "}
                <MDTypography
                  component={Link}
                  to="/authentication/sign-up"
                  variant="button"
                  color="info"
                  fontWeight="medium"
                  textGradient
                >
                  Sign up
                </MDTypography>
              </MDTypography>
            </MDBox>
          </MDBox>
        </MDBox>
      </Card>
    </BasicLayout>
  );
}

export default Basic;
