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
// OT icons
import genericOTServerIcon from "../assets/OT/generic-server.png";
import wirelessIcon from "../assets/OT/accesspoint.png";
import pamIcon from "../assets/OT/PAM.png";
import smtpIcon from "../assets/OT/smtp-server.png";
import vpnIcon from "../assets/OT/vpn.png";

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
  "GE.EWS": genericOTServerIcon,
  "GE.OWS": genericOTServerIcon,
  "GE.HISTORIAN-REPLICA": genericOTServerIcon,
  "GE.HISTORIAN": genericOTServerIcon,
  "GE.INDUSTRIAL-FW": genericOTServerIcon,
  "GE.NGFW": genericOTServerIcon,
  "GE.DC": genericOTServerIcon,
  "GE.PRIMARY-BCK": genericOTServerIcon,
  "GE.SECONDARY-BCK": genericOTServerIcon,
  "GE.NAS": genericOTServerIcon,
  "GE.PATCHING": genericOTServerIcon,
  "GE.AV": genericOTServerIcon,
  "GE.LOGGING": genericOTServerIcon,
  "GE.JUMPSERVER": genericOTServerIcon,
  "GE.WS": genericOTServerIcon,
  "GE.APPSERVER": genericOTServerIcon,
  "GE.DATATRANSFER": genericOTServerIcon,
  "GE.NMS": genericOTServerIcon,
  "GE.HMI": genericOTServerIcon,
  "GE.PLC": genericOTServerIcon,
  "GE.RTU": genericOTServerIcon,
  "GE.OPC": genericOTServerIcon,
  "GE.DCS": genericOTServerIcon,
  "GE.SCADA": genericOTServerIcon,
  "SAFETY.SIS": genericOTServerIcon,
  "SAFETY.ESD": genericOTServerIcon,
  "SAFETY.BMS": genericOTServerIcon,
  "GE.IED": genericOTServerIcon,
  "ABB.DCS": genericOTServerIcon,
  "AVEVA.PIINTERFACE": genericOTServerIcon,
  "AVEVA.PICONNECTOR": genericOTServerIcon,
  "AVEVA.PIVISION": genericOTServerIcon,
  "AVEVA.PIASSETFR": genericOTServerIcon,
  "AVEVA.PIMANUALLOGGER": genericOTServerIcon,
  "AVEVA.PIDATAARCHIVE": genericOTServerIcon,
  "AVEVA.PIPROCESSBOOK": genericOTServerIcon,
  "AVEVA.PIDATALINK": genericOTServerIcon,
  "AVEVA.PISYSTEMEXPLORER": genericOTServerIcon,
  "AVEVA.PIBUILDER": genericOTServerIcon,
  "AVEVA.PIANALYSIS": genericOTServerIcon,
  "ASPENTECH.CLOUDCONNECT": genericOTServerIcon,
  "ASPENTECH.IP21": genericOTServerIcon,
  "ASPENTECH.DATASERVER": genericOTServerIcon,
  "ASPENTECH.SITESERVER": genericOTServerIcon,
  "ASPENTECH.WS": genericOTServerIcon,
  "GE.MLAPTOP": genericOTServerIcon,
  "GE.SMTP": smtpIcon,
  "GE.PAM": pamIcon,
  "GE.VPN": vpnIcon,
  "GE.WAP": wirelessIcon,
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
    /* altrimenti è un URL img o undefined */ <img
      src={iconEntry || defaultIcon}
      alt={data.label}
      className="node-icon-img"
    />
  );
  // al blur o a Invio, salviamo la nuova label
  const commitName = () => {
    // scrivi su data.label così React Flow rilegge la label
    data.label = nodeName;
    // e chiama il salvataggio sul parent
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
        onBlur={commitName} // salva al blur
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
