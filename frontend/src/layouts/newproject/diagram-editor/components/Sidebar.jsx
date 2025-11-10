// src/components/Sidebar.jsx
import React, { useState } from "react";
import "./Sidebar.css";
import defaultIcon from "../assets/default-icon.png";
import {
  FaGripHorizontal,
  FaProjectDiagram,
  FaPlus,
  FaMinus,
  FaCloud,
  FaUser,
  FaUserShield,
  FaUserCog,
  FaUserAlt,
  FaNetworkWired,
} from "react-icons/fa";

// import real images from src/assets
import azureSqlIcon from "../assets/azure-sql.png";
import cosmosDbIcon from "../assets/cosmosdb.png";
import storageAcctIcon from "../assets/storage-account.png";
import blobStorageIcon from "../assets/blob-storage.png";
import funcIcon from "../assets/functions.png";
import appServiceIcon from "../assets/app-service.png";
import aksIcon from "../assets/aks.png";
import keyVaultIcon from "../assets/key-vault.png";
import serviceBusIcon from "../assets/service-bus.png";
import eventHubIcon from "../assets/event-hub.png";
import vpnGatewayIcon from "../assets/vpn-gateway.png";
import appGwWafIcon from "../assets/app-gateway-waf.png";
import firewallAzIcon from "../assets/azure-firewall.png";
// on-premise
import serverRackIcon from "../assets/server-rack.png";
import sanIcon from "../assets/san-storage.png";
import vmIcon from "../assets/virtual-machine.png";
import firewallHwIcon from "../assets/firewall-hw.png";
import switchIcon from "../assets/network-switch.png";
// networking
import vnetIcon from "../assets/virtual-switch.png";
import subnetIcon from "../assets/subnet.png";
import lbIcon from "../assets/load-balancer.png";
import internetIcon from "../assets/internet.png";
import nsgIcon from "../assets/nsg.png";
import iotDevice from "../assets/iot-device.png";

// OT generic icon
import genericOTServerIcon from "../assets/OT/generic-server.png";
import wirelessIcon from "../assets/OT/accesspoint.png";
import pamIcon from "../assets/OT/PAM.png";
import smtpIcon from "../assets/OT/smtp-server.png";
import vpnIcon from "../assets/OT/vpn.png";

const CATEGORIES = [
  {
    title: "👥 Utenti",
    items: [
      {
        type: "InternalUser",
        label: "Utente Interno",
        icon: <FaUser className="sidebar-icon-fa" />,
        iconName: "User",
      },
      {
        type: "ExternalUser",
        label: "Utente Esterno",
        icon: <FaUserAlt className="sidebar-icon-fa" />,
        iconName: "ExternalUser",
      },
      {
        type: "PrivilegedUser",
        label: "Utente Privilegiato",
        icon: <FaUserShield className="sidebar-icon-fa" />,
        iconName: "PrivilegedUser",
      },
      {
        type: "ServiceAccount",
        label: "Service Account",
        icon: <FaUserCog className="sidebar-icon-fa" />,
        iconName: "ServiceAccount",
      },
    ],
  },
  {
    title: "☁️ Azure Cloud",
    items: [
      { type: "AzureSQL", label: "Azure SQL DB", iconImg: azureSqlIcon },
      { type: "CosmosDB", label: "Cosmos DB", iconImg: cosmosDbIcon },
      { type: "StorageAcct", label: "Storage Account", iconImg: storageAcctIcon },
      { type: "BlobStorage", label: "Blob Storage", iconImg: blobStorageIcon },
      { type: "Func", label: "Functions", iconImg: funcIcon },
      { type: "AppService", label: "App Service", iconImg: appServiceIcon },
      { type: "AKS", label: "Kubernetes (AKS)", iconImg: aksIcon },
      { type: "KeyVault", label: "Key Vault", iconImg: keyVaultIcon },
      { type: "ServiceBus", label: "Service Bus", iconImg: serviceBusIcon },
      { type: "EventHub", label: "Event Hub", iconImg: eventHubIcon },
      { type: "VPNGateway", label: "VPN Gateway", iconImg: vpnGatewayIcon },
      { type: "AppGwWAF", label: "App Gateway WAF", iconImg: appGwWafIcon },
      { type: "FirewallAZ", label: "Azure Firewall", iconImg: firewallAzIcon },
    ],
  },
  {
    title: "🏢 On-Premise",
    items: [
      { type: "ServerRack", label: "Server Rack", iconImg: serverRackIcon },
      { type: "SAN", label: "SAN Storage", iconImg: sanIcon },
      { type: "VM", label: "Virtual Machine", iconImg: vmIcon },
      { type: "FirewallHW", label: "Firewall HW", iconImg: firewallHwIcon },
      { type: "Switch", label: "Network Switch", iconImg: switchIcon },
      { type: "GE.MLAPTOP", label: "Maintenance Laptop", iconImg: genericOTServerIcon },
      { type: "GE.SMTP", label: "SMTP Server", iconImg: smtpIcon },
      { type: "GE.PAM", label: "PAM Server", iconImg: pamIcon },
      { type: "GE.VPN", label: "VPN", iconImg: vpnIcon },
    ],
  },
  {
    title: "🌐 Networking",
    items: [
      { type: "VNet", label: "Virtual Network", iconImg: vnetIcon },
      { type: "Subnet", label: "Subnet", iconImg: subnetIcon },
      { type: "LB", label: "Load Balancer", iconImg: lbIcon },
      { type: "Internet", label: "Internet", iconImg: internetIcon },
      { type: "NSG", label: "NSG", iconImg: nsgIcon },
      { type: "IoTDevice", label: "IoT Device", iconImg: iotDevice },
      { type: "GE.WAP", label: "Wireless Access Point", iconImg: wirelessIcon },
    ],
  },
  {
    title: "⚙️ OT",
    items: [
      { type: "GE.EWS", label: "Engineering Workstation", iconImg: genericOTServerIcon },
      { type: "GE.OWS", label: "Operator Workstation", iconImg: genericOTServerIcon },
      {
        type: "GE.HISTORIAN-REPLICA",
        label: "Historian Replica Server",
        iconImg: genericOTServerIcon,
      },
      { type: "GE.HISTORIAN", label: "Historian Server", iconImg: genericOTServerIcon },
      { type: "GE.INDUSTRIAL-FW", label: "FW industriale", iconImg: genericOTServerIcon },
      { type: "GE.NGFW", label: "Next Generation Firewall", iconImg: genericOTServerIcon },
      { type: "GE.DC", label: "Domain Controller", iconImg: genericOTServerIcon },
      { type: "GE.PRIMARY-BCK", label: "Backup Server (Primary)", iconImg: genericOTServerIcon },
      {
        type: "GE.SECONDARY-BCK",
        label: "Backup Server (Secondary)",
        iconImg: genericOTServerIcon,
      },
      { type: "GE.NAS", label: "NAS Server", iconImg: genericOTServerIcon },
      { type: "GE.PATCHING", label: "Patch Management", iconImg: genericOTServerIcon },
      { type: "GE.AV", label: "Antivirus Server - AV", iconImg: genericOTServerIcon },
      { type: "GE.LOGGING", label: "Log Collector", iconImg: genericOTServerIcon },
      { type: "GE.JUMPSERVER", label: "Jump Server", iconImg: genericOTServerIcon },
      { type: "GE.WS", label: "Web Server", iconImg: genericOTServerIcon },
      { type: "GE.APPSERVER", label: "Application Server", iconImg: genericOTServerIcon },
      { type: "GE.DATATRANSFER", label: "Data Transfer Server", iconImg: genericOTServerIcon },
      { type: "GE.NMS", label: "Network Management Server", iconImg: genericOTServerIcon },
      { type: "GE.HMI", label: "Human Machine Interface", iconImg: genericOTServerIcon },
      { type: "GE.PLC", label: "PLC", iconImg: genericOTServerIcon },
      { type: "GE.RTU", label: "RTU", iconImg: genericOTServerIcon },
      { type: "GE.OPC", label: "OPC Server", iconImg: genericOTServerIcon },
      { type: "GE.DCS", label: "DCS Server", iconImg: genericOTServerIcon },
      { type: "GE.SCADA", label: "SCADA Server", iconImg: genericOTServerIcon },

      // Safety systems
      { type: "SAFETY.SIS", label: "SIS", iconImg: genericOTServerIcon },
      { type: "SAFETY.ESD", label: "ESD", iconImg: genericOTServerIcon },
      { type: "SAFETY.BMS", label: "BMS", iconImg: genericOTServerIcon },

      // Other OT
      { type: "GE.IED", label: "Intelligent Electronic Device", iconImg: genericOTServerIcon },
      { type: "ABB.DCS", label: "800xA", iconImg: genericOTServerIcon },

      // PI System
      { type: "AVEVA.PIINTERFACE", label: "PI Interface", iconImg: genericOTServerIcon },
      { type: "AVEVA.PICONNECTOR", label: "PI Connector", iconImg: genericOTServerIcon },
      { type: "AVEVA.PIVISION", label: "PI Vision", iconImg: genericOTServerIcon },
      { type: "AVEVA.PIASSETFR", label: "PI Asset Framework", iconImg: genericOTServerIcon },
      { type: "AVEVA.PIMANUALLOGGER", label: "PI Manual Logger", iconImg: genericOTServerIcon },
      { type: "AVEVA.PIDATAARCHIVE", label: "PI Data Archive", iconImg: genericOTServerIcon },
      { type: "AVEVA.PIPROCESSBOOK", label: "PI Process Book", iconImg: genericOTServerIcon },
      { type: "AVEVA.PIDATALINK", label: "PI Data Link", iconImg: genericOTServerIcon },
      { type: "AVEVA.PISYSTEMEXPLORER", label: "PI System Explorer", iconImg: genericOTServerIcon },
      { type: "AVEVA.PIBUILDER", label: "PI Builder", iconImg: genericOTServerIcon },
      { type: "AVEVA.PIANALYSIS", label: "PI Analysis", iconImg: genericOTServerIcon },

      // AspenTech
      {
        type: "ASPENTECH.CLOUDCONNECT",
        label: "Aspen Cloud Connect",
        iconImg: genericOTServerIcon,
      },
      { type: "ASPENTECH.IP21", label: "IP21", iconImg: genericOTServerIcon },
      { type: "ASPENTECH.DATASERVER", label: "IP21 Data Server", iconImg: genericOTServerIcon },
      { type: "ASPENTECH.SITESERVER", label: "IP21 Site Server", iconImg: genericOTServerIcon },
      { type: "ASPENTECH.WS", label: "Aspen Web Server", iconImg: genericOTServerIcon },
    ],
  },
  {
    title: "🔗 Area di rete",
    items: [
      {
        type: "group",
        label: "On-Premise Area",
        icon: <FaProjectDiagram className="sidebar-icon-fa" />,
        groupType: "onPremise",
        iconName: "group",
      },
      {
        type: "group",
        label: "Cloud Area",
        icon: <FaCloud className="sidebar-icon-fa" />,
        groupType: "cloud",
        iconName: "group",
      },
    ],
  },
  {
    title: "🏗️ Purdue Levels",
    items: [
      {
        type: "group",
        label: "Level 5 – Enterprise/Corporate Network",
        icon: <FaNetworkWired className="sidebar-icon-fa" />,
        groupType: "Level_5_P2M",
        iconName: "group",
      },
      {
        type: "group",
        label: "Level 4 – Site Business Planing & Logistics",
        icon: <FaNetworkWired className="sidebar-icon-fa" />,
        groupType: "Level_4_P2M",
        iconName: "group",
      },
      {
        type: "group",
        label: "Level 3.5 – DMZ",
        icon: <FaNetworkWired className="sidebar-icon-fa" />,
        groupType: "Level_3_DMZ_P2M",
        iconName: "group",
      },
      {
        type: "group",
        label: "Level 3 – Operations Zone",
        icon: <FaNetworkWired className="sidebar-icon-fa" />,
        groupType: "Level_3_P2M",
        iconName: "group",
      },
      {
        type: "group",
        label: "Level 2 – Supervisory Control",
        icon: <FaNetworkWired className="sidebar-icon-fa" />,
        groupType: "Level_2_P2M",
        iconName: "group",
      },
      {
        type: "group",
        label: "Level 1 – Basic Control",
        icon: <FaNetworkWired className="sidebar-icon-fa" />,
        groupType: "Level_1_BC_P2M",
        iconName: "group",
      },
      {
        type: "group",
        label: "Level 1 – Safety and Protection",
        icon: <FaNetworkWired className="sidebar-icon-fa" />,
        groupType: "Level_1_SP_P2M",
        iconName: "group",
      },
      {
        type: "group",
        label: "Level 0 – Field Devices",
        icon: <FaNetworkWired className="sidebar-icon-fa" />,
        groupType: "Level_0_P2M",
        iconName: "group",
      },
    ],
  },
];

export default function Sidebar() {
  const [expanded, setExpanded] = useState({});
  const toggle = (title) => setExpanded((prev) => ({ ...prev, [title]: !prev[title] }));

  const onDragStart = (e, item) => {
    e.dataTransfer.setData("application/reactflow", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="sidebar">
      {/* Sidebar title (right-aligned) */}
      <div className="sb-header-min">
        <h2 className="sb-title-min">components</h2>
      </div>
      {CATEGORIES.map((cat) => (
        <section key={cat.title} className="sidebar-section">
          <div className="section-header" onClick={() => toggle(cat.title)}>
            <h3 className="section-title">{cat.title}</h3>
            <span className="section-toggle">{expanded[cat.title] ? <FaMinus /> : <FaPlus />}</span>
          </div>

          {expanded[cat.title] && (
            <div className="section-grid">
              {cat.items.map((it) => (
                <div
                  key={`${it.type}-${it.groupType}`}
                  className="sidebar-item"
                  draggable
                  onDragStart={(e) => {
                    onDragStart(e, {
                      type: it.type,
                      label: it.label,
                      iconName: it.type,
                      groupType: it.groupType,
                    });
                  }}
                >
                  <FaGripHorizontal className="drag-handle" />

                  {it.iconImg ? (
                    <img src={it.iconImg} alt={it.label} className="sidebar-icon-img" />
                  ) : it.icon ? (
                    it.icon
                  ) : (
                    <img src={defaultIcon} alt={it.label} className="sidebar-icon-img" />
                  )}

                  <span className="item-label">{it.label}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </aside>
  );
}
