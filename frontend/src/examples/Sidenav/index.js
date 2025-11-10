/**
=========================================================
* Material Dashboard 2 React - v2.2.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)
*
* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import { useEffect, useState } from "react";

import "./hoverExpand.css";
// react-router-dom components
import { useLocation, NavLink } from "react-router-dom";
import logoCollapsed from "assets/images/logo/Logo_negativo.svg";

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// @mui material components
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Icon from "@mui/material/Icon";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Material Dashboard 2 React example components
import SidenavCollapse from "examples/Sidenav/SidenavCollapse";

// Custom styles for the Sidenav
import SidenavRoot from "examples/Sidenav/SidenavRoot";
import sidenavLogoLabel from "examples/Sidenav/styles/sidenav";
import appRoutes from "routes";
import { getUserRoles, getToken } from "utils/auth";

// Material Dashboard 2 React context
import {
  useMaterialUIController,
  setMiniSidenav,
  setTransparentSidenav,
  setWhiteSidenav,
} from "context";

/* ===========================
   RUOLI + FILTRO OR (centralizzati)
   =========================== */

// OR logico: item visibile se almeno un ruolo combacia (case-insensitive)
const canSee = (item, userRoles) =>
  !item.roles ||
  item.roles.map((r) => String(r).trim().toLowerCase()).some((r) => userRoles.includes(r));

// Filtro ricorsivo: mantiene i gruppi solo se hanno figli visibili
const filterByRole = (items, userRoles) =>
  (items || [])
    .filter((r) => canSee(r, userRoles))
    .map((r) => (r.collapse ? { ...r, collapse: filterByRole(r.collapse, userRoles) } : r))
    .filter((r) => r.type !== "collapse" || !r.collapse || r.collapse.length > 0);

// RENDER ricorsivo — non passare route ai gruppi (solo alle foglie)
const renderRoutes = (items) =>
  items.map((r) =>
    r.collapse?.length ? (
      <SidenavCollapse key={r.key} name={r.name} icon={r.icon}>
        {renderRoutes(r.collapse)}
      </SidenavCollapse>
    ) : (
      <SidenavCollapse key={r.key} name={r.name} icon={r.icon} route={r.route} />
    )
  );

/* ===========================
   Toggle neumorfico Lock/Unlock
   =========================== */
const NeumorphicLockToggle = ({ checked, onChange }) => {
  const trackW = 88;
  const trackH = 36;
  const knob = 28; // diametro
  const pad = 4; // padding interno

  return (
    <MDBox
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      sx={{
        position: "relative",
        width: trackW,
        height: trackH,
        borderRadius: 999,
        cursor: "pointer",
        userSelect: "none",
        // pill "neumorphic" su sfondo scuro
        background: "linear-gradient(145deg, rgba(255,255,255,0.18), rgba(0,0,0,0.06))",
        boxShadow:
          "inset 6px 6px 12px rgba(0,0,0,0.25), inset -6px -6px 12px rgba(255,255,255,0.10), 4px 4px 10px rgba(0,0,0,0.25), -4px -4px 10px rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(255,255,255,0.9)",
        transition: "box-shadow .2s ease, background .2s ease",
        "&:hover": {
          boxShadow:
            "inset 4px 4px 10px rgba(0,0,0,0.22), inset -4px -4px 10px rgba(255,255,255,0.12), 6px 6px 12px rgba(0,0,0,0.28), -6px -6px 12px rgba(255,255,255,0.10)",
        },
      }}
    >
      {/* icona lock/unlock al centro */}
      <Icon fontSize="small">{checked ? "lock" : "lock_open"}</Icon>

      {/* knob che scorre */}
      <MDBox
        sx={{
          position: "absolute",
          top: pad,
          left: checked ? `calc(100% - ${knob + pad}px)` : pad,
          width: knob,
          height: knob,
          borderRadius: "50%",
          background: "linear-gradient(145deg, #ffffff, #dfe7ff)",
          transition: "left .22s cubic-bezier(.4,0,.2,1)",
        }}
      />
    </MDBox>
  );
};

NeumorphicLockToggle.propTypes = {
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

function Sidenav({ color, brand, brandName, brandCollapsed, routes: routesProp, ...rest }) {
  const [controller, dispatch] = useMaterialUIController();
  const { miniSidenav, transparentSidenav, whiteSidenav, darkMode, sidenavColor } = controller;
  const location = useLocation();
  const collapseName = location.pathname.replace("/", "");
  const collapsedLogo = brandCollapsed || logoCollapsed;
  const [hovered, setHovered] = useState(false);
  // Sidebar pin (pinned = sempre aperta)
  const [pinned, setPinned] = useState(() => localStorage.getItem("sidenavPinned") === "1");
  const togglePinned = () => {
    const next = !pinned;
    setPinned(next);
    localStorage.setItem("sidenavPinned", next ? "1" : "0");
    if (next) {
      // se pinnata, assicurati che non sia mini
      setMiniSidenav(dispatch, false);
    }
  };

  let textColor = "white";
  if (transparentSidenav || (whiteSidenav && !darkMode)) {
    textColor = "purple";
  } else if (whiteSidenav && darkMode) {
    textColor = "inherit";
  }

  const closeSidenav = () => setMiniSidenav(dispatch, true);

  const handleLogout = () => {
    localStorage.removeItem("authToken"); // o .clear() se necessario
    window.location.href = "/authentication/sign-in"; // oppure usa navigate("/authentication/sign-in")
  };

  useEffect(() => {
    function handleMiniSidenav() {
      const isSmall = window.innerWidth < 1200;
      // Se è pinnata, forziamo miniSidenav = false (aperta) tranne che su schermi piccoli
      if (pinned && !isSmall) {
        setMiniSidenav(dispatch, false);
      } else {
        setMiniSidenav(dispatch, isSmall);
      }
      setTransparentSidenav(dispatch, isSmall ? false : transparentSidenav);
      setWhiteSidenav(dispatch, isSmall ? false : whiteSidenav);
    }

    window.addEventListener("resize", handleMiniSidenav);
    handleMiniSidenav(); // init on mount

    return () => window.removeEventListener("resize", handleMiniSidenav);
  }, [dispatch, transparentSidenav, whiteSidenav, pinned]);

  // ✅ usa helper centralizzato
  const isAuthenticated = Boolean(getToken());
  if (!isAuthenticated) return null;

  // Usa le route passate come prop se presenti, altrimenti quelle importate
  const allRoutes = routesProp || appRoutes;

  // ✅ Ruoli letti e normalizzati dal JWT (centralizzato)
  const userRoles = getUserRoles();

  // ✅ Applica il filtro ruoli ricorsivo (OR) con ruoli multipli
  const visibleRoutes = filterByRole(allRoutes, userRoles);

  return (
    <SidenavRoot
      className={`hover-expand ${pinned ? "pinned" : ""}`}
      {...rest}
      variant="permanent"
      ownerState={{ transparentSidenav, whiteSidenav, miniSidenav, darkMode }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <MDBox pt={4} pb={1} px={4} textAlign="center" className="brand-wrapper">
        {/* pulsante close mobile invariato */}
        <MDBox
          display={{ xs: "block", xl: "none" }}
          position="absolute"
          top={0}
          right={0}
          p={1.625}
          onClick={closeSidenav}
          sx={{ cursor: "pointer" }}
        >
          <MDTypography variant="h6" color="secondary">
            <Icon sx={{ fontWeight: "bold" }}>close</Icon>
          </MDTypography>
        </MDBox>

        {/* LINK al root che contiene entrambe le versioni del brand */}
        <MDBox component={NavLink} to="/" display="block" width="100%">
          {/* === ESPANSO: logo+nome attuali === */}
          <MDBox
            className="brand-expanded"
            display="flex"
            alignItems="center"
            justifyContent="center"
            gap={1}
          >
            {brand && (
              <MDBox
                component="img"
                src={brand}
                alt="Brand"
                sx={{
                  height: 50, //modifica altezza logo expandend
                  width: "auto",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            )}
            {brandName && (
              <MDTypography
                component="h6"
                variant="button"
                fontWeight="medium"
                color={textColor}
                sx={{ letterSpacing: ".4px" }}
              >
                {brandName}
              </MDTypography>
            )}
          </MDBox>

          <MDBox
            className="brand-collapsed"
            display="none"
            alignItems="center"
            justifyContent="center"
            width="100%"
          >
            {collapsedLogo && (
              <MDBox
                component="img"
                src={collapsedLogo}
                alt="Logo"
                className="brand-collapsed-img"
                sx={{ height: 28, width: "auto", display: "block", mx: "auto" }}
                route="/dashboard"
              />
            )}
          </MDBox>
        </MDBox>
      </MDBox>

      <Divider
        light={
          (!darkMode && !whiteSidenav && !transparentSidenav) ||
          (darkMode && !transparentSidenav && whiteSidenav)
        }
      />
      <List sx={{ flexGrow: 1 }}>{renderRoutes(visibleRoutes)}</List>

      {/* Spinge la voce seguente in basso esattamente come richiesto */}
      <MDBox sx={{ flexGrow: 1 }} />

      {/* Logout: voce IDENTICA alle altre, stile e comportamento inclusi */}
      <MDBox mb={1} px={0}>
        <NavLink
          to="#"
          onClick={(e) => {
            e.preventDefault(); // evita la navigazione
            e.stopPropagation();
            handleLogout(); // stessa funzione che già usi
          }}
          style={{ textDecoration: "none" }}
        >
          <SidenavCollapse
            name="Logout"
            icon={<Icon>power_settings_new</Icon>} // icona “shutdown”
            active={false}
          />
        </NavLink>
      </MDBox>

      {/* Toggle neumorfico Lock/Unlock in basso CENTRATO */}
      {/* Toggle visibile solo quando aperta (hover) o pinnata */}
      {(pinned || hovered) && (
        <MDBox mb={2} px={2} display="flex" justifyContent="center">
          <NeumorphicLockToggle checked={pinned} onChange={togglePinned} />
        </MDBox>
      )}
    </SidenavRoot>
  );
}

// Setting default values for the props of Sidenav
Sidenav.defaultProps = {
  color: "info",
  brand: "",
  brandCollapsed: "",
};

// Typechecking props for the Sidenav
Sidenav.propTypes = {
  color: PropTypes.oneOf(["primary", "secondary", "info", "success", "warning", "error", "dark"]),
  brand: PropTypes.string,
  brandCollapsed: PropTypes.string,
  brandName: PropTypes.string.isRequired,
  routes: PropTypes.arrayOf(PropTypes.object),
};

export default Sidenav;
