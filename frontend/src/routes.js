/**
=========================================================
* Material Dashboard 2 React - v2.2.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

/**
  All of the routes for the Material Dashboard 2 React are added here.
  You can add a new route, customize the routes and delete the routes here.

  Once you add a new route on this file it will be visible automatically on
  the Sidenav.

  For adding a new route you can follow the existing routes in the routes array.
  1. The `type` key with the `collapse` value is used for a route.
  2. The `type` key with the `title` value is used for a title inside the Sidenav. 
  3. The `type` key with the `divider` value is used for a divider between Sidenav items.
  4. The `name` key is used for the name of the route on the Sidenav.
  5. The `key` key is used for the key of the route (It will help you with the key prop inside a loop).
  6. The `icon` key is used for the icon of the route on the Sidenav, you have to add a node.
  7. The `collapse` key is used for making a collapsible item on the Sidenav that has other routes
  inside (nested routes), you need to pass the nested routes inside an array as a value for the `collapse` key.
  8. The `route` key is used to store the route location which is used for the react router.
  9. The `href` key is used to store the external links location.
  10. The `title` key is only for the item with the type of `title` and its used for the title text on the Sidenav.
  11. The `component` key is used to store the component of its route.
*/

// Material Dashboard 2 React layouts
import Dashboard from "layouts/dashboard";
import ApplicationsList from "layouts/applications";
import SubAppLayout from "layouts/newproject/SubAppLayout";
import ThreatDatabase from "layouts/threat-database";
import WorkInProgress from "layouts/common/WorkInProgress";
import AnalysisfromApp from "layouts/applications/AnalysisfromApp";

// @mui icons
import Icon from "@mui/material/Icon";

const routes = [
  {
    type: "collapse",
    name: "Dashboard",
    key: "dashboard",
    icon: <Icon fontSize="small">dashboard</Icon>,
    route: "/dashboard",
    component: <Dashboard />,
  },
  {
    type: "collapse",
    name: "Threat Database",
    key: "threat-database",
    icon: <Icon fontSize="small">table_view</Icon>,
    route: "/threat-database",
    component: <ThreatDatabase />,
    roles: ["root"],
  },
  {
    type: "collapse",
    name: "Applicazion List",
    key: "applications",
    icon: <Icon fontSize="small">apps</Icon>,
    route: "/applications",
    component: <ApplicationsList />,
    roles: ["admin", "client"],
  },
  {
    type: "collapse",
    name: "New Project",
    key: "new-project",
    icon: <Icon fontSize="small">add_circle</Icon>,
    route: "/newproject/*",
    component: <SubAppLayout />,
    roles: ["client"],
  },
  // ==========================
  //        SETTINGS GROUP
  // ==========================
  {
    type: "collapse",
    name: "Settings",
    key: "settings",
    icon: <Icon fontSize="small">settings</Icon>,
    roles: ["admin"],
    collapse: [
      {
        type: "collapse",
        name: "Authentication",
        key: "settings-authentication",
        icon: <Icon fontSize="small">vpn_key</Icon>,
        route: "/settings/authentication",
        component: (
          <WorkInProgress
            title="Authentication"
            subtitle="Gestione provider, token e policy di accesso."
          />
        ),
        roles: ["admin"],
      },
      {
        type: "collapse",
        name: "Log Management",
        key: "settings-log-management",
        icon: <Icon fontSize="small">receipt_long</Icon>,
        route: "/settings/log-management",
        component: (
          <WorkInProgress
            title="Log management"
            subtitle="Configurazione e instradamento dei log."
          />
        ),
        roles: ["admin"],
      },
      {
        type: "collapse",
        name: "Mail Server",
        key: "settings-mail-server",
        icon: <Icon fontSize="small">mail</Icon>,
        route: "/settings/mail-server",
        component: <WorkInProgress title="Mail Server" subtitle="SMTP, test invio e template." />,
        roles: ["admin"],
      },
      {
        type: "collapse",
        name: "Connection Status",
        key: "settings-connection-status",
        icon: <Icon fontSize="small">donut_large</Icon>,
        route: "/settings/connection-status",
        component: (
          <WorkInProgress title="Connection Status" subtitle="Stato connessioni e heartbeat." />
        ),
        roles: ["admin"],
      },
      // ---- 2° livello
      {
        type: "collapse",
        name: "Engine Manager",
        key: "settings-engine-management",
        icon: <Icon fontSize="small">tune</Icon>,
        route: "/settings/engine-management",
        component: (
          <WorkInProgress
            title="Engine Management"
            subtitle="Gestione di elementi e regole custom."
          />
        ),
        roles: ["admin"],
        collapse: [
          {
            type: "collapse",
            name: "Custom Rule",
            key: "settings-engine-manegement-custom-rule",
            icon: <Icon fontSize="small">rule</Icon>,
            route: "/settings/engine-management/custom-rule",
            component: (
              <WorkInProgress
                title="Custom Rule"
                subtitle="Crea e gestisci regole personalizzate."
              />
            ),
            roles: ["admin"],
          },
          {
            type: "collapse",
            name: "Custom Element",
            key: "settings-engine-management-custom-element",
            icon: <Icon fontSize="small">extension</Icon>,
            route: "/settings/engine-management/custom-element",
            component: (
              <WorkInProgress
                title="Custom Element"
                subtitle="Definisci elementi e tassonomie custom."
              />
            ),
            roles: ["admin"],
          },
        ],
      },
    ],
  },
  {
    key: "analysis-from-app",
    route: "/analysis/:appId",
    component: <AnalysisfromApp />,
  },
];

export default routes;
