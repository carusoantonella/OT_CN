import React from "react";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDAvatar from "components/MDAvatar";
import defaultIcon from "../diagram-editor/assets/default-icon.png";
import { FaProjectDiagram, FaUser, FaUserShield, FaUserCog, FaUserAlt } from "react-icons/fa";

// import real images from src/assets
import azureSqlIcon from "../diagram-editor/assets/azure-sql.png";
import cosmosDbIcon from "../diagram-editor/assets/cosmosdb.png";
import storageAcctIcon from "../diagram-editor/assets/storage-account.png";
import blobStorageIcon from "../diagram-editor/assets/blob-storage.png";
import funcIcon from "../diagram-editor/assets/functions.png";
import appServiceIcon from "../diagram-editor/assets/app-service.png";
import aksIcon from "../diagram-editor/assets/aks.png";
import keyVaultIcon from "../diagram-editor/assets/key-vault.png";
import serviceBusIcon from "../diagram-editor/assets/service-bus.png";
import eventHubIcon from "../diagram-editor/assets/event-hub.png";
import vpnGatewayIcon from "../diagram-editor/assets/vpn-gateway.png";
import appGwWafIcon from "../diagram-editor/assets/app-gateway-waf.png";
import firewallAzIcon from "../diagram-editor/assets/azure-firewall.png";

// on-premise
import serverRackIcon from "../diagram-editor/assets/server-rack.png";
import sanIcon from "../diagram-editor/assets/san-storage.png";
import vmIcon from "../diagram-editor/assets/virtual-machine.png";
import firewallHwIcon from "../diagram-editor/assets/firewall-hw.png";
import switchIcon from "../diagram-editor/assets/network-switch.png";

// networking
import vnetIcon from "../diagram-editor/assets/virtual-switch.png";
import subnetIcon from "../diagram-editor/assets/subnet.png";
import lbIcon from "../diagram-editor/assets/load-balancer.png";
import internetIcon from "../diagram-editor/assets/internet.png";
import nsgIcon from "../diagram-editor/assets/nsg.png";
import iotDevice from "../diagram-editor/assets/iot-device.png";

// OT / IT (same icon as requested)
import genericOTServerIcon from "../diagram-editor/assets/OT/generic-server.png";

export default function tableData(items, onEdit) {
  const iconMap = {
    AzureSQL: azureSqlIcon,
    CosmosDB: cosmosDbIcon,
    StorageAcct: storageAcctIcon,
    BlobStorage: blobStorageIcon,
    Func: funcIcon,
    AppService: appServiceIcon,
    AKS: aksIcon,
    KeyVault: keyVaultIcon,
    ServiceBus: serviceBusIcon,
    EventHub: eventHubIcon,
    VPNGateway: vpnGatewayIcon,
    AppGwWAF: appGwWafIcon,
    FirewallAZ: firewallAzIcon,
    ServerRack: serverRackIcon,
    SAN: sanIcon,
    VM: vmIcon,
    FirewallHW: firewallHwIcon,
    Switch: switchIcon,
    VNet: vnetIcon,
    Subnet: subnetIcon,
    LB: lbIcon,
    Internet: internetIcon,
    NSG: nsgIcon,
    IoTDevice: iotDevice,

    group: <FaProjectDiagram className="node-icon-fa" />,
    InternalUser: <FaUser size={30} />,
    ExternalUser: <FaUserAlt size={30} />,
    PrivilegedUser: <FaUserShield size={30} />,
    ServiceAccount: <FaUserCog size={30} />,

    // OT nodes (must match Sidebar.jsx / GenericNode.jsx)
    "OT.HMI": genericOTServerIcon,
    "OT.PLC": genericOTServerIcon,
    "OT.RTU": genericOTServerIcon,
    "OT.OPC": genericOTServerIcon,
    "OT.OPCA": genericOTServerIcon,
    "OT.DCS": genericOTServerIcon,
    "OT.SCADA": genericOTServerIcon,
    "OT.SIS": genericOTServerIcon,
    "OT.ESD": genericOTServerIcon,
    "OT.BMS": genericOTServerIcon,
    "OT.IED": genericOTServerIcon,
    "OT.MNTL": genericOTServerIcon,
    "OT.SNS": genericOTServerIcon,
    "OT.ACT": genericOTServerIcon,
    "OT.FLD": genericOTServerIcon,
    "OT.PCTRL": genericOTServerIcon,
    "OT.BLKV": genericOTServerIcon,
    "OT.CTRLV": genericOTServerIcon,
    "OT.XMIT": genericOTServerIcon,

    // IT nodes (requested to use same OT icon)
    "IT.SMTP": genericOTServerIcon,
    "IT.PAM": genericOTServerIcon,
    "IT.NTP": genericOTServerIcon,
  };

  const columns = [
    { Header: "Icona", accessor: "icon", width: "10%", align: "center" },
    { Header: "Label", accessor: "label", align: "left" },
    { Header: "Zone", accessor: "zone", align: "left" },
    { Header: "Tipo", accessor: "nature", align: "center" },
    { Header: "Proprietà di sicurezza", accessor: "properties", align: "left" },
    { Header: "Azioni", accessor: "actions", align: "center" },
  ];

  const rows = items.map((it) => {
    const meta = it.metadata || {};

    // Icon key resolution aligned with GenericNode:
    // - prefer metadata.iconName (es. "OT.PLC")
    // - fallback to it.nature
    const iconKey = meta.iconName || it.nature;
    const iconValue = iconMap[iconKey];

    // Zona/gruppo
    const parentLabel = meta.parentLabel || "-";

    return {
      icon: (
        <MDBox
          display="flex"
          justifyContent="center"
          alignItems="center"
          sx={{ width: 32, height: 32 }}
        >
          {typeof iconValue === "string" ? (
            <MDAvatar src={iconValue} name={it.label} size={20} />
          ) : iconValue ? (
            iconValue
          ) : (
            <MDAvatar src={defaultIcon} name={it.label} size={20} />
          )}
        </MDBox>
      ),
      label: (
        <MDTypography variant="button" fontWeight="medium">
          {it.label}
        </MDTypography>
      ),
      zone: (
        <MDTypography variant="caption" color="text">
          {parentLabel}
        </MDTypography>
      ),
      nature: (
        <MDTypography variant="caption" color="text">
          Object
        </MDTypography>
      ),
      properties: (
        <MDBox display="flex" flexDirection="column" gap={0.5}>
          {Object.entries(it.displayMetadata ?? meta)
            .filter(
              ([k]) =>
                k !== "parentGroupId" &&
                k !== "parentGroupNodeId" &&
                k !== "parentGroupLogicalId" &&
                k !== "parentLabel"
            )
            .map(([k, v]) => {
              if (Array.isArray(v)) {
                return (
                  <MDTypography variant="caption" key={k}>
                    <strong>{k}:</strong> {v.join(", ")}
                  </MDTypography>
                );
              }
              if (v && typeof v === "object") {
                return (
                  <MDBox key={k} display="flex" flexDirection="column" sx={{ ml: 1 }}>
                    <MDTypography variant="caption" fontWeight="medium">
                      {k}:
                    </MDTypography>
                    {Object.entries(v).map(([subk, subv]) => (
                      <MDTypography variant="caption" key={subk} sx={{ ml: 2 }}>
                        <strong>{subk}:</strong> {String(subv)}
                      </MDTypography>
                    ))}
                  </MDBox>
                );
              }
              return (
                <MDTypography variant="caption" key={k}>
                  <strong>{k}:</strong> {String(v)}
                </MDTypography>
              );
            })}
        </MDBox>
      ),
      actions: (
        <MDBox display="flex" justifyContent="center" gap={1}>
          <MDButton
            size="small"
            variant="outlined"
            color="dark"
            onClick={() => onEdit(it.id, meta)}
          >
            EDIT
          </MDButton>
        </MDBox>
      ),
    };
  });

  return { columns, rows };
}
