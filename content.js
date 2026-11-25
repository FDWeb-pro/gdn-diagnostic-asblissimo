/**
 * Diagnostic numérique express - Le Guichet du Numérique
 * Contenu, questions et moteur de recommandation.
 *
 * Ce module est utilisé côté serveur (validation, libellés, calcul) et
 * exposé au client via /api/content pour l'affichage du formulaire.
 *
 * Tout le contenu éditable est ici : Frédéric peut ajuster les textes
 * sans toucher à la logique.
 */

const EVENT_NAME = "Salon ASBLissimo 2026";
const EVENT_CODE = "asblissimo-2026";

// --- Politique de confidentialité (à confirmer) ---
const PRIVACY_URL = "https://www.guichetdunumerique.be/politique-de-confidentialite";

// --- Écran d'accueil ---
const INTRO = {
  title: "Quels sont les besoins numériques de votre association ?",
  subtitle:
    "En quelques questions, identifiez vos priorités numériques et découvrez quel type d'accompagnement pourrait répondre aux besoins de votre organisation.",
  bullets: [
    "Durée : 3 minutes",
    "Gratuit et sans engagement",
    "Résultat personnalisé immédiat",
    "Coordonnées facultatives",
  ],
  cta: "Commencer le diagnostic",
};

// --- Q1 : Situation actuelle ---
const Q1 = {
  id: "situation",
  title: "Quelle est votre situation actuelle ?",
  help: "Quelle situation correspond le mieux à celle de votre association ?",
  type: "single",
  required: true,
  options: [
    { value: "decouvrir", label: "Nous souhaitons découvrir de nouveaux usages numériques." },
    { value: "mieux-exploiter", label: "Nous utilisons déjà des outils numériques, mais nous pourrions mieux les exploiter." },
    { value: "difficultes", label: "Nous rencontrons des difficultés dans notre organisation quotidienne." },
    { value: "projet-flou", label: "Nous avons un projet numérique, mais nous ne savons pas par où commencer." },
    { value: "securiser", label: "Nous souhaitons sécuriser nos outils et nos pratiques." },
    { value: "faire-evoluer", label: "Nous avons besoin de faire évoluer nos outils existants." },
    { value: "indetermine", label: "Nous ne savons pas encore précisément quels sont nos besoins." },
  ],
};

// --- Q2 : Thématiques (9 domaines du site GdN) ---
const THEMES = [
  {
    value: "ia",
    label: "Intelligence artificielle",
    examples: "Découvrir l'IA, gagner du temps, encadrer son utilisation dans l'association.",
    enjeu: "l'intégration de l'intelligence artificielle",
    formation: "mieux comprendre ce que l'intelligence artificielle peut apporter, gagner du temps au quotidien et encadrer son utilisation de façon responsable",
    conseil: "y voir clair sur les usages de l'intelligence artificielle réellement pertinents pour ses activités, et à choisir par où commencer sans se disperser",
    accompagnement: "mettre en place des usages concrets de l'intelligence artificielle et les ancrer durablement dans ses pratiques",
  },
  {
    value: "automatisation",
    label: "Automatisation",
    examples: "Réduire les tâches répétitives, automatiser les encodages, les rappels ou les suivis administratifs.",
    enjeu: "l'automatisation de vos tâches répétitives",
    formation: "identifier les tâches répétitives qui peuvent être automatisées et prendre en main des outils qui allègent les encodages, les rappels et les suivis administratifs",
    conseil: "repérer les processus à automatiser en priorité et à évaluer les outils les plus adaptés à sa taille et à ses moyens",
    accompagnement: "mettre en place les automatisations identifiées et fiabiliser ses encodages, ses rappels et ses suivis administratifs",
  },
  {
    value: "securite",
    label: "Protection et sécurité",
    examples: "Protéger les données, sécuriser les accès, prévenir les fraudes et les cyberattaques.",
    enjeu: "la protection et la sécurité de vos données",
    formation: "mieux identifier les risques numériques, protéger les informations manipulées et adopter des pratiques communes en matière de cybersécurité",
    conseil: "faire le point sur son niveau de protection, repérer les failles les plus courantes et définir les mesures prioritaires à mettre en place",
    accompagnement: "déployer les mesures de protection, sécuriser les accès et ancrer de bonnes pratiques dans la durée",
  },
  {
    value: "data",
    label: "Data et bases de données",
    examples: "Organiser les données des membres et bénéficiaires, créer des tableaux de bord et des statistiques.",
    enjeu: "l'organisation de vos données",
    formation: "structurer les données des membres et des bénéficiaires, et exploiter des tableaux de bord utiles au pilotage de l'association",
    conseil: "clarifier la façon dont elle collecte et organise ses données, et à choisir une structure fiable pour ses membres et ses bénéficiaires",
    accompagnement: "mettre en place une base de données et des tableaux de bord réellement exploitables au quotidien",
  },
  {
    value: "marketing",
    label: "Marketing digital et création de contenu",
    examples: "Améliorer la communication, les réseaux sociaux, la visibilité et les supports graphiques.",
    enjeu: "votre communication et votre visibilité",
    formation: "renforcer la communication de l'association, gagner en visibilité sur les réseaux sociaux et produire des supports clairs et attractifs",
    conseil: "clarifier son positionnement et sa ligne de communication, et à choisir les canaux les plus utiles à sa visibilité",
    accompagnement: "produire ses supports, structurer sa présence en ligne et outiller sa communication dans la durée",
  },
  {
    value: "nocode",
    label: "No-code et développement",
    examples: "Créer un site Internet, une application, un formulaire ou un outil de gestion personnalisé.",
    enjeu: "la création de votre site ou de votre outil sur mesure",
    formation: "concevoir sans programmer un site, un formulaire ou un petit outil de gestion adapté au fonctionnement de l'association",
    conseil: "choisir la bonne approche et les bons outils pour construire son site ou son outil de gestion sans se tromper de solution",
    accompagnement: "construire concrètement son site, son application ou son outil de gestion et en acquérir la maîtrise",
  },
  {
    value: "droit",
    label: "Droit du numérique et gouvernance",
    examples: "Respecter le RGPD, l'AI Act, les obligations d'accessibilité et définir des règles internes.",
    enjeu: "votre conformité et votre gouvernance numérique",
    formation: "clarifier les obligations liées au RGPD, à l'AI Act et à l'accessibilité, et poser des règles internes simples et applicables",
    conseil: "faire le point sur ses obligations réglementaires et à définir une gouvernance numérique claire et réaliste",
    accompagnement: "mettre ses pratiques en conformité et déployer les règles internes nécessaires",
  },
  {
    value: "productivite",
    label: "Outils de productivité et de collaboration",
    examples: "Améliorer la gestion des documents, des e-mails, des réunions et le travail en équipe.",
    enjeu: "l'organisation de votre travail en équipe",
    formation: "mieux organiser les documents, les courriels, les réunions et le travail en équipe au sein de l'association",
    conseil: "repérer les irritants du quotidien et à choisir les outils de collaboration qui simplifieront réellement le travail d'équipe",
    accompagnement: "déployer et paramétrer ses outils collaboratifs et faire adopter de nouvelles habitudes de travail",
  },
  {
    value: "strategie",
    label: "Stratégie digitale",
    examples: "Définir les priorités numériques, choisir les investissements et organiser les projets.",
    enjeu: "votre stratégie numérique",
    formation: "prendre du recul sur les priorités numériques et poser des bases claires pour les prochains projets",
    conseil: "définir ses priorités numériques, arbitrer ses investissements et organiser ses projets dans le temps",
    accompagnement: "traduire sa feuille de route numérique en actions concrètes et en assurer la mise en œuvre",
  },
];

const THEME_UNKNOWN = {
  value: "ne-sais-pas",
  label: "Je ne sais pas encore identifier mes besoins",
  examples: "",
  enjeu: "vos besoins numériques",
  formation: "identifier les compétences numériques les plus utiles à l'association et développer les bons réflexes",
  conseil: "faire le point sur ses besoins numériques et à dégager des priorités claires",
  accompagnement: "avancer concrètement sur ses premiers chantiers numériques",
};

const Q2 = {
  id: "thematique",
  title: "Quels sont vos besoins numériques prioritaires ?",
  help: "Choisissez votre besoin principal. Vous pouvez aussi indiquer un besoin secondaire (facultatif).",
  type: "theme",
  required: true,
  themes: THEMES,
  unknown: THEME_UNKNOWN,
};

// --- Q3 : Type d'aide -> orientation (mapping interne, non affiché) ---
const Q3 = {
  id: "aide",
  title: "De quelle aide auriez-vous principalement besoin ?",
  help: "Choisissez la proposition la plus proche de votre situation.",
  type: "single",
  required: true,
  options: [
    { value: "decouvrir-sujet", label: "Découvrir un sujet ou acquérir de nouvelles compétences.", orientation: "formation" },
    { value: "ameliorer-equipe", label: "Améliorer les compétences numériques de notre équipe.", orientation: "formation" },
    { value: "faire-point", label: "Faire le point sur nos pratiques et identifier les améliorations possibles.", orientation: "conseil" },
    { value: "choisir-outils", label: "Être aidés pour choisir les bons outils ou prendre une décision.", orientation: "conseil" },
    { value: "realiser-projet", label: "Être accompagnés dans la réalisation d'un projet numérique.", orientation: "accompagnement" },
    { value: "installer-configurer", label: "Être aidés pour installer, configurer ou intégrer de nouveaux outils.", orientation: "accompagnement" },
    { value: "reflexion-mise-en-place", label: "Être accompagnés depuis la réflexion jusqu'à la mise en place.", orientation: "conseil_accompagnement" },
    { value: "competences-et-outils", label: "Développer nos compétences tout en mettant en place de nouveaux outils.", orientation: "formation_accompagnement" },
    { value: "ne-sais-pas", label: "Nous ne savons pas encore de quel type d'aide nous avons besoin.", orientation: "indetermine" },
  ],
};

// --- Q4 : Public concerné ---
const Q4 = {
  id: "public",
  title: "Qui serait concerné par cette démarche ?",
  help: "",
  type: "single",
  required: true,
  options: [
    { value: "moi", label: "Moi uniquement.", frame: "vous" },
    { value: "quelques", label: "Quelques collaborateurs ou bénévoles.", frame: "vos collaborateurs et bénévoles" },
    { value: "equipe", label: "Une équipe ou un service.", frame: "votre équipe" },
    { value: "direction", label: "La direction ou le conseil d'administration.", frame: "votre direction" },
    { value: "toute", label: "L'ensemble de notre association.", frame: "l'ensemble de votre association" },
    { value: "non-defini", label: "Nous ne l'avons pas encore défini.", frame: "les personnes concernées" },
  ],
};

// --- Q5 : Échéance ---
const Q5 = {
  id: "echeance",
  title: "Dans quel délai souhaiteriez-vous avancer ?",
  help: "",
  type: "single",
  required: true,
  options: [
    { value: "asap", label: "Dès que possible.", priority: 1 },
    { value: "3mois", label: "Dans les trois prochains mois.", priority: 2 },
    { value: "3-6mois", label: "Dans les trois à six prochains mois.", priority: 3 },
    { value: "6-12mois", label: "Dans les six à douze prochains mois.", priority: 4 },
    { value: "reflexion", label: "Nous sommes actuellement en phase de réflexion.", priority: 5 },
    { value: "non-defini", label: "Nous n'avons pas encore défini d'échéance.", priority: 6 },
  ],
};

const QUESTIONS = [Q1, Q2, Q3, Q4, Q5];

// --- Services (orientation -> libellé + accroche + descriptif) ---
const SERVICES = {
  formation: {
    label: "Formation",
    accroche: "Développer les compétences de votre équipe",
    resume: "Développer les compétences numériques des personnes concernées afin qu'elles puissent utiliser les outils de manière autonome dans leurs activités.",
  },
  conseil: {
    label: "Conseil",
    accroche: "Faire le point et choisir les bonnes options",
    resume: "Faire le point sur les besoins de l'association, analyser les possibilités et identifier les choix les plus adaptés à son fonctionnement et à ses ressources.",
  },
  accompagnement: {
    label: "Accompagnement",
    accroche: "Mettre en place vos outils, concrètement",
    resume: "Bénéficier d'un soutien concret pour mettre en place les outils, adapter les pratiques et accompagner les personnes concernées.",
  },
  conseil_accompagnement: {
    label: "Conseil et accompagnement",
    accroche: "De la réflexion jusqu'à la mise en place",
    resume: "Définir les besoins et les priorités avant de passer à la réalisation du projet.",
  },
  formation_accompagnement: {
    label: "Formation et accompagnement",
    accroche: "Monter en compétences en mettant en place vos outils",
    resume: "Mettre en place de nouveaux outils tout en développant les compétences nécessaires à leur utilisation.",
  },
  indetermine: {
    label: "Premier échange",
    accroche: "Clarifions ensemble vos besoins",
    resume: "Organiser un premier échange pour identifier les difficultés, les besoins et les priorités de l'association.",
  },
};

// --- Bloc de prise de contact ---
const CONTACT = {
  intro_title: "Et si nous parlions des besoins numériques de votre association ?",
  intro_text:
    "Ce diagnostic constitue un premier aperçu de vos besoins. Le Guichet du Numérique vous propose un échange gratuit de 30 minutes pour approfondir vos priorités, répondre à vos questions et identifier les prochaines étapes.",
  fields: [
    { id: "prenom", label: "Prénom", type: "text", requiredIfContact: true },
    { id: "nom", label: "Nom", type: "text", requiredIfContact: true },
    { id: "association", label: "Nom de l'association", type: "text", requiredIfContact: true },
    { id: "fonction", label: "Fonction au sein de l'association", type: "text", requiredIfContact: false },
    { id: "email", label: "Adresse e-mail professionnelle", type: "email", requiredIfContact: true },
    { id: "telephone", label: "Numéro de téléphone", type: "tel", requiredIfContact: false },
    { id: "precisions", label: "Précisions sur votre besoin ou votre projet", type: "textarea", requiredIfContact: false },
  ],
  requests: [
    { value: "contact", label: "Je souhaite être recontacté pour discuter de mes besoins numériques.", exclusive: false },
    { value: "formations", label: "Je souhaite recevoir des informations sur les formations du Guichet du Numérique correspondant à mes besoins.", exclusive: false },
    { value: "newsletter", label: "Je souhaite recevoir la newsletter du Guichet du Numérique.", exclusive: false },
    { value: "no-contact", label: "Je ne souhaite pas être recontacté.", exclusive: true },
  ],
  privacy_url: PRIVACY_URL,
  privacy_note:
    "Les coordonnées communiquées seront utilisées par le Guichet du Numérique pour répondre aux demandes formulées dans ce questionnaire. Elles ne seront utilisées pour l'envoi de la newsletter que si vous avez choisi de vous y inscrire.",
  cta: "Envoyer ma demande",
  skip: "Terminer sans transmettre mes coordonnées",
};

// =====================================================================
//  MOTEUR DE RECOMMANDATION
// =====================================================================

function findTheme(value) {
  if (!value) return null;
  if (value === THEME_UNKNOWN.value) return THEME_UNKNOWN;
  return THEMES.find((t) => t.value === value) || null;
}

function orientationFromAide(aideValue) {
  const opt = Q3.options.find((o) => o.value === aideValue);
  return opt ? opt.orientation : "indetermine";
}

function publicFrame(publicValue) {
  const opt = Q4.options.find((o) => o.value === publicValue);
  return opt ? opt.frame : "les personnes concernées";
}

/**
 * Construit le paragraphe de recommandation adapté à la combinaison
 * thématique prioritaire x service recommandé.
 */
function buildExplanation(orientation, theme, pubFrame) {
  const t = theme || THEME_UNKNOWN;
  switch (orientation) {
    case "formation":
      return `Une formation adaptée à votre association permettrait à ${pubFrame} de ${t.formation}.`;
    case "conseil":
      return `Un temps de conseil aiderait votre association à ${t.conseil}.`;
    case "accompagnement":
      return `Un accompagnement sur le terrain donnerait à votre association un appui concret pour ${t.accompagnement}.`;
    case "conseil_accompagnement":
      return `Sur le sujet de ${t.enjeu}, la démarche la plus adaptée consisterait à définir d'abord les besoins et les priorités, puis à être accompagnés concrètement jusqu'à la mise en place. On commence par poser le cadre, puis on réalise.`;
    case "formation_accompagnement":
      return `Sur le sujet de ${t.enjeu}, il serait pertinent de mettre en place de nouveaux outils tout en développant les compétences nécessaires à leur utilisation, pour que l'autonomie suive la mise en œuvre.`;
    case "indetermine":
    default:
      if (t && t.value !== THEME_UNKNOWN.value) {
        return `Un premier échange permettrait d'identifier ensemble vos difficultés, vos besoins et vos priorités autour de ${t.enjeu}, avant de définir la forme d'aide la plus adaptée.`;
      }
      return `Un premier échange permettrait d'identifier ensemble vos difficultés, vos besoins et vos priorités, avant de définir la forme d'aide la plus adaptée à votre association.`;
  }
}

/**
 * Calcule le résultat complet à partir des réponses.
 * answers = { situation, thematique_principale, thematique_secondaire, aide, public, echeance }
 */
function computeResult(answers) {
  const orientation = orientationFromAide(answers.aide);
  const service = SERVICES[orientation] || SERVICES.indetermine;
  const themePrincipal = findTheme(answers.thematique_principale);
  const themeSecondaire = findTheme(answers.thematique_secondaire);
  const pubFrame = publicFrame(answers.public);

  const explanation = buildExplanation(orientation, themePrincipal, pubFrame);

  const publicOpt = Q4.options.find((o) => o.value === answers.public);
  const echeanceOpt = Q5.options.find((o) => o.value === answers.echeance);

  let secondaireNote = null;
  if (
    themeSecondaire &&
    themeSecondaire.value !== THEME_UNKNOWN.value &&
    (!themePrincipal || themeSecondaire.value !== themePrincipal.value)
  ) {
    secondaireNote = `Votre besoin complémentaire en ${themeSecondaire.label.toLowerCase()} pourra également être pris en compte lors de l'échange.`;
  }

  return {
    orientation,
    service: { key: orientation, label: service.label, accroche: service.accroche, resume: service.resume },
    themePrincipal:
      themePrincipal && themePrincipal.value !== THEME_UNKNOWN.value
        ? { value: themePrincipal.value, label: themePrincipal.label }
        : { value: "ne-sais-pas", label: "À préciser ensemble" },
    themeSecondaire:
      themeSecondaire && themeSecondaire.value !== THEME_UNKNOWN.value
        ? { value: themeSecondaire.value, label: themeSecondaire.label }
        : null,
    explanation,
    secondaireNote,
    publicLabel: publicOpt ? publicOpt.label.replace(/\.$/, "") : "",
    echeanceLabel: echeanceOpt ? echeanceOpt.label.replace(/\.$/, "") : "",
    cta_title: "Discutons de vos besoins",
    cta_text:
      "Le Guichet du Numérique vous propose un premier échange gratuit de 30 minutes, sans engagement, pour approfondir votre diagnostic.",
  };
}

// --- Validation des réponses (côté serveur) ---
function validateAnswers(a) {
  const errors = [];
  const inSet = (val, opts) => opts.some((o) => o.value === val);
  if (!a || typeof a !== "object") return ["payload invalide"];
  if (!inSet(a.situation, Q1.options)) errors.push("situation");
  const allThemes = THEMES.concat([THEME_UNKNOWN]);
  if (!inSet(a.thematique_principale, allThemes)) errors.push("thematique_principale");
  if (a.thematique_secondaire && !inSet(a.thematique_secondaire, allThemes))
    errors.push("thematique_secondaire");
  if (!inSet(a.aide, Q3.options)) errors.push("aide");
  if (!inSet(a.public, Q4.options)) errors.push("public");
  if (!inSet(a.echeance, Q5.options)) errors.push("echeance");
  return errors;
}

// Payload public (envoyé au client pour l'affichage)
const CLIENT_CONTENT = {
  event: EVENT_NAME,
  intro: INTRO,
  questions: QUESTIONS,
  contact: CONTACT,
  slogan: "Remettre l'humain au cœur du numérique.",
};

module.exports = {
  EVENT_NAME,
  EVENT_CODE,
  PRIVACY_URL,
  INTRO,
  QUESTIONS,
  Q1,
  Q2,
  Q3,
  Q4,
  Q5,
  THEMES,
  THEME_UNKNOWN,
  SERVICES,
  CONTACT,
  CLIENT_CONTENT,
  computeResult,
  validateAnswers,
  orientationFromAide,
};
