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
} from "react-icons/fa";

// Azure
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

// On-premise
import serverRackIcon from "../assets/server-rack.png";
import sanIcon from "../assets/san-storage.png";
import vmIcon from "../assets/virtual-machine.png";
import firewallHwIcon from "../assets/firewall-hw.png";
import switchIcon from "../assets/network-switch.png";

// Networking
import vnetIcon from "../assets/virtual-switch.png";
import subnetIcon from "../assets/subnet.png";
import lbIcon from "../assets/load-balancer.png";
import internetIcon from "../assets/internet.png";
import nsgIcon from "../assets/nsg.png";
import iotDevice from "../assets/iot-device.png";

// OT/IT (same icon)
import otGenericServerIcon from "../assets/OT/generic-server.png";

const CATEGORIES = [
  {
    title: "👥 Utenti",
    expanded: true,
    items: [
      {
        type: "InternalUser",
        label: "Internal User",
        icon: <FaUser className="sidebar-icon-fa" />,
      },
      {
        type: "ExternalUser",
        label: "External User",
        icon: <FaUserAlt className="sidebar-icon-fa" />,
      },
      {
        type: "PrivilegedUser",
        label: "Privileged User",
        icon: <FaUserShield className="sidebar-icon-fa" />,
      },
      {
        type: "ServiceAccount",
        label: "Service Account",
        icon: <FaUserCog className="sidebar-icon-fa" />,
      },
    ],
  },
  {
    title: "☁️ Azure Cloud",
    expanded: true,
    items: [
      { type: "AzureSQL", label: "Azure SQL", iconImg: azureSqlIcon },
      { type: "CosmosDB", label: "Cosmos DB", iconImg: cosmosDbIcon },
      { type: "StorageAcct", label: "Storage Account", iconImg: storageAcctIcon },
      { type: "BlobStorage", label: "Blob Storage", iconImg: blobStorageIcon },
      { type: "Func", label: "Azure Function", iconImg: funcIcon },
      { type: "AppService", label: "App Service", iconImg: appServiceIcon },
      { type: "AKS", label: "AKS", iconImg: aksIcon },
      { type: "KeyVault", label: "Key Vault", iconImg: keyVaultIcon },
      { type: "ServiceBus", label: "Service Bus", iconImg: serviceBusIcon },
      { type: "EventHub", label: "Event Hub", iconImg: eventHubIcon },
      { type: "VPNGateway", label: "VPN Gateway", iconImg: vpnGatewayIcon },
      { type: "AppGwWAF", label: "App Gateway (WAF)", iconImg: appGwWafIcon },
      { type: "FirewallAZ", label: "Azure Firewall", iconImg: firewallAzIcon },
    ],
  },
  {
    title: "🏢 On-Premise",
    expanded: true,
    items: [
      { type: "ServerRack", label: "Server Rack", iconImg: serverRackIcon },
      { type: "SAN", label: "SAN Storage", iconImg: sanIcon },
      { type: "VM", label: "Virtual Machine", iconImg: vmIcon },
      { type: "FirewallHW", label: "Firewall", iconImg: firewallHwIcon },
      { type: "Switch", label: "Network Switch", iconImg: switchIcon },
    ],
  },
  {
    title: "🌐 Networking",
    expanded: true,
    items: [
      { type: "VNet", label: "Virtual Network", iconImg: vnetIcon },
      { type: "Subnet", label: "Subnet", iconImg: subnetIcon },
      { type: "LB", label: "Load Balancer", iconImg: lbIcon },
      { type: "Internet", label: "Internet", iconImg: internetIcon },
      { type: "NSG", label: "Network Security Group", iconImg: nsgIcon },
      { type: "IoTDevice", label: "IoT Device", iconImg: iotDevice },
    ],
  },
  {
    title: "⚙️ OT",
    expanded: true,
    items: [
      { type: "OT.HMI", label: "Human Machine Interface", iconImg: otGenericServerIcon },
      { type: "OT.PLC", label: "PLC", iconImg: otGenericServerIcon },
      { type: "OT.RTU", label: "RTU", iconImg: otGenericServerIcon },
      { type: "OT.OPC", label: "OPC Server", iconImg: otGenericServerIcon },
      { type: "OT.OPCA", label: "OPC Server Aggregator", iconImg: otGenericServerIcon },
      { type: "OT.DCS", label: "DCS Server", iconImg: otGenericServerIcon },
      { type: "OT.SCADA", label: "SCADA Server", iconImg: otGenericServerIcon },
      { type: "OT.SIS", label: "SIS", iconImg: otGenericServerIcon },
      { type: "OT.ESD", label: "ESD", iconImg: otGenericServerIcon },
      { type: "OT.BMS", label: "BMS", iconImg: otGenericServerIcon },
      { type: "OT.IED", label: "Intelligent Electronic Device", iconImg: otGenericServerIcon },
      { type: "OT.MNTL", label: "Maintenance Laptop", iconImg: otGenericServerIcon },
      { type: "OT.SNS", label: "Sensor", iconImg: otGenericServerIcon },
      { type: "OT.ACT", label: "Actuators", iconImg: otGenericServerIcon },
      { type: "OT.FLD", label: "Other field device", iconImg: otGenericServerIcon },
      { type: "OT.PCTRL", label: "Pump Controller", iconImg: otGenericServerIcon },
      { type: "OT.BLKV", label: "Block Valve", iconImg: otGenericServerIcon },
      { type: "OT.CTRLV", label: "Control Valve", iconImg: otGenericServerIcon },
      { type: "OT.XMIT", label: "Transmitter", iconImg: otGenericServerIcon },
      { type: "IT.SMTP", label: "SMTP Server", iconImg: otGenericServerIcon },
      { type: "IT.PAM", label: "PAM Server", iconImg: otGenericServerIcon },
      { type: "IT.NTP", label: "NTP Server", iconImg: otGenericServerIcon },
    ],
  },
  {
    title: "🔗 Area di rete",
    expanded: true,
    items: [
      {
        type: "group",
        label: "L5 - Enterprise Business Network",
        icon: <FaProjectDiagram className="sidebar-icon-fa" />,
        groupType: "OT.PM.5",
      },
      {
        type: "group",
        label: "L4 - Business Network at Plant",
        icon: <FaProjectDiagram className="sidebar-icon-fa" />,
        groupType: "OT.PM.4",
      },
      {
        type: "group",
        label: "L3.5 - OT DMZ - Major ICS Enforcement Boundary",
        icon: <FaProjectDiagram className="sidebar-icon-fa" />,
        groupType: "OT.PM.3.5",
      },
      {
        type: "group",
        label: "L3 - Site-Wide Supervisory",
        icon: <FaProjectDiagram className="sidebar-icon-fa" />,
        groupType: "OT.PM.3",
      },
      {
        type: "group",
        label: "L2 - Local Supervisory",
        icon: <FaProjectDiagram className="sidebar-icon-fa" />,
        groupType: "OT.PM.2",
      },
      {
        type: "group",
        label: "L1 - Local Controllers",
        icon: <FaProjectDiagram className="sidebar-icon-fa" />,
        groupType: "OT.PM.1",
      },
      {
        type: "group",
        label: "Level 0 - Field Devices",
        icon: <FaProjectDiagram className="sidebar-icon-fa" />,
        groupType: "OT.PM.0",
      },
      {
        type: "group",
        label: "LS - Safety Network",
        icon: <FaProjectDiagram className="sidebar-icon-fa" />,
        groupType: "OT.PM.S",
      },
      {
        type: "group",
        label: "Rete Internet",
        icon: <FaProjectDiagram className="sidebar-icon-fa" />,
        groupType: "OT.PM.INT",
      },
      {
        type: "group",
        label: "Cloud",
        icon: <FaCloud className="sidebar-icon-fa" />,
        groupType: "cloud",
      },
      {
        type: "group",
        label: "OnPremise",
        icon: <FaProjectDiagram className="sidebar-icon-fa" />,
        groupType: "onPremise",
      },
    ],
  },
];

export default function Sidebar() {
  const [expandedMap, setExpandedMap] = useState(() => {
    const initial = {};
    CATEGORIES.forEach((cat) => (initial[cat.title] = cat.expanded !== false));
    return initial;
  });

  const toggleCategory = (title) => {
    setExpandedMap((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const onDragStart = (event, nodeData) => {
    event.dataTransfer.setData("application/reactflow", JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="sidebar">
      {CATEGORIES.map((cat) => {
        const isExpanded = expandedMap[cat.title];
        return (
          <section key={cat.title} className="sidebar-section">
            <div className="section-header" onClick={() => toggleCategory(cat.title)}>
              <h3 className="section-title">{cat.title}</h3>
              <span className="section-toggle">{isExpanded ? <FaMinus /> : <FaPlus />}</span>
            </div>

            {isExpanded && (
              <div className="section-grid">
                {cat.items.map((it) => (
                  <div
                    key={`${it.type}-${it.groupType || ""}`}
                    className="sidebar-item"
                    draggable
                    title={it.label}
                    onDragStart={(e) =>
                      onDragStart(e, {
                        type: it.type,
                        label: it.label,
                        iconName: it.type, // matcha OT.* / IT.* e anche Azure etc
                        groupType: it.groupType,
                        metadata: it.metadata,
                      })
                    }
                  >
                    <FaGripHorizontal className="drag-handle" />

                    {it.icon ? (
                      it.icon
                    ) : (
                      <img
                        src={it.iconImg || defaultIcon}
                        alt={it.label}
                        className="sidebar-icon-img"
                      />
                    )}

                    <span className="item-label">{it.label}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </aside>
  );
}
