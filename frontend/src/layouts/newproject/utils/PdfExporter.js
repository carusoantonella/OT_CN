// utils/PdfExporter.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImg from "assets/images/logo/Logo_bkg_transparent.png";

/**
 * Disegna un bar chart “statico” direttamente su jsPDF.
 *
 * @param {jsPDF} pdf   — l’istanza di jsPDF
 * @param {number} x0   — margine sinistro
 * @param {number} y0   — margine superiore
 * @param {number} w    — larghezza totale allocata
 * @param {number} h    — altezza totale allocata
 * @param {string[]} labels — etichette delle barre
 * @param {number[]} values — valore di ciascuna barra
 * @param {string} title  — titolo sopra il grafico
 */
function drawBarChart(pdf, x0, y0, w, h, labels, values, title) {
  const maxVal = Math.max(...values, 1);
  const barCount = labels.length;
  const gutter = 10;
  const barW = (w - gutter * (barCount + 1)) / barCount;
  const axisColor = [100, 100, 100];

  // Titolo
  pdf
    .setFont("helvetica", "bold")
    .setFontSize(12)
    .text(title, x0, y0 - 6);

  // Assi
  pdf.setDrawColor(...axisColor);
  pdf.setLineWidth(0.5);
  pdf.line(x0, y0, x0, y0 + h);
  pdf.line(x0, y0 + h, x0 + w, y0 + h);

  // Barre
  labels.forEach((lbl, i) => {
    const val = values[i];
    const barH = (val / maxVal) * (h - 10);
    const bx = x0 + gutter + i * (barW + gutter);
    const by = y0 + h - barH;
    // colore in base alla severity
    let fill;
    switch (lbl) {
      case "Critical":
        fill = [244, 67, 54];
        break;
      case "High":
        fill = [255, 121, 97];
        break;
      case "Medium":
        fill = [255, 183, 77];
        break;
      case "Low":
        fill = [100, 181, 246];
        break;
      default:
        fill = [129, 199, 132];
    }
    pdf.setFillColor(...fill).rect(bx, by, barW, barH, "F");
    // label sotto la barra
    pdf.setFont("helvetica", "normal").setFontSize(8);
    const textX = bx + barW / 2;
    pdf.text(lbl, textX, y0 + h + 10, {
      align: "center",
      maxWidth: barW + 4,
    });
    // valore sopra la barra
    pdf.text(String(val), textX, by - 2, { align: "center" });
  });
}

/**
 * Disegna un pie chart direttamente su jsPDF.
 *
 * @param {jsPDF} pdf
 * @param {number} x0 — centro X
 * @param {number} y0 — centro Y
 * @param {number} r  — raggio
 * @param {string[]} labels
 * @param {number[]} values
 * @param {string} title
 */

function generateExecutiveSummary(threatLabels, threatValues, cveLabels, cveValues) {
  const totalThreats = threatValues.reduce((s, v) => s + v, 0) || 1;
  const totalCves = cveValues.reduce((s, v) => s + v, 0) || 1;

  // Ordino severità per percentuale decrescente
  const threatData = threatLabels
    .map((lbl, i) => ({
      label: lbl,
      count: threatValues[i],
      pct: ((threatValues[i] / totalThreats) * 100).toFixed(1),
    }))
    .sort((a, b) => b.pct - a.pct);

  // Ordino componenti CVE per numero decrescente
  const cveData = cveLabels
    .map((lbl, i) => ({
      label: lbl,
      count: cveValues[i],
    }))
    .sort((a, b) => b.count - a.count);

  // Primo paragrafo: overview minacce
  // --- generateExecutiveSummary ---
  const threatsText = [
    `During the analysis, ${totalThreats} threats were identified, divided into ${threatLabels.length} severity levels.`,
    `The most relevant severity component is ${threatData[0].label} (` +
      `${threatData[0].count} threats, ${threatData[0].pct}% of the total), followed by ` +
      `${threatData[1].label} (${threatData[1].pct}%).`,
  ].join(" ");

  // Secondo paragrafo: overview CVE
  const topComponents = cveData
    .slice(0, 2)
    .map((d) => `${d.label} (${d.count})`)
    .join(" e ");
  const cveText = [
    `A total of ${totalCves} CVEs were detected associated with the analyzed components.`,
    `The components with the highest number of vulnerabilities are ${topComponents}, `,
  ].join(" ");

  const remediationText =
    "To mitigate the identified threats and vulnerabilities, it is recommended to implement the detailed remediation plan included in this report. Priority actions include the timely application of critical patches, the review of security configurations, and the implementation of access controls at both network and application level.";
  return { threatsText, cveText, remediationText };
}

function drawPieChart(pdf, x0, y0, r, labels, values, title) {
  // ① filtro fuori tutte le fette a zero
  const nz = labels.map((lbl, i) => ({ lbl, v: values[i] })).filter((d) => d.v > 0);
  const labelsNZ = nz.map((d) => d.lbl);
  const valuesNZ = nz.map((d) => d.v);
  const total = valuesNZ.reduce((sum, v) => sum + v, 0) || 1;

  let startAngle = 0;
  const colors = {
    Critical: [244, 67, 54],
    High: [255, 121, 97],
    Medium: [255, 183, 77],
    Low: [100, 181, 246],
    Info: [129, 199, 132],
  };

  // Titolo
  pdf
    .setFont("helvetica", "bold")
    .setFontSize(12)
    .text(title, x0 - r, y0 - r - 8);

  // prendo il context2d di jsPDF per usare beginPath/arc
  const ctx = pdf.context2d;
  labelsNZ.forEach((lbl, i) => {
    // angolo della fetta in radianti
    const sliceAngle = (valuesNZ[i] / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;

    // disegno la fetta
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.arc(x0, y0, r, startAngle, endAngle, false);
    ctx.closePath();
    pdf.setFillColor(...(colors[lbl] || [200, 200, 200]));
    ctx.fill();
    // etichetta numerica al centro della fetta
    const midAngle = startAngle + sliceAngle / 2;
    const labelX = x0 + Math.cos(midAngle) * (r * 0.6);
    const labelY = y0 + Math.sin(midAngle) * (r * 0.6);
    pdf.setFont("helvetica", "bold").setFontSize(10);
    pdf.text(String(valuesNZ[i]), labelX, labelY, { align: "center" });

    // passo all'angolo successivo
    startAngle = endAngle;
  });

  // Legenda
  let ly = y0 - r;
  labels.forEach((lbl, i) => {
    pdf.setDrawColor(0);
    pdf.setFillColor(...(colors[lbl] || [200, 200, 200]));
    pdf.rect(x0 + r + 20, ly - 6, 10, 10, "F");
    if (valuesNZ[i] === undefined) valuesNZ[i] = 0; // per evitare NaN in caso di slice a zero
    pdf
      .setFont("helvetica", "normal")
      .setFontSize(10)
      .text(`${labels[i]}`, x0 + r + 36, ly + 2);
    ly += 14;
  });
}

export function buildThreatModelPdf({
  appName,
  logoImage = logoImg,
  creationDate,
  registryInfo = {},
  diagramImage,
  objects = [],
  edges = [],
  threatSchema = [],
  detectedCve = [],
  remediationPlan = [],
  groups = [],
}) {
  const systemKeys = [
    "id",
    "x",
    "y",
    "width",
    "height",
    "nature",
    "iconName",
    "groupType",
    "source",
    "target",
    "parentGroupId",
    "Type",
    "label",
  ];
  const pdf = new jsPDF("portrait", "pt", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const severityOrder = { Critical: 5, High: 4, Medium: 3, Low: 2, Info: 1 };
  const sortedThreats = [...threatSchema].sort(
    (a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0)
  );
  const sortedCves = [...detectedCve].sort((a, b) => parseFloat(b.score) - parseFloat(a.score));

  // ───────── Copertina ──────────────────────────────────────────────────────
  // sfondo
  pdf.setFillColor(255, 255, 255).rect(0, 0, pageWidth, pageHeight, "F");

  // dimensioni statiche del logo (in punti)
  const logoW = 300;
  const logoH = 150;
  const totalBlockHeight = logoH + 36 + 18 + 20;
  // logoH + titleFontSize(36) + subtitleFontSize(18) + spacingBetween(20)
  const startY = (pageHeight - totalBlockHeight) / 2 - 50;
  const logoX = (pageWidth - logoW) / 2;
  // disegna logo
  pdf.addImage(logoImage, "PNG", logoX, startY, logoW, logoH);

  // titolo principale
  pdf.setTextColor(22, 54, 92).setFont("helvetica", "bold").setFontSize(30);
  const titleY = startY + logoH + 50; // posizionamento verticale sotto il logo
  pdf.text("Threat Modeling Analysis", pageWidth / 2, titleY, { align: "center" });

  // sottotitolo corsivo con nome app
  pdf.setFont("helvetica", "italic").setFontSize(18).setTextColor(55, 71, 79);
  const subtitleY = titleY + 30; // qualche punto sotto il titolo
  pdf.text(appName, pageWidth / 2, subtitleY, { align: "center" });

  // data in basso a destra
  pdf
    .setFont("helvetica", "normal")
    .setFontSize(12)
    .setTextColor(55, 71, 79)
    .text(creationDate, pageWidth - 40, pageHeight - 40, { align: "right" });

  // ─── Info anagrafica progetto sulla copertina ────────────────────────────
  pdf.setFont("helvetica", "normal").setFontSize(10).setTextColor(55, 71, 79);

  // ───────── Executive Summary ─────────────────────────────────────────────
  pdf.addPage();
  let tocPage = pdf.getCurrentPageInfo().pageNumber;
  pdf.addPage();
  pdf.setFillColor(235, 240, 245).rect(40, 40, pageWidth - 75, 30, "F");
  pdf.setFont("helvetica", "bold").setFontSize(20).setTextColor(22, 54, 92);
  pdf.text("Executive Summary", 40, 60);

  // --- Executive Summary intro ---
  const intro =
    "This Executive Summary provides a concise overview of the identified threats and the vulnerabilities (CVEs) detected during the threat model analysis. Two key charts and an interpretation of the data are presented to support business and security decisions. This summary is intended to provide top management with an immediate tool to understand priority risks, align the security budget with operational priorities, and define the most effective action plan. In particular, the focus is on the areas of greatest exposure and the countermeasures to be adopted to reduce the time-to-mitigation. It is recommended to integrate these findings with periodic reviews and promptly update the model as the threat landscape evolves.";
  pdf.setFont("helvetica", "normal").setFontSize(12);
  // Splitta il testo per capire quante righe occupa
  const pageW = pdf.internal.pageSize.getWidth() - 80;
  const introLines = pdf.splitTextToSize(intro, pageW);
  // Altezza riga = fontSize * lineHeightFactor (11 * 1.3 ≈ 14.3)
  const lineHeight = 11 * 1.3;
  const introStartY = 60 + pdf.getFontSize() + 15;
  pdf.text(introLines, 40, introStartY, {
    maxWidth: pageW,
    align: "justify",
    lineHeightFactor: 1.3,
  });
  const introHeight = introLines.length * lineHeight;

  // gap dopo l’intro
  const gapAfterIntro = 50;
  const introBottomY = introStartY + introHeight + gapAfterIntro;

  // Calcolo dati dinamici
  const severityLabels = ["Critical", "High", "Medium", "Low", "Info"];
  const threatCounts = severityLabels.map(
    (l) => threatSchema.filter((t) => t.severity === l).length
  );
  const cveCounts = severityLabels.map(
    (lvl) => detectedCve.filter((c) => c.severity?.toLowerCase() === lvl.toLowerCase()).length
  );
  const { threatsText, cveText, remediationText } = generateExecutiveSummary(
    severityLabels,
    threatCounts,
    severityLabels,
    cveCounts
  );

  // –– GRAFICI AFFIANCATI SULLO STESSO LIVELLO
  const margin = 40;
  const columnGap = 20;
  const contentW = pageWidth - margin * 2;
  const colWidth = (contentW - columnGap) / 2;
  // Y di base: subito sotto l’intro (o un minimo)
  const chartsY = Math.max(introBottomY, 310); //per abbassare i grafici modificare il valore numerico qui

  // Pie Chart (colonna sinistra)
  const pieX = margin + colWidth / 2 - 35;
  const pieY = chartsY;
  const pieR = 60;
  drawPieChart(pdf, pieX, pieY, pieR, severityLabels, threatCounts, "Threats by Severity");
  pdf
    .setFont("helvetica", "italic")
    .setFontSize(8)
    .text("Picture 1 – Threats by Severity", pieX - pieR, pieY + pieR + 10);

  // Bar Chart (colonna destra)
  const pieDiameter = pieR * 2;
  const gapBetweenCharts = 50; // spazio voluto fra i due grafici

  const barX = pieX + pieDiameter + gapBetweenCharts;
  const barY = chartsY - 60; // compensiamo il titolo interno
  const barW = colWidth;
  const barH = 100;
  drawBarChart(
    pdf,
    barX,
    barY,
    barW,
    barH,
    severityLabels,
    cveCounts,
    "CVEs categorized by Severity"
  );
  pdf
    .setFont("helvetica", "italic")
    .setFontSize(8)
    .text("Picture 2 – CVEs categorized by Severity", barX + 30, barY + barH + 28);

  // –– TESTO DINAMICO
  const textY = barY + barH + 70;
  pdf
    .setFont("helvetica", "normal")
    .setFontSize(12)
    .text(threatsText, 40, textY, { maxWidth: pageW, align: "justify", lineHeightFactor: 1.3 });
  pdf.text(cveText, 40, textY + 45, { maxWidth: pageW, align: "justify", lineHeightFactor: 1.3 });
  // –– PARAGRAFO REMEDIATION
  const remediationY = textY + 75;
  pdf.text(remediationText, 40, remediationY, {
    maxWidth: pageW,
    align: "justify",
    lineHeightFactor: 1.3,
  });

  // –– NOTE FINALI
  const noteY = remediationY + 200;
  pdf.setFont("helvetica", "bold").setFontSize(11).text("Note:", 40, noteY);
  pdf
    .setFont("helvetica", "normal")
    .setFontSize(8)
    .text(
      "• The threat data reflects the current state of the analyzed entities.\n" +
        "• Percentages are rounded to the first decimal place.\n" +
        "• For more detailed information, please refer to the full model.",
      45,
      noteY + 15,
      { lineHeightFactor: 1.3 }
    );

  // raccoglie titolo e pagina per l'indice
  const tocEntries = [];

  // ───────── Helper per sezioni ────────────────────────────────────────────
  function addSection(title, subtitle, contentCb) {
    pdf.addPage();
    const pageNum = pdf.getCurrentPageInfo().pageNumber;
    tocEntries.push({ title, page: pageNum });

    // background titolo
    pdf.setFillColor(235, 240, 245).rect(40, 50, pageWidth - 80, 30, "F");
    pdf.setFont("helvetica", "bold").setTextColor(22, 54, 92).setFontSize(16);
    pdf.text(title, 45, 70);

    pdf.setFont("helvetica", "normal").setFontSize(12).setTextColor(55, 71, 79);
    pdf.text(subtitle, 45, 100, { maxWidth: pageWidth - 90 });

    // callback con posizione di inizio contenuto
    contentCb(100);
  }

  // ───────── Sezioni principali ───────────────────────────────────────────

  // ───────── Definizione delle sezioni secondo la struttura richiesta ─────────
  // 1. Introduzione
  addSection("1. Introduction", "", (y0) => {
    // qui un breve testo introduttivo, ad es. reuse di summaryLines
    pdf.setFont("helvetica", "normal").setFontSize(12);
    // --- Section 1: Introduzione ---
    const introText = [
      "This Threat Modeling document provides a structured assessment of the cybersecurity risks associated with the project. The model is derived from a rigorous analysis of architectural components, data flows, and network interconnections that underpin the application.",
      "The purpose of this report is twofold: on one hand, to provide business decision-makers and technical teams with a clear and shared view of potential vulnerabilities; on the other, to provide concrete guidelines for planning effective and sustainable remediation actions.",
      "The document is organized into four main sections, each addressing a key aspect of the Threat Modeling process:",
      "• App/Project Information – briefly describes the architecture, the identified assets, the security areas, and the interconnections, with details on the properties of each element.",
      "• Identified Threats & Remediation – collects the list of identified threats, accompanied by detailed descriptions and operational recommendations; includes the list of known vulnerabilities (CVEs).",
      "• Evaluation – provides an overall assessment of the security status and suggests intervention priorities.",
      "To facilitate navigation, each section is preceded by a numbered heading and the initial table of contents is clickable. The tables include a dedicated column for “Security Options” to highlight access controls and cryptographic configurations.",
      "Threats are ordered by severity level and CVEs by risk score, to immediately focus attention on the most critical points.",
      "Adopting a proactive approach to security, based on solid and updated threat models, is more essential than ever today. This document represents a living tool: it is recommended to review it periodically and update assets, threats, and remediation plans whenever new features are introduced or new vulnerabilities emerge in the threat landscape.",
    ];
    let curY = y0;
    introText.forEach((line) => {
      const isBullet = line.trim().startsWith("•");
      const x = isBullet ? 60 : 40;
      // capisci dove deve andare a capo
      const wrapped = pdf.splitTextToSize(line, pageWidth - x - 40);
      pdf.text(wrapped, x, curY);
      // interlinea: 16pt per righe normali, 20pt per bullet
      curY += wrapped.length * (isBullet ? 18 : 16);
      // se arrivi in fondo pagina parti con una nuova
      if (curY > pageHeight - 60) {
        pdf.addPage();
        curY = 60;
      }
    });
  });

  // 2. Informazioni App/Project
  addSection("2. App/Project Info", "", (y0) => {
    // 2.1 Anagrafica
    tocEntries.push({ title: "2.1 Project Info", page: pdf.getCurrentPageInfo().pageNumber });
    pdf.setFont("helvetica", "bold").setFontSize(14).text("2.1 Project Info", 45, y0);
    // --- Section 2.1 Anagrafica introTable ---
    const introTable =
      "The information reported in the following table was collected " +
      "during the first step of the analysis phase dedicated to building " +
      "the Threat Modeling model for the application. " +
      "This phase made it possible to define the project context, " +
      "descriptive specifications, and key responsibilities, " +
      "forming the basis for all subsequent security assessments.";

    pdf
      .setFont("helvetica", "normal")
      .setFontSize(12)
      .text(introTable, 40, y0 + 20, {
        maxWidth: pageWidth - 100,
        align: "justify",
        lineHeightFactor: 1.4,
      });

    const marginLR = 40;
    const tableW = pageWidth - marginLR * 2;
    autoTable(pdf, {
      startY: y0 + 80,
      margin: { left: marginLR, right: marginLR },
      tableWidth: tableW,
      head: [["Campo", "Valore"]],
      body: [
        ["Project ID", registryInfo["ID progetto"]],
        ["Project Name", registryInfo["Nome progetto"]],
        ["Description", registryInfo["Descrizione"]],
        ["Project Owner", registryInfo["Referente"]],
      ],
      styles: {
        fontSize: 10,
        cellPadding: 4,
        overflow: "linebreak",
        valign: "middle",
      },
      headStyles: {
        fillColor: [22, 54, 92],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: tableW - 100 },
      },
    });
    let y = pdf.lastAutoTable.finalY + 30;

    // 2.2 Design
    pdf.setFont("helvetica", "bold").setFontSize(14).text("2.2 Design", 45, y);
    y += 20;

    // --- Section 2.2 Design introText ---
    const introText = "Below is the architecture diagram generated during the analysis phase:";
    pdf
      .setFont("helvetica", "normal")
      .setFontSize(12)
      .text(introText, 40, y, {
        maxWidth: pageWidth - 100,
        align: "justify",
      });
    y += 18;

    if (diagramImage) {
      const imgProps = pdf.getImageProperties(diagramImage);
      const origWpx = imgProps.width;
      const origHpx = imgProps.height;
      // 2) converti px → unità PDF
      //    (scaleFactor = px per unità; es. per 'pt' è 96/72 = 1.333)
      const imgW = origWpx / pdf.internal.scaleFactor / 5;
      const imgH = origHpx / pdf.internal.scaleFactor / 5;
      const x = (pageWidth - imgW) / 2;

      // 3) inserisci a dimensioni “naturali”
      pdf.addImage(diagramImage, "PNG", x, y, imgW, imgH);
      pdf.setDrawColor(0, 0, 0); // colore nero
      pdf.setLineWidth(0.5); // spessore 0.5pt
      pdf.rect(x, y, imgW, imgH);
      // margine sotto
      y += imgH + 20;
    }

    // 2.3 Asset List: #, Label, Type, Security Options
    pdf.setFont("helvetica", "bold").setFontSize(14).text("2.3 Asset List", 45, y);
    y += 20;
    autoTable(pdf, {
      startY: y,
      margin: { left: 40, right: 40 },
      tableWidth: pageWidth - 80,
      head: [["#", "Label", "Type", "Security Options"]],
      body: objects.map((o, i) => {
        // prendi le securityOptions da displayMetadata (o da metadata se preferisci)
        const secOpts = Object.entries(o.metadata || {})
          .filter(([key]) => !systemKeys.includes(key))
          .map(([key, val]) => `${key}: ${val}`);
        return [i + 1, o.label, o.nature || "Asset", secOpts.join(", ")];
      }),
      styles: {
        fontSize: 8,
        cellPadding: 4,
        overflow: "linebreak",
        valign: "middle",
        cellWidth: "wrap",
      },
      headStyles: {
        fillColor: [22, 54, 92],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 24 }, // #
        1: { cellWidth: 120 }, // Label
        2: { cellWidth: 60 }, // Type
        3: { cellWidth: pageWidth - 80 - (24 + 120 + 60) }, // Security Options
      },
      pageBreak: "auto",
    });
    // rialziamo y dopo la tabella Asset
    y = pdf.lastAutoTable.finalY + 20;
    // 2.4 Edge List: #, Source Label, Target Label, Type, Protocol
    pdf.setFont("helvetica", "bold").setFontSize(14).text("2.4 Edge List", 45, y);
    y += 20;
    // build map da node.id a node.label
    const nodeLabelMap = objects.reduce((m, o) => {
      m[o.id] = o.label;
      return m;
    }, {});
    autoTable(pdf, {
      startY: y,
      margin: { left: 40, right: 40 },
      tableWidth: pageWidth - 80,
      head: [["#", "Source", "Target", "Type", "Protocol"]],
      body: edges.map((e, idx) => {
        const proto = e.metadata?.protocol ?? e.protocol ?? e.label ?? "";
        const sourceLabel = nodeLabelMap[e.source] || "";
        const targetLabel = nodeLabelMap[e.target] || "";
        return [
          idx + 1, // indice
          sourceLabel,
          targetLabel,
          "Edge",
          proto,
        ];
      }),
      styles: {
        fontSize: 8,
        cellPadding: 4,
        overflow: "linebreak",
        valign: "middle",
        cellWidth: "wrap",
      },
      headStyles: {
        fillColor: [22, 54, 92],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 24 }, // #
        1: { cellWidth: 150 }, // Source
        2: { cellWidth: 150 }, // Target
        3: { cellWidth: 60 }, // Type
        4: { cellWidth: pageWidth - 80 - (24 + 150 + 150 + 60) }, // Protocol prende il resto
      },
      pageBreak: "auto",
    });
    y = pdf.lastAutoTable.finalY + 20;

    // 2.5 Group List
    pdf.setFont("helvetica", "bold").setFontSize(14).text("2.5 Security", 45, y);
    y += 20;
    // tabella #, Label, Type, Security Options
    autoTable(pdf, {
      startY: y,
      margin: { left: 40, right: 40 },
      tableWidth: pageWidth - 80,
      head: [["#", "Label", "Type", "Security Options"]],
      body: groups.map((g, i) => {
        // estrai tutte le proprietà custom escludendo le systemKeys
        const sec = Object.entries(g.metadata || {})
          .filter(([k]) => !systemKeys.includes(k))
          .map(([k, v]) => `${k}:${Array.isArray(v) ? v.join(",") : v}`)
          .join("; ");
        return [i + 1, g.label, "Group", sec];
      }),
      styles: {
        fontSize: 8,
        cellPadding: 4,
        overflow: "linebreak",
        valign: "middle",
        cellWidth: "wrap",
      },
      headStyles: {
        fillColor: [22, 54, 92],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 24 }, // #
        1: { cellWidth: 120 }, // Label
        2: { cellWidth: 60 }, // Type
        3: { cellWidth: pageWidth - 80 - (24 + 120 + 60) }, // Security Options
      },
      pageBreak: "auto",
    });
    y = pdf.lastAutoTable.finalY + 20;
  });

  // 3. Minacce riscontrate & remediation
  addSection("3. Detected Threats & Remediation", "", (y0) => {
    let y = y0;
    // 3.1 Minacce
    tocEntries.push({ title: "3.1 Threats", page: pdf.getCurrentPageInfo().pageNumber });
    pdf.setFont("helvetica", "bold").setFontSize(14).text("3.1 Threats", 45, y);
    y += 20;
    autoTable(pdf, {
      startY: y,
      margin: { left: 40, right: 40 },
      head: [["#", "Level", "Category", "Rule ID", "Description"]],
      body: sortedThreats.map((t, i) => [
        i + 1,
        t.severity || "",
        t.category_name || "",
        t.rule_id || "",
        t.description || "",
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 4,
        overflow: "linebreak",
        valign: "middle",
        cellWidth: "wrap",
      },
      headStyles: {
        fillColor: [22, 54, 92],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 24 }, // #
        1: { cellWidth: 60 }, // Level
        2: { cellWidth: 100 }, // Categoria
        3: { cellWidth: 80 }, // Rule ID
        4: { cellWidth: pageWidth - 80 - (24 + 60 + 100 + 80) }, // Descrizione
      },
      pageBreak: "auto",
    });
    y = pdf.lastAutoTable.finalY + 20;

    // 3.2 CVE
    tocEntries.push({ title: "3.3 CVE", page: pdf.getCurrentPageInfo().pageNumber });
    pdf.setFont("helvetica", "bold").setFontSize(14).text("3.3 CVE", 45, y);
    y += 20;
    autoTable(pdf, {
      startY: y,
      head: [["#", "Label", "Version", "CVE-ID", "Severity", "Score", "Description"]],
      body: sortedCves.map((c, i) => [
        i + 1,
        c.label || "", // se hai un campo label nell’oggetto CVE
        c.version || "", // idem per version
        c.id,
        c.severity,
        c.score,
        c.title || c.description || "",
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: "linebreak",
        valign: "middle",
      },
      headStyles: {
        fillColor: [22, 54, 92],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 20 }, // #
        1: { cellWidth: 80 }, // Label
        2: { cellWidth: 50 }, // Version
        3: { cellWidth: 80 }, // CVE-ID
        4: { cellWidth: 50 }, // Severity
        5: { cellWidth: 30 }, // Score
        6: {
          // Description
          cellWidth: pageWidth - 80 - (20 + 80 + 50 + 60 + 50 + 40),
        },
      },
      pageBreak: "auto",
    });
    y = pdf.lastAutoTable.finalY + 20;

    // 3.3 Remediation
    tocEntries.push({ title: "3.3 Remediation", page: pdf.getCurrentPageInfo().pageNumber });
    pdf.setFont("helvetica", "bold").setFontSize(14).text("3.3 Remediation", 45, y);
    y += 20;
    autoTable(pdf, {
      startY: y,
      margin: { left: 40, right: 40 },
      tableWidth: pageWidth - 80,
      head: [["Rule ID", "Severity", "Threat ID", "Possible Mitigation"]],
      body: sortedThreats.map((t) => [
        t.rule_id || "",
        t.severity || "",
        t.threat_id || "",
        t.possible_mitigation || "",
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 4,
        overflow: "linebreak",
        valign: "middle",
        cellWidth: "wrap",
      },
      headStyles: {
        fillColor: [22, 54, 92],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 80 }, // Rule ID
        1: { cellWidth: 60 }, // Severity
        2: { cellWidth: 80 }, // Threat ID
        3: { cellWidth: pageWidth - 60 - (80 + 60 + 80) }, // Possible Mitigation
      },
      pageBreak: "auto",
    });
  });

  // 4. Evaluation
  addSection("4. Evaluation", "", (y0) => {
    pdf.setFont("times", "normal").setFontSize(12);
    pdf.text("Evaluation (e.g., address medium or info, or high, etc.)", 40, y0, {
      maxWidth: pageWidth - 80,
    });
  });

  // ───────── Popola l’indice ───────────────────────────────────────────────
  pdf.setPage(tocPage);
  pdf.setFont("helvetica", "bold").setFontSize(18).setTextColor(22, 54, 92);
  pdf.text("Index", pageWidth / 2, 60, { align: "center" });

  pdf.setFont("helvetica", "normal").setFontSize(12).setTextColor(33, 33, 33);
  let tocY = 100;
  tocEntries.forEach(({ title, page }) => {
    const isSub = /^\d+\.\d+/.test(title);
    const indent = isSub ? 80 : 60;
    // crea il testo cliccabile per il titolo
    pdf.setTextColor(22, 54, 92);
    pdf.setFont("helvetica", isSub ? "normal" : "bold");
    pdf.setFontSize(isSub ? 12 : 14);
    pdf.textWithLink(title, indent, tocY, { pageNumber: page });
    // e per il numero di pagina, allineato a destra
    const pageLabel = page.toString();
    const pageLabelWidth = pdf.getTextWidth(pageLabel);
    pdf.textWithLink(pageLabel, pageWidth - 60 - pageLabelWidth / 2, tocY, { pageNumber: page });
    tocY += 18;
  });

  // ───────── Salva PDF ─────────────────────────────────────────────────────
  pdf.save(`threat-model-${appName}-${creationDate}.pdf`);
}
