/**
 * Génération des PDF — Diagnostic numérique GdN.
 * Fiche 1 page par diagnostic + rapport global.
 */
const PDFDocument = require("pdfkit");

const BLEU = "#204EC1";
const BLEU_F = "#183a92";
const VERT_F = "#13925c";
const ORANGE = "#C6502B";
const GRIS = "#5b6472";
const NOIR = "#111418";

function labelMaps(C) {
  const theme = {};
  C.THEMES.concat([C.THEME_UNKNOWN]).forEach((t) => (theme[t.value] = t.label));
  const svc = {};
  Object.keys(C.SERVICES).forEach((k) => (svc[k] = C.SERVICES[k].label));
  const q = (qq, v) => {
    const o = qq.options.find((x) => x.value === v);
    return o ? o.label.replace(/\.$/, "") : v || "";
  };
  return { theme, svc, q };
}

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("fr-BE", { dateStyle: "long", timeStyle: "short" });
  } catch (e) {
    return iso || "";
  }
}

function header(doc, title, subtitle) {
  const w = doc.page.width;
  doc.save();
  doc.rect(0, 0, w, 72).fill(BLEU);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(15).text("Le Guichet du Numérique", 40, 20);
  doc.font("Helvetica").fontSize(9).fillColor("#dbe2f6").text("Remettre l'humain au cœur du numérique.", 40, 40);
  if (title) {
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#ffffff").text(title, 40, 20, { width: w - 80, align: "right" });
  }
  doc.restore();
  doc.y = 92;
  doc.x = 40;
  if (subtitle) {
    doc.font("Helvetica").fontSize(9).fillColor(GRIS).text(subtitle, 40, 80, { width: w - 80, align: "right" });
  }
}

function footer(doc, eventName) {
  const w = doc.page.width;
  const y = doc.page.height - 52;
  doc.font("Helvetica").fontSize(8).fillColor(GRIS)
    .text("Le Guichet du Numérique" + (eventName ? "  •  " + eventName : "") + "  •  Remettre l'humain au cœur du numérique.", 40, y, { width: w - 80, align: "center", lineBreak: false });
}

function labelPair(doc, label, value, x, w) {
  doc.font("Helvetica-Bold").fontSize(8).fillColor(BLEU).text(label.toUpperCase(), x, doc.y, { width: w });
  doc.font("Helvetica").fontSize(11).fillColor(NOIR).text(value || "—", x, doc.y + 1, { width: w });
  doc.moveDown(0.6);
}

/* ---- Fiche 1 diagnostic ---- */
function streamEntryPdf(res, row, C) {
  const M = labelMaps(C);
  const result = C.computeResult(row);
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="diagnostic-${row.id}.pdf"`);
  doc.pipe(res);

  const asso = row.association || "Participant anonyme";
  header(doc, "Diagnostic n° " + row.id, null);

  doc.font("Helvetica-Bold").fontSize(18).fillColor(NOIR).text(asso, 40, 92, { width: doc.page.width - 80 });
  doc.font("Helvetica").fontSize(9).fillColor(GRIS).text(fmtDate(row.created_at) + (row.event_code ? "  •  " + row.event_code : ""));
  doc.moveDown(1);

  // Bandeau service recommandé
  const bx = 40, bw = doc.page.width - 80;
  const by = doc.y;
  doc.save();
  doc.roundedRect(bx, by, bw, 58, 8).fill(BLEU);
  doc.fillColor("#dbe2f6").font("Helvetica-Bold").fontSize(8).text("SERVICE RECOMMANDÉ", bx + 16, by + 12);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(16).text(result.service.label, bx + 16, by + 24);
  doc.fillColor("#dbe2f6").font("Helvetica").fontSize(9).text(result.service.accroche, bx + 16, by + 44, { width: bw - 32 });
  doc.restore();
  doc.y = by + 72;

  // Deux colonnes : thématiques / public-échéance
  const colW = (bw - 20) / 2;
  const topY = doc.y;
  doc.x = 40; doc.y = topY;
  labelPair(doc, "Thématique prioritaire", result.themePrincipal.label, 40, colW);
  labelPair(doc, "Besoin complémentaire", result.themeSecondaire ? result.themeSecondaire.label : "—", 40, colW);
  labelPair(doc, "Situation actuelle", M.q(C.Q1, row.situation), 40, colW);
  const leftEnd = doc.y;
  const rx = 40 + colW + 20;
  doc.x = rx; doc.y = topY;
  labelPair(doc, "Public concerné", result.publicLabel, rx, colW);
  labelPair(doc, "Échéance souhaitée", result.echeanceLabel, rx, colW);
  labelPair(doc, "Demande exprimée", M.q(C.Q3, row.aide), rx, colW);
  doc.y = Math.max(leftEnd, doc.y) + 6;

  // Recommandation
  doc.save();
  const ry = doc.y;
  doc.roundedRect(40, ry, bw, 2, 1); // placeholder, dynamic height below
  doc.restore();
  doc.font("Helvetica-Bold").fontSize(10).fillColor(BLEU).text("Notre recommandation", 40, ry + 8);
  doc.font("Helvetica").fontSize(10.5).fillColor(NOIR).text(result.explanation, 40, doc.y + 2, { width: bw, align: "left" });
  if (result.secondaireNote) {
    doc.moveDown(0.4);
    doc.font("Helvetica-Oblique").fontSize(9).fillColor(GRIS).text(result.secondaireNote, { width: bw });
  }
  doc.moveDown(1);

  // Coordonnées
  const hasContact = row.email || row.nom || row.prenom;
  const cy = doc.y;
  doc.save();
  doc.roundedRect(40, cy, bw, 1, 0);
  doc.restore();
  doc.font("Helvetica-Bold").fontSize(10).fillColor(VERT_F).text("Coordonnées", 40, cy + 6);
  doc.moveDown(0.2);
  if (hasContact) {
    const nom = [row.prenom, row.nom].filter(Boolean).join(" ");
    doc.font("Helvetica").fontSize(10).fillColor(NOIR);
    const line = (l, v) => { if (v) { doc.font("Helvetica-Bold").text(l + " ", { continued: true }).font("Helvetica").text(v); } };
    line("Nom :", nom);
    line("Fonction :", row.fonction);
    line("E-mail :", row.email);
    line("Téléphone :", row.telephone);
    const consents = [];
    if (row.wants_contact) consents.push("souhaite être recontacté");
    if (row.wants_formations) consents.push("infos formations");
    if (row.wants_newsletter) consents.push("newsletter");
    if (row.no_contact) consents.push("ne souhaite pas être recontacté");
    if (consents.length) line("Souhaits :", consents.join(", "));
    if (row.precisions) { doc.moveDown(0.3); doc.font("Helvetica-Oblique").fontSize(9).fillColor(GRIS).text("« " + row.precisions + " »", { width: bw }); }
  } else {
    doc.font("Helvetica-Oblique").fontSize(10).fillColor(GRIS).text("Aucune coordonnée transmise (diagnostic anonyme).");
  }

  footer(doc, C.EVENT_NAME);
  doc.end();
}

/* ---- Rapport global ---- */
function streamAllPdf(res, rows, stats, C) {
  const M = labelMaps(C);
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="rapport-diagnostics-${new Date().toISOString().slice(0,10)}.pdf"`);
  doc.pipe(res);
  const w = doc.page.width;
  const bw = w - 80;

  header(doc, null, null);
  doc.font("Helvetica-Bold").fontSize(18).fillColor(NOIR).text("Rapport des diagnostics", 40, 92);
  doc.font("Helvetica").fontSize(10).fillColor(GRIS).text((C.EVENT_NAME || "") + "  •  Généré le " + fmtDate(new Date().toISOString()));
  doc.moveDown(1);

  // KPIs
  const kpis = [
    ["Diagnostics", stats.total],
    ["Demandes de contact", stats.leads],
    ["Taux de conversion", stats.conversion + " %"],
    ["Projets à 3 mois", stats.shortTerm],
    ["Besoins multiples", stats.multiNeeds],
    ["Newsletters", stats.newsletters],
  ];
  let kx = 40, ky = doc.y;
  const kw = (bw - 2 * 10) / 3;
  kpis.forEach((k, i) => {
    const col = i % 3, rowi = Math.floor(i / 3);
    const x = 40 + col * (kw + 10), y = ky + rowi * 54;
    doc.save();
    doc.roundedRect(x, y, kw, 46, 8).fill("#E8ECF9");
    doc.fillColor(BLEU).font("Helvetica-Bold").fontSize(17).text(String(k[1]), x + 12, y + 8);
    doc.fillColor(GRIS).font("Helvetica").fontSize(8).text(k[0], x + 12, y + 30, { width: kw - 20 });
    doc.restore();
  });
  doc.y = ky + Math.ceil(kpis.length / 3) * 54 + 8;

  // Classements
  const listBlock = (title, arr) => {
    doc.font("Helvetica-Bold").fontSize(11).fillColor(BLEU).text(title, 40, doc.y + 4);
    doc.moveDown(0.2);
    (arr || []).slice(0, 10).forEach((r) => {
      doc.font("Helvetica").fontSize(9.5).fillColor(NOIR)
        .text(r.label, 50, doc.y, { continued: true, width: bw - 40 })
        .font("Helvetica-Bold").fillColor(BLEU).text("  " + r.n, { align: "left" });
    });
    doc.moveDown(0.5);
  };
  listBlock("Classement des thématiques", stats.themesAll);
  listBlock("Répartition par service", stats.orientations);

  // Tableau
  doc.addPage();
  header(doc, "Détail des diagnostics", null);
  doc.y = 92;
  const cols = [
    { k: "date", t: "Date", w: 70 },
    { k: "asso", t: "Association", w: 110 },
    { k: "theme", t: "Thématique", w: 95 },
    { k: "svc", t: "Service", w: 90 },
    { k: "ech", t: "Échéance", w: 70 },
    { k: "ct", t: "Contact", w: 45 },
  ];
  function drawHead() {
    const hy = doc.y;
    let x = 40;
    doc.save();
    doc.rect(40, hy, bw, 18).fill(BLEU);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8);
    cols.forEach((c) => { doc.text(c.t, x + 4, hy + 5, { width: c.w - 6, lineBreak: false }); x += c.w; });
    doc.restore();
    doc.y = hy + 18;
  }
  drawHead();
  let alt = false;
  rows.forEach((row) => {
    if (doc.y > doc.page.height - 70) { doc.addPage(); header(doc, "Détail des diagnostics (suite)", null); doc.y = 92; drawHead(); alt = false; }
    const rh = 16;
    const ry = doc.y;
    if (alt) { doc.save(); doc.rect(40, ry, bw, rh).fill("#f4f6fb"); doc.restore(); }
    alt = !alt;
    const vals = {
      date: new Date(row.created_at).toLocaleDateString("fr-BE"),
      asso: row.association || "Anonyme",
      theme: M.theme[row.thematique_principale] || "",
      svc: M.svc[row.orientation] || "",
      ech: M.q(C.Q5, row.echeance),
      ct: row.email ? "Oui" : "—",
    };
    let x = 40;
    doc.font("Helvetica").fontSize(7.5).fillColor(NOIR);
    cols.forEach((c) => { doc.text(String(vals[c.k]), x + 4, ry + 4, { width: c.w - 6, lineBreak: false, ellipsis: true }); x += c.w; });
    doc.y = ry + rh;
  });

  footer(doc, C.EVENT_NAME);
  doc.end();
}

module.exports = { streamEntryPdf, streamAllPdf };
