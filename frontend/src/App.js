// 1) Sopprimi subito l’errore di ResizeObserver
window.addEventListener("error", (event) => {
  if (
    event.message &&
    event.message.includes("ResizeObserver loop completed with undelivered notifications.")
  ) {
    // blocca solo questo errore
    event.stopImmediatePropagation();
  }
});

import { useState, useEffect, useMemo } from "react";

// react-router components
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// @mui material components
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Icon from "@mui/material/Icon";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";

// Material Dashboard 2 React example components
import Sidenav from "examples/Sidenav";
import Configurator from "examples/Configurator";

// Material Dashboard 2 React themes
import theme from "assets/theme";
import themeRTL from "assets/theme/theme-rtl";

// Material Dashboard 2 React Dark Mode themes
import themeDark from "assets/theme-dark";
import themeDarkRTL from "assets/theme-dark/theme-rtl";

// RTL plugins
import rtlPlugin from "stylis-plugin-rtl";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";

// Material Dashboard 2 React routes
import routes from "routes";

// Material Dashboard 2 React contexts
import { useMaterialUIController, setMiniSidenav, setOpenConfigurator } from "context";

// Images
import brandWhite from "assets/images/logo/Logo_H_negativo.svg";
import brandDark from "assets/images/logo/Logo_H_bkg_transparent.svg";
import brandCollapsed from "assets/images/logo/Logo_negativo.svg";

import ProtectedRoute from "./ProtectedRoute";
import SignIn from "layouts/authentication/sign-in";
import { getUserRoles } from "utils/auth";

export default function App() {
  const [controller, dispatch] = useMaterialUIController();
  const {
    miniSidenav,
    direction,
    layout,
    openConfigurator,
    sidenavColor,
    transparentSidenav,
    whiteSidenav,
    darkMode,
  } = controller;
  const [onMouseEnter, setOnMouseEnter] = useState(false);
  const [rtlCache, setRtlCache] = useState(null);
  const { pathname } = useLocation();

  // Filtra routes per ruolo (RBAC lato UI) — OR logico su più ruoli (case-insensitive)
  const userRoles = useMemo(() => getUserRoles(), []);
  const normalize = (arr) => (arr || []).map((s) => String(s).trim().toLowerCase());
  const canSee = (route) =>
    !route.roles || normalize(route.roles).some((r) => userRoles.includes(r));
  const filterByRole = (list) =>
    list
      .filter(canSee)
      .map((it) => (it.collapse ? { ...it, collapse: filterByRole(it.collapse) } : it));
  const filteredRoutes = useMemo(() => filterByRole(routes), [userRoles, routes]);

  // Cache for the rtl
  useMemo(() => {
    const cacheRtl = createCache({
      key: "rtl",
      stylisPlugins: [rtlPlugin],
    });
    setRtlCache(cacheRtl);
  }, []);

  // Open sidenav when mouse enter on mini sidenav
  const handleOnMouseEnter = () => {};
  const handleOnMouseLeave = () => {};

  // Change the openConfigurator state
  const handleConfiguratorOpen = () => setOpenConfigurator(dispatch, !openConfigurator);

  // Setting the dir attribute for the body element
  useEffect(() => {
    document.body.setAttribute("dir", direction);
  }, [direction]);

  // Setting page scroll to 0 when changing the route
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.scrollingElement.scrollTop = 0;
  }, [pathname]);

  const getRoutes = (allRoutes) =>
    allRoutes.map((route) => {
      if (route.collapse) {
        return getRoutes(route.collapse);
      }
      if (route.route) {
        // Se la route ha un vincolo di ruolo, usa ProtectedRoute con roles
        if (route.roles && route.roles.length) {
          return (
            <Route element={<ProtectedRoute roles={route.roles} />} key={`${route.key}-guard`}>
              <Route exact path={route.route} element={route.component} />
            </Route>
          );
        }
        return <Route exact path={route.route} element={route.component} key={route.key} />;
      }
      return null;
    });

  const configsButton = (
    <MDBox
      display="flex"
      justifyContent="center"
      alignItems="center"
      width="3.25rem"
      height="3.25rem"
      bgColor="white"
      shadow="sm"
      borderRadius="50%"
      position="fixed"
      right="2rem"
      bottom="2rem"
      zIndex={99}
      color="dark"
      sx={{ cursor: "pointer" }}
      onClick={handleConfiguratorOpen}
    >
      <Icon fontSize="small" color="inherit">
        settings
      </Icon>
    </MDBox>
  );

  return (
    <ThemeProvider theme={darkMode ? themeDark : theme}>
      <CssBaseline />
      {layout === "dashboard" && (
        <>
          <Sidenav
            color={sidenavColor}
            brand={
              miniSidenav
                ? brandCollapsed
                : (transparentSidenav && !darkMode) || whiteSidenav
                ? brandDark
                : brandWhite
            }
            brandCollapsed={brandCollapsed}
            routes={filteredRoutes}
          />
          <Configurator />
          {configsButton}
        </>
      )}
      {layout === "vr" && <Configurator />}
      <MDBox className="app-content">
        <Configurator />
        {configsButton}
        <Routes>
          {/* Route di login */}
          <Route path="/" element={<Navigate to="/authentication/sign-in" />} />
          <Route path="/authentication/sign-in" element={<SignIn />} />
          {/* Rotte protette */}
          <Route element={<ProtectedRoute />}>{getRoutes(filteredRoutes)}</Route>
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/authentication/sign-in" />} />
        </Routes>
      </MDBox>
    </ThemeProvider>
  );
}
