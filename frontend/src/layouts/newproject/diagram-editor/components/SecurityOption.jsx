import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import "./SecurityOption.css";

export const schema = {
  AzureSQL: [
    {
      name: "auth",
      label: "Autenticazione",
      type: "dropdown",
      options: ["SQL Auth", "AD", "LDAP", "OAuth2"],
    },
    {
      name: "encryptionAtRest",
      label: "Crittografia at-rest",
      type: "checkbox",
      options: ["AES256", "TDE"],
    },
    {
      name: "encryptionInTransit",
      label: "Crittografia in-transito",
      type: "checkbox",
      options: ["TLS1.2", "TLS1.3"],
    },
    { name: "patchLevel", label: "Patch level (YYYY-MM)", type: "text" },
    { name: "backupRetention", label: "Backup & retention", type: "text" },
  ],
  AzureDB: [
    {
      name: "auth",
      label: "Autenticazione",
      type: "dropdown",
      options: ["SQL Auth", "AD", "LDAP", "OAuth2"],
    },
    {
      name: "encryptionAtRest",
      label: "Crittografia at-rest",
      type: "checkbox",
      options: ["AES256", "TDE"],
    },
    {
      name: "encryptionInTransit",
      label: "Crittografia in-transito",
      type: "checkbox",
      options: ["TLS1.2", "TLS1.3"],
    },
  ],
  StorageAcct: [
    {
      name: "encryptionAtRest",
      label: "Crittografia at-rest",
      type: "checkbox",
      options: ["AES256"],
    },
    {
      name: "accessTier",
      label: "Access tier",
      type: "dropdown",
      options: ["Hot", "Cool", "Archive"],
    },
  ],
  VM: [
    { name: "os", label: "OS & versione", type: "text" },
    { name: "hardening", label: "Hardening checklist", type: "checkbox", options: ["CIS", "DISA"] },
    { name: "mfa", label: "MFA obbligatorio", type: "checkbox", options: ["Enabled"] },
  ],
  VNet: [
    {
      name: "subnet",
      label: "Subnet di appartenenza",
      type: "dropdown",
      options: ["prod", "dev", "dmz"],
    },
    {
      name: "nsg",
      label: "Network Security Group",
      type: "dropdown",
      options: ["NSG-Prod", "NSG-Dev"],
    },
    { name: "ddos", label: "DDoS Protection", type: "checkbox", options: ["Enabled"] },
  ],
  FirewallHW: [
    {
      name: "vendor",
      label: "Vendor",
      type: "dropdown",
      options: [
        "Fortinet",
        "Check Point Software Technologies",
        "Cisco Systems",
        "Sophos",
        "Palo Alto Networks",
        "Barracuda Networks",
        "Forcepoint",
        "Juniper Networks",
        "SonicWall",
      ],
    },
    {
      name: "version",
      label: "Version",
      type: "text",
    },
    {
      name: "rules",
      label: "Regole abilitate",
      type: "checkbox",
      options: ["HTTP", "HTTPS", "SSH"],
    },
    {
      name: "logging",
      label: "Log & monitoring",
      type: "dropdown",
      options: ["Info", "Warn", "Error"],
    },
  ],
  "GE.HISTORIAN-REPLICA": [
    {
      name: "vendor",
      label: "Vendor",
      type: "dropdown",
      options: ["Microsoft SQL Server", "Oracle Database", "MySQL", "PostgreSQL", "IBM Db2"],
    },
    {
      name: "version",
      label: "Version",
      type: "text",
    },
  ],
  "GE.HISTORIAN": [
    {
      name: "vendor",
      label: "Vendor",
      type: "dropdown",
      options: ["Microsoft SQL Server", "Oracle Database", "MySQL", "PostgreSQL", "IBM Db2"],
    },
    {
      name: "version",
      label: "Version",
      type: "text",
    },
  ],
  group: [
    { name: "trustBoundary", label: "Trust boundary", type: "text" },
    {
      name: "networkZone",
      label: "Network zone",
      type: "dropdown",
      options: ["public", "private", "dmz"],
    },
  ],
  connection: [
    {
      name: "protocol",
      label: "Protocollo",
      type: "dropdown",
      options: ["http", "https", "ftp"],
    },
  ],
};

export default function SecurityOption({
  node,
  edges = [],
  nodes = [],
  onSaveNode,
  onSaveEdges,
  onDeleteEdge,
  onClose,
}) {
  const [values, setValues] = useState({});
  const [edgeProtocols, setEdgeProtocols] = useState({});

  // Only initialize when node changes
  useEffect(() => {
    if (!node) return;
    // metadata nodo
    setValues(node.data.metadata || {});

    // protocolli delle sole connessioni uscenti di questo nodo
    const outgoing = Array.isArray(edges) ? edges.filter((e) => e.source === node.id) : [];
    const initProtocols = {};
    outgoing.forEach((e) => {
      initProtocols[e.id] = e.data?.metadata?.protocol || "";
    });
    setEdgeProtocols(initProtocols);
    // il dependency array contiene SOLO node.id, non edges
  }, [node?.id]);

  if (!node) return null;

  const handleChange = (field, val) => {
    setValues((prev) => ({ ...prev, [field]: val }));
  };

  const handleCheckbox = (field, option) => {
    const prev = Array.isArray(values[field]) ? values[field] : [];
    const next = prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option];
    handleChange(field, next);
  };

  const handleEdgeProtocolChange = (edgeId, protocol) => {
    setEdgeProtocols((prev) => ({ ...prev, [edgeId]: protocol }));
  };

  const onSubmit = () => {
    onSaveNode(node.id, values);
    onSaveEdges(edgeProtocols);
    onClose();
  };

  // Determine fields for node metadata
  const baseFields = [
    { name: "label", label: "Label", type: "text" },
    {
      name: "ipSubnet",
      label: "IP/Subnet",
      type: "text",
    },
  ];
  const fields = schema[node.data.nature] || [];
  const allFields = [...baseFields, ...fields];

  // Safe outgoing edges array
  const outgoing = Array.isArray(edges) ? edges.filter((e) => e.source === node.id) : [];

  return (
    <aside className="security-panel open">
      <header className="panel-header">
        <h2>Proprietà: {node.data.label}</h2>
        <button className="close-btn" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="panel-content">
        {/* Node metadata fields */}
        {allFields.map(({ name, label, type, options }) => (
          <div key={name} className="form-row">
            <label className="form-label">{label}</label>
            {type === "text" && (
              <input
                className="form-input"
                type="text"
                value={values[name] || ""}
                onChange={(e) => handleChange(name, e.target.value)}
              />
            )}
            {type === "dropdown" && (
              <select
                className="form-input"
                value={values[name] || ""}
                onChange={(e) => handleChange(name, e.target.value)}
              >
                <option value="">— seleziona —</option>
                {options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
            {type === "checkbox" && (
              <div className="checkbox-group">
                {options.map((o) => (
                  <label key={o} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={(values[name] || []).includes(o)}
                      onChange={() => handleCheckbox(name, o)}
                    />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Outgoing edge protocols */}
        {outgoing.length > 0 && (
          <div className="edge-protocols-section">
            <h5>Protocolli connessioni uscenti</h5>
            {outgoing.map((e) => {
              // trova il label del nodo target
              const targetNode = nodes.find((n) => n.id === e.target);
              const targetLabel = targetNode?.data?.label || e.target;
              return (
                <div key={e.id} style={{ marginBottom: "1rem" }}>
                  {/* titolo con label */}
                  <div className="form-row">
                    <strong>
                      {node.data.label} → {targetLabel}
                    </strong>
                  </div>
                  {/* select + delete sotto */}
                  <div
                    className="form-row"
                    style={{ display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    <select
                      className="form-input"
                      value={edgeProtocols[e.id] || ""}
                      onChange={(ev) => handleEdgeProtocolChange(e.id, ev.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option value="">—</option>
                      <option value="http">HTTP</option>
                      <option value="https">HTTPS</option>
                      <option value="ftp">FTP</option>
                    </select>
                    <button
                      type="button"
                      title="Elimina connessione"
                      onClick={() => onDeleteEdge(e.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#c00",
                        fontSize: "18px",
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <footer className="panel-footer">
        <button className="btn btn-secondary" onClick={onClose}>
          Annulla
        </button>
        <button className="btn btn-primary" onClick={onSubmit}>
          Salva
        </button>
      </footer>
    </aside>
  );
}

SecurityOption.propTypes = {
  node: PropTypes.shape({
    id: PropTypes.string.isRequired,
    data: PropTypes.shape({
      label: PropTypes.string,
      nature: PropTypes.string,
      metadata: PropTypes.object,
    }).isRequired,
  }),
  edges: PropTypes.array,
  nodes: PropTypes.array.isRequired,
  onSaveNode: PropTypes.func.isRequired,
  onSaveEdges: PropTypes.func.isRequired,
  onDeleteEdge: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
