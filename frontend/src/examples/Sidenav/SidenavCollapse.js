// src/examples/Sidenav/SidenavCollapse.js
import PropTypes from "prop-types";
import { useState, useMemo, useRef } from "react"; // ⬅️ Aggiunto useRef
import { NavLink, useLocation } from "react-router-dom";

import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Collapse from "@mui/material/Collapse";
import Icon from "@mui/material/Icon";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

import MDBox from "components/MDBox";
import {
  collapseItem,
  collapseIconBox,
  collapseIcon,
  collapseText,
} from "examples/Sidenav/styles/sidenavCollapse";

import { useMaterialUIController } from "context";

function SidenavCollapse({ icon, name, route, children, active: activeProp, ...rest }) {
  const [controller] = useMaterialUIController();
  const { transparentSidenav, whiteSidenav, darkMode, sidenavColor } = controller;

  const location = useLocation();
  const isParent = !!children;

  const isActive = useMemo(() => {
    if (typeof activeProp === "boolean") return activeProp;
    if (!route) return false;
    const cur = location.pathname;
    return cur === route || cur.startsWith(route + "/");
  }, [activeProp, route, location.pathname]);

  const [open, setOpen] = useState(isActive);

  // ---------- HOVER HANDLERS (solo per i parent) ----------
  const hoverTimer = useRef(null);
  const handleHoverEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    // piccolo delay per evitare flicker quando passi ai figli
    hoverTimer.current = setTimeout(() => setOpen(true), 60);
  };
  const handleHoverLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    // leggero delay per uscita (passaggi rapidi non chiudono subito)
    hoverTimer.current = setTimeout(() => setOpen(false), 120);
  };

  const renderIcon = () => (
    <ListItemIcon
      sx={(theme) =>
        collapseIconBox(theme, { transparentSidenav, whiteSidenav, darkMode, active: isActive })
      }
    >
      {typeof icon === "string" ? (
        <Icon sx={(theme) => collapseIcon(theme, { active: isActive })}>{icon}</Icon>
      ) : (
        icon
      )}
    </ListItemIcon>
  );

  // ====== FOGLIA ======
  if (!isParent) {
    return (
      <ListItem component="li" disablePadding>
        <NavLink to={route || "#"} style={{ textDecoration: "none", width: "100%" }}>
          <MDBox
            {...rest}
            className="sidenav-item-inner" // usata nel CSS per lo stato collapsed
            sx={(theme) =>
              collapseItem(theme, {
                active: isActive,
                transparentSidenav,
                whiteSidenav,
                darkMode,
                sidenavColor,
              })
            }
          >
            {renderIcon()}
            <ListItemText
              primary={name}
              sx={(theme) =>
                collapseText(theme, {
                  miniSidenav: false, // non usiamo mini; il CSS farà il resto
                  transparentSidenav,
                  whiteSidenav,
                  active: isActive,
                })
              }
            />
            {/* slot a destra: vuota per uniformare l’allineamento in collapsed */}
            <span className="chevron-slot" aria-hidden="true" />
          </MDBox>
        </NavLink>
      </ListItem>
    );
  }

  // ====== PADRE (espandibile su HOVER + resta aperto sui figli) ======
  return (
    // 👇 wrapper che include riga padre + Collapse
    <div onMouseEnter={handleHoverEnter} onMouseLeave={handleHoverLeave} style={{ width: "100%" }}>
      <ListItem component="li" disablePadding>
        <MDBox
          {...rest}
          className="sidenav-item-inner"
          // niente toggle click: usiamo hover
          onClick={(e) => e.preventDefault()}
          sx={(theme) =>
            collapseItem(theme, {
              active: isActive,
              transparentSidenav,
              whiteSidenav,
              darkMode,
              sidenavColor,
            })
          }
        >
          {renderIcon()}
          <ListItemText
            primary={name}
            sx={(theme) =>
              collapseText(theme, {
                miniSidenav: false,
                transparentSidenav,
                whiteSidenav,
                active: isActive,
              })
            }
          />
          <span className="chevron-slot">
            {open ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
          </span>
        </MDBox>
      </ListItem>

      {/* 👇 Fa parte dello stesso wrapper: spostandoti sui figli NON scatta onMouseLeave */}
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List disablePadding className="submenu-list">
          {children}
        </List>
      </Collapse>
    </div>
  );
}

SidenavCollapse.defaultProps = {
  active: false,
  route: undefined,
  children: null,
};

SidenavCollapse.propTypes = {
  icon: PropTypes.node.isRequired,
  name: PropTypes.string.isRequired,
  active: PropTypes.bool,
  route: PropTypes.string,
  children: PropTypes.node,
};

export default SidenavCollapse;
