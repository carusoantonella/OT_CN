import React, { useState } from "react";
import PropTypes from "prop-types";
import { Handle, Position } from "reactflow";
import "./Node.css";
import { FaProjectDiagram, FaUser, FaUserShield, FaUserCog, FaUserAlt } from "react-icons/fa";

// importa qui le tue immagini reali da src/assets
import defaultIcon from "../assets/default-icon.png";
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

// OT/ICS
// (single generic icon requested for all OT nodes)
import otGenericServerIcon from "../assets/OT/generic-server.png";

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
  InternalUser: <FaUser />,
  ExternalUser: <FaUserAlt />,
  PrivilegedUser: <FaUserShield />,
  ServiceAccount: <FaUserCog />,

  // OT nodes (Purdue / ICS)
  "OT.HMI": otGenericServerIcon,
  "OT.PLC": otGenericServerIcon,
  "OT.RTU": otGenericServerIcon,
  "OT.OPC": otGenericServerIcon,
  "OT.OPCA": otGenericServerIcon,
  "OT.DCS": otGenericServerIcon,
  "OT.SCADA": otGenericServerIcon,
  "OT.SIS": otGenericServerIcon,
  "OT.ESD": otGenericServerIcon,
  "OT.BMS": otGenericServerIcon,
  "OT.IED": otGenericServerIcon,
  "OT.MNTL": otGenericServerIcon,
  "OT.SNS": otGenericServerIcon,
  "OT.ACT": otGenericServerIcon,
  "OT.FLD": otGenericServerIcon,
  "OT.PCTRL": otGenericServerIcon,
  "OT.BLKV": otGenericServerIcon,
  "OT.CTRLV": otGenericServerIcon,
  "OT.XMIT": otGenericServerIcon,

  // IT nodes (still using the same generic OT icon, as requested)
  "IT.SMTP": otGenericServerIcon,
  "IT.PAM": otGenericServerIcon,
  "IT.NTP": otGenericServerIcon,
};

export default function GenericNode({ id, data, selected }) {
  const [nodeName, setNodeName] = useState(data.label);

  const handleNameChange = (e) => {
    setNodeName(e.target.value);
  };

  const iconKey = data.metadata?.iconName || data.nature;
  const iconEntry = iconMap[iconKey];

  const IconComponent = React.isValidElement(iconEntry) ? (
    React.cloneElement(iconEntry, { className: "node-icon-fa" })
  ) : (
    <img src={iconEntry || defaultIcon} alt={data.label} className="node-icon-img" />
  );

  const commitName = () => {
    data.label = nodeName;
    data.onSaveLabel?.(id, { ...data.metadata, label: nodeName });
  };

  return (
    <div
      className={`generic-node ${selected ? "selected" : ""}`}
      style={{ position: "relative", cursor: "pointer" }}
      onClick={(e) => {
        e.stopPropagation();
        data.openModal();
      }}
    >
      <button
        className="delete-btn"
        onClick={(e) => {
          e.stopPropagation();
          data.onDelete(id);
        }}
      >
        ×
      </button>

      <div className="node-icon">{IconComponent}</div>

      <Handle
        type="target"
        id="target-top"
        position={Position.Top}
        style={{ pointerEvents: "all" }}
      />
      <Handle
        type="target"
        id="target-left"
        position={Position.Left}
        style={{ pointerEvents: "all" }}
      />
      <Handle
        type="source"
        id="source-right"
        position={Position.Right}
        style={{ pointerEvents: "all" }}
      />
      <Handle
        type="source"
        id="source-bottom"
        position={Position.Bottom}
        style={{ pointerEvents: "all" }}
      />

      <input
        type="text"
        value={nodeName}
        onChange={handleNameChange}
        onBlur={commitName}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitName();
          }
        }}
        className="node-name-input"
        onClick={(e) => e.stopPropagation()}
      />

      {data.metadata?.ipSubnet && <div className="node-subnet">{data.metadata.ipSubnet}</div>}
    </div>
  );
}

GenericNode.propTypes = {
  id: PropTypes.string.isRequired,
  selected: PropTypes.bool,
  data: PropTypes.shape({
    label: PropTypes.string,
    nature: PropTypes.string,
    metadata: PropTypes.shape({
      ipSubnet: PropTypes.string,
      iconName: PropTypes.string,
    }),
    openModal: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onSaveLabel: PropTypes.func,
  }).isRequired,
};
