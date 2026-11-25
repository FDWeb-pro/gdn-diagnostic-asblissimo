/**
 * Diagnostic numérique express - Le Guichet du Numérique
 * Serveur Express + SQLite.
 */
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const Database = require("better-sqlite3");
const C = require("./content");

const app = express();
const PORT = process.env.PORT || 8300;
const ADMIN_USER = process.env.ADMIN_USER || "gdn";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme";
const DB_DIR = process.env.DB_DIR || path.join(__dirname, "db");

// --- Base de données ---
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const db = new Database(path.join(DB_DIR, "diagnostic.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS diagnostics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  event_code TEXT,
  situation TEXT,
  thematique_principale TEXT,
  thematique_secondaire TEXT,
  aide TEXT,
  orientation TEXT,
  public TEXT,
  echeance TEXT,
  user_agent TEXT
);
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  diagnostic_id INTEGER,
  created_at TEXT NOT NULL,
  prenom TEXT,
  nom TEXT,
  association TEXT,
  fonction TEXT,
  email TEXT,
  telephone TEXT,
  precisions TEXT,
  wants_contact INTEGER DEFAULT 0,
  wants_formations INTEGER DEFAULT 0,
  wants_newsletter INTEGER DEFAULT 0,
  no_contact INTEGER DEFAULT 0,
  FOREIGN KEY (diagnostic_id) REFERENCES diagnostics(id)
);
`);

app.use(express.json({ limit: "64kb" }));
app.use(express.static(path.join(__dirname, "public")));

// --- Helpers de libellés (pour stats / CSV) ---
const THEME_LABEL = {};
C.THEMES.concat([C.THEME_UNKNOWN]).forEach((t) => (THEME_LABEL[t.value] = t.label));
const ORIENTATION_LABEL = {};
Object.keys(C.SERVICES).forEach((k) => (ORIENTATION_LABEL[k] = C.SERVICES[k].label));
const Q_LABEL = (q, v) => {
  const o = q.options.find((x) => x.value === v);
  return o ? o.label : v;
};

// --- Contenu pour le client ---
app.get("/api/content", (req, res) => res.json(C.CLIENT_CONTENT));

// --- Enregistrement d'un diagnostic (stats anonymes) ---
app.post("/api/submit", (req, res) => {
  const a = req.body || {};
  const errors = C.validateAnswers(a);
  if (errors.length) return res.status(400).json({ error: "champs invalides", fields: errors });

  const orientation = C.orientationFromAide(a.aide);
  const stmt = db.prepare(`
    INSERT INTO diagnostics
      (created_at, event_code, situation, thematique_principale, thematique_secondaire, aide, orientation, public, echeance, user_agent)
    VALUES (@created_at, @event_code, @situation, @thematique_principale, @thematique_secondaire, @aide, @orientation, @public, @echeance, @user_agent)
  `);
  const info = stmt.run({
    created_at: new Date().toISOString(),
    event_code: (a.event_code || C.EVENT_CODE).slice(0, 60),
    situation: a.situation,
    thematique_principale: a.thematique_principale,
    thematique_secondaire: a.thematique_secondaire || null,
    aide: a.aide,
    orientation,
    public: a.public,
    echeance: a.echeance,
    user_agent: (req.headers["user-agent"] || "").slice(0, 300),
  });

  const result = C.computeResult(a);
  res.json({ id: info.lastInsertRowid, result });
});

// --- Enregistrement des coordonnées (lead facultatif) ---
app.post("/api/contact", (req, res) => {
  const b = req.body || {};
  const diagId = Number(b.diagnostic_id) || null;
  const requests = Array.isArray(b.requests) ? b.requests : [];
  const noContact = requests.includes("no-contact");

  // Validation : si une demande de contact est active, les champs clés sont requis
  const wantsContact = requests.includes("contact");
  const wantsFormations = requests.includes("formations");
  const wantsNewsletter = requests.includes("newsletter");
  const activeRequest = wantsContact || wantsFormations || wantsNewsletter;

  if (activeRequest && !noContact) {
    const required = ["prenom", "nom", "association", "email"];
    const missing = required.filter((f) => !b[f] || !String(b[f]).trim());
    if (missing.length) return res.status(400).json({ error: "champs requis manquants", fields: missing });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(b.email).trim()))
      return res.status(400).json({ error: "email invalide", fields: ["email"] });
  }

  const stmt = db.prepare(`
    INSERT INTO contacts
      (diagnostic_id, created_at, prenom, nom, association, fonction, email, telephone, precisions,
       wants_contact, wants_formations, wants_newsletter, no_contact)
    VALUES (@diagnostic_id, @created_at, @prenom, @nom, @association, @fonction, @email, @telephone, @precisions,
       @wants_contact, @wants_formations, @wants_newsletter, @no_contact)
  `);
  const clean = (v) => (v == null ? null : String(v).slice(0, 2000));
  stmt.run({
    diagnostic_id: diagId,
    created_at: new Date().toISOString(),
    prenom: clean(b.prenom),
    nom: clean(b.nom),
    association: clean(b.association),
    fonction: clean(b.fonction),
    email: clean(b.email),
    telephone: clean(b.telephone),
    precisions: clean(b.precisions),
    wants_contact: wantsContact ? 1 : 0,
    wants_formations: wantsFormations ? 1 : 0,
    wants_newsletter: wantsNewsletter ? 1 : 0,
    no_contact: noContact ? 1 : 0,
  });
  res.json({ ok: true });
});

// --- Authentification admin (cookie de session OU Basic Auth pour l'API) ---
const AUTH_TOKEN = crypto
  .createHash("sha256")
  .update("gdn-diag-v1|" + ADMIN_USER + "|" + ADMIN_PASSWORD)
  .digest("hex");

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || "").split(";").forEach((c) => {
    const i = c.indexOf("=");
    if (i > -1) out[c.slice(0, i).trim()] = c.slice(i + 1).trim();
  });
  return out;
}

function checkBasic(req) {
  const hdr = req.headers.authorization || "";
  if (!hdr.startsWith("Basic ")) return false;
  const [user, pass] = Buffer.from(hdr.slice(6), "base64").toString().split(":");
  return user === ADMIN_USER && pass === ADMIN_PASSWORD;
}

function isAuthed(req) {
  return parseCookies(req).gdn_admin === AUTH_TOKEN || checkBasic(req);
}

function requireAuth(req, res, next) {
  if (isAuthed(req)) return next();
  res.set("WWW-Authenticate", 'Basic realm="Diagnostic GdN - Admin"');
  res.status(401).json({ error: "authentification requise" });
}

const LOGIN_PAGE = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex" />
<title>Connexion - Diagnostic GdN</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Inter:wght@400;500&display=swap" rel="stylesheet" />
<style>
:root{--bleu:#204EC1;--bleu-fonce:#183a92;--bleu-10:#E8ECF9;--orange:#C6502B;--orange-10:#FFF5F0;--noir:#111418;--gris:#5b6472;--fond:#f4f6fb;}
*{box-sizing:border-box;}body{margin:0;min-height:100dvh;display:grid;place-items:center;font-family:"Inter",system-ui,sans-serif;background:var(--fond);color:var(--noir);padding:20px;}
.box{background:#fff;border:1px solid #e6e9ef;border-radius:16px;box-shadow:0 10px 30px rgba(32,78,193,.10);padding:28px;width:100%;max-width:380px;}
h1{font-family:"Poppins",sans-serif;font-size:1.2rem;color:var(--bleu);margin:0 0 4px;}
p.sub{color:var(--gris);font-size:.88rem;margin:0 0 20px;}
label{display:block;font-family:"Poppins",sans-serif;font-weight:600;font-size:.85rem;margin-bottom:6px;}
input{width:100%;padding:13px 14px;border:2px solid #e6e9ef;border-radius:11px;font-size:1rem;font-family:inherit;margin-bottom:14px;}
input:focus{outline:none;border-color:var(--bleu);}
button{width:100%;background:var(--bleu);color:#fff;border:none;border-radius:12px;padding:14px;font-family:"Poppins",sans-serif;font-weight:600;font-size:1rem;cursor:pointer;}
button:hover{background:var(--bleu-fonce);}
.err{display:none;background:var(--orange-10);border:1px solid var(--orange);color:var(--orange);border-radius:10px;padding:10px 12px;font-size:.85rem;margin-bottom:14px;}
.err.show{display:block;}
</style></head>
<body><form class="box" id="f" autocomplete="on">
<h1>Tableau de bord</h1>
<p class="sub">Diagnostic numerique - Le Guichet du Numerique</p>
<div class="err" id="e">Identifiants invalides.</div>
<label for="u">Identifiant</label>
<input id="u" name="username" value="gdn" autocomplete="username" />
<label for="p">Mot de passe</label>
<input id="p" name="password" type="password" autocomplete="current-password" autofocus />
<button type="submit">Se connecter</button>
</form>
<script>
document.getElementById("f").addEventListener("submit",function(ev){
  ev.preventDefault();
  fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({user:document.getElementById("u").value,password:document.getElementById("p").value})})
  .then(function(r){if(r.ok){location.href="/admin";}else{document.getElementById("e").classList.add("show");}})
  .catch(function(){document.getElementById("e").classList.add("show");});
});
</script></body></html>`;

app.post("/api/login", (req, res) => {
  const user = (req.body && req.body.user) || ADMIN_USER;
  const pass = (req.body && req.body.password) || "";
  if (user === ADMIN_USER && pass === ADMIN_PASSWORD) {
    res.setHeader(
      "Set-Cookie",
      `gdn_admin=${AUTH_TOKEN}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`
    );
    return res.json({ ok: true });
  }
  res.status(401).json({ error: "identifiants invalides" });
});

app.get("/admin/logout", (req, res) => {
  res.setHeader("Set-Cookie", "gdn_admin=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0");
  res.redirect("/admin");
});

app.get("/admin", (req, res) => {
  if (isAuthed(req)) return res.sendFile(path.join(__dirname, "public", "admin.html"));
  res.status(200).type("html").send(LOGIN_PAGE);
});

// --- Statistiques agrégées ---
app.get("/api/stats", requireAuth, (req, res) => {
  const total = db.prepare("SELECT COUNT(*) n FROM diagnostics").get().n;
  const leads = db.prepare("SELECT COUNT(*) n FROM contacts WHERE no_contact = 0 AND (wants_contact=1 OR wants_formations=1 OR wants_newsletter=1)").get().n;
  const newsletters = db.prepare("SELECT COUNT(*) n FROM contacts WHERE wants_newsletter = 1").get().n;
  const withContactRequest = db.prepare("SELECT COUNT(*) n FROM contacts WHERE wants_contact = 1").get().n;

  const groupCount = (col, labelMap, q) => {
    const rows = db.prepare(`SELECT ${col} v, COUNT(*) n FROM diagnostics WHERE ${col} IS NOT NULL GROUP BY ${col} ORDER BY n DESC`).all();
    return rows.map((r) => ({ value: r.v, label: labelMap ? (labelMap[r.v] || (q ? Q_LABEL(q, r.v) : r.v)) : r.v, n: r.n }));
  };

  // Thématiques : principal + secondaire combinés pour le classement
  const themeRows = db.prepare(`
    SELECT v, COUNT(*) n FROM (
      SELECT thematique_principale v FROM diagnostics WHERE thematique_principale IS NOT NULL
      UNION ALL
      SELECT thematique_secondaire v FROM diagnostics WHERE thematique_secondaire IS NOT NULL
    ) GROUP BY v ORDER BY n DESC
  `).all();

  const multiNeeds = db.prepare("SELECT COUNT(*) n FROM diagnostics WHERE thematique_secondaire IS NOT NULL").get().n;
  const shortTerm = db.prepare("SELECT COUNT(*) n FROM diagnostics WHERE echeance IN ('asap','3mois')").get().n;

  res.json({
    total,
    leads,
    newsletters,
    withContactRequest,
    conversion: total ? Math.round((leads / total) * 1000) / 10 : 0,
    multiNeeds,
    shortTerm,
    themesPrincipal: groupCount("thematique_principale", THEME_LABEL),
    themesAll: themeRows.map((r) => ({ value: r.v, label: THEME_LABEL[r.v] || r.v, n: r.n })),
    orientations: groupCount("orientation", ORIENTATION_LABEL),
    situations: groupCount("situation", null, C.Q1),
    publics: groupCount("public", null, C.Q4),
    echeances: groupCount("echeance", null, C.Q5),
    // Croisement thématique x orientation
    themeByService: db.prepare(`
      SELECT orientation, thematique_principale, COUNT(*) n
      FROM diagnostics WHERE orientation IS NOT NULL AND thematique_principale IS NOT NULL
      GROUP BY orientation, thematique_principale ORDER BY n DESC
    `).all().map((r) => ({
      orientation: ORIENTATION_LABEL[r.orientation] || r.orientation,
      theme: THEME_LABEL[r.thematique_principale] || r.thematique_principale,
      n: r.n,
    })),
  });
});

// --- Export CSV ---
function csvField(v) {
  if (v == null) return "";
  const s = String(v).replace(/"/g, '""');
  return /[";\n]/.test(s) ? `"${s}"` : s;
}

app.get("/api/export.csv", requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT d.id, d.created_at, d.event_code, d.situation, d.thematique_principale, d.thematique_secondaire,
           d.aide, d.orientation, d.public, d.echeance,
           c.prenom, c.nom, c.association, c.fonction, c.email, c.telephone, c.precisions,
           c.wants_contact, c.wants_formations, c.wants_newsletter, c.no_contact
    FROM diagnostics d LEFT JOIN contacts c ON c.diagnostic_id = d.id
    ORDER BY d.id DESC
  `).all();
  const headers = [
    "id", "date", "evenement", "situation", "thematique_principale", "thematique_secondaire",
    "type_aide", "service_recommande", "public", "echeance",
    "prenom", "nom", "association", "fonction", "email", "telephone", "precisions",
    "demande_contact", "interet_formations", "newsletter", "pas_de_contact",
  ];
  const lines = [headers.join(";")];
  for (const r of rows) {
    lines.push([
      r.id, r.created_at, r.event_code,
      Q_LABEL(C.Q1, r.situation),
      THEME_LABEL[r.thematique_principale] || "",
      THEME_LABEL[r.thematique_secondaire] || "",
      Q_LABEL(C.Q3, r.aide),
      ORIENTATION_LABEL[r.orientation] || "",
      Q_LABEL(C.Q4, r.public),
      Q_LABEL(C.Q5, r.echeance),
      r.prenom, r.nom, r.association, r.fonction, r.email, r.telephone, r.precisions,
      r.wants_contact ? "oui" : "", r.wants_formations ? "oui" : "",
      r.wants_newsletter ? "oui" : "", r.no_contact ? "oui" : "",
    ].map(csvField).join(";"));
  }
  res.set("Content-Type", "text/csv; charset=utf-8");
  res.set("Content-Disposition", `attachment; filename="diagnostics-gdn-${new Date().toISOString().slice(0,10)}.csv"`);
  res.send("﻿" + lines.join("\n"));
});

app.get("/healthz", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Diagnostic GdN sur le port ${PORT}`));
