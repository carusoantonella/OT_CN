// src/components/ProtocolModal.jsx
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import "./EdgeProtocol.css";

const PROTOCOLS = [
  { value: "http", label: "HTTP" },
  { value: "https", label: "HTTPS" },
  { value: "ftp", label: "FTP" },
  { value: "ssh", label: "SSH" },
  { value: "mqtt", label: "MQTT" },
  { value: "modbus", label: "Modbus" },
  { value: "opcua", label: "OPC UA" },
  { value: "coap", label: "CoAP" },
  { value: "rdp", label: "RDP" },
  { value: "telnet", label: "Telnet" },
  { value: "smb", label: "SMB" },
  { value: "icmp", label: "ICMP" },
  { value: "vnc", label: "VNC" },
];

export default function EdgeProtocol({ edge, open, onSave, onClose }) {
  const [protocol, setProtocol] = useState("");

  useEffect(() => {
    setProtocol(edge?.data?.metadata?.protocol || "");
  }, [edge]);

  if (!open) return null;

  return (
    <aside className="protocol-panel">
      <header className="protocol-header">
        <h3>Connessione</h3>
        <button className="protocol-close" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="protocol-body">
        <label htmlFor="protocol-select">Protocollo</label>
        <select id="protocol-select" value={protocol} onChange={(e) => setProtocol(e.target.value)}>
          <option value="">— seleziona —</option>
          {PROTOCOLS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <footer className="protocol-footer">
        <button className="protocol-btn-cancel" onClick={onClose}>
          Annulla
        </button>
        <button className="protocol-btn-save" onClick={() => onSave(edge.id, protocol)}>
          Salva
        </button>
      </footer>
    </aside>
  );
}

EdgeProtocol.propTypes = {
  edge: PropTypes.object,
  open: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
