/* Diagnostic numérique express - Le Guichet du Numérique (front) */
(function () {
  "use strict";

  var C = null; // contenu
  var answers = {
    situation: null,
    thematique_principale: null,
    thematique_secondaire: null,
    aide: null,
    public: null,
    echeance: null,
  };
  var step = 0; // 0 = intro, 1..5 = questions, puis result/contact/thanks
  var diagnosticId = null;
  var lastResult = null;

  var screenEl = document.getElementById("screen");
  var progressEl = document.getElementById("progress");
  var progressBar = document.getElementById("progress-bar");
  var progressLabel = document.getElementById("progress-label");
  var progressWrap = document.getElementById("progress-bar-wrap");

  // Mapping question index -> clé de réponse
  var QKEYS = ["situation", "thematique", "aide", "public", "echeance"];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function setProgress(n) {
    if (n < 1 || n > 5) {
      progressEl.hidden = true;
      return;
    }
    progressEl.hidden = false;
    var pct = (n / 5) * 100;
    progressBar.style.width = pct + "%";
    progressLabel.textContent = "Étape " + n + " sur 5";
    progressWrap.setAttribute("aria-valuenow", String(n));
  }

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    screenEl.setAttribute("tabindex", "-1");
    screenEl.focus({ preventScroll: true });
  }

  // ---------------- INTRO ----------------
  function renderIntro() {
    setProgress(0);
    var i = C.intro;
    var bullets = i.bullets
      .map(function (b) {
        return '<li><span class="tick" aria-hidden="true">✓</span>' + esc(b) + "</li>";
      })
      .join("");
    screenEl.innerHTML =
      '<div class="card intro">' +
      '<span class="eyebrow">Diagnostic numérique express</span>' +
      "<h1>" + esc(i.title) + "</h1>" +
      '<p class="lead">' + esc(i.subtitle) + "</p>" +
      '<ul class="intro-bullets">' + bullets + "</ul>" +
      '<button class="btn btn-primary full" id="start">' + esc(i.cta) +
      ' <span aria-hidden="true">→</span></button>' +
      "</div>";
    document.getElementById("start").addEventListener("click", function () {
      step = 1;
      render();
    });
    scrollTop();
  }

  // ---------------- QUESTIONS ----------------
  function renderQuestion(index) {
    var q = C.questions[index - 1];
    setProgress(index);
    if (q.type === "theme") return renderThemeQuestion(q, index);
    return renderSingleQuestion(q, index);
  }

  function renderSingleQuestion(q, index) {
    var key = q.id;
    var opts = q.options
      .map(function (o) {
        var sel = answers[key] === o.value ? " selected" : "";
        return (
          '<button type="button" class="option' + sel + '" data-val="' + esc(o.value) + '" role="radio" aria-checked="' +
          (answers[key] === o.value) + '">' +
          '<span class="marker" aria-hidden="true"></span>' +
          '<span class="opt-label">' + esc(o.label) + "</span>" +
          "</button>"
        );
      })
      .join("");
    screenEl.innerHTML =
      '<div class="card">' +
      '<span class="eyebrow">Question ' + index + " / 5</span>" +
      '<h2 class="q-title">' + esc(q.title) + "</h2>" +
      (q.help ? '<p class="q-help">' + esc(q.help) + "</p>" : "") +
      '<div class="options" role="radiogroup" aria-label="' + esc(q.title) + '">' + opts + "</div>" +
      navHTML(index) +
      "</div>";

    Array.prototype.forEach.call(screenEl.querySelectorAll(".option"), function (btn) {
      btn.addEventListener("click", function () {
        answers[key] = btn.getAttribute("data-val");
        Array.prototype.forEach.call(screenEl.querySelectorAll(".option"), function (b) {
          var on = b === btn;
          b.classList.toggle("selected", on);
          b.setAttribute("aria-checked", on);
        });
        enableNext(true);
      });
    });
    bindNav(index, function () {
      return !!answers[key];
    });
    enableNext(!!answers[key]);
    scrollTop();
  }

  function renderThemeQuestion(q, index) {
    var themes = q.themes.concat([q.unknown]);
    var cards = themes
      .map(function (t) {
        var cls = "theme-card";
        var badge = "";
        if (answers.thematique_principale === t.value) {
          cls += " principal";
          badge = '<span class="theme-badge">1 Principal</span>';
        } else if (answers.thematique_secondaire === t.value) {
          cls += " secondaire";
          badge = '<span class="theme-badge">2 Secondaire</span>';
        }
        var ex = t.examples ? '<span class="tc-ex">' + esc(t.examples) + "</span>" : "";
        return (
          '<button type="button" class="' + cls + '" data-val="' + esc(t.value) + '">' +
          badge +
          '<span class="tc-label">' + esc(t.label) + "</span>" +
          ex +
          "</button>"
        );
      })
      .join("");

    screenEl.innerHTML =
      '<div class="card">' +
      '<span class="eyebrow">Question ' + index + " / 5</span>" +
      '<h2 class="q-title">' + esc(q.title) + "</h2>" +
      '<p class="q-help">' + esc(q.help) + "</p>" +
      '<div class="theme-grid">' + cards + "</div>" +
      '<p class="theme-hint" id="theme-hint"></p>' +
      navHTML(index) +
      "</div>";

    function updateHint() {
      var hint = document.getElementById("theme-hint");
      if (!answers.thematique_principale) {
        hint.innerHTML = "Touchez votre <strong>besoin principal</strong>.";
      } else if (!answers.thematique_secondaire) {
        hint.innerHTML =
          "Besoin principal enregistré. Touchez-en un second pour un <strong>besoin complémentaire</strong> (facultatif), ou passez à la suite.";
      } else {
        hint.innerHTML = "Deux besoins sélectionnés. Touchez une carte sélectionnée pour la retirer.";
      }
    }

    Array.prototype.forEach.call(screenEl.querySelectorAll(".theme-card"), function (btn) {
      btn.addEventListener("click", function () {
        var v = btn.getAttribute("data-val");
        var unknown = q.unknown.value;

        // "Je ne sais pas" est exclusif : il ne peut être que principal, seul.
        if (v === unknown) {
          if (answers.thematique_principale === unknown) {
            answers.thematique_principale = null;
          } else {
            answers.thematique_principale = unknown;
            answers.thematique_secondaire = null;
          }
        } else {
          if (answers.thematique_principale === unknown) answers.thematique_principale = null;
          if (answers.thematique_principale === v) {
            // retirer le principal ; promouvoir le secondaire
            answers.thematique_principale = answers.thematique_secondaire || null;
            answers.thematique_secondaire = null;
          } else if (answers.thematique_secondaire === v) {
            answers.thematique_secondaire = null;
          } else if (!answers.thematique_principale) {
            answers.thematique_principale = v;
          } else if (!answers.thematique_secondaire) {
            answers.thematique_secondaire = v;
          } else {
            // les deux pris : on remplace le secondaire
            answers.thematique_secondaire = v;
          }
        }
        renderThemeQuestion(q, index); // re-render pour les badges
      });
    });

    updateHint();
    bindNav(index, function () {
      return !!answers.thematique_principale;
    });
    enableNext(!!answers.thematique_principale);
    scrollTop();
  }

  // ---------------- NAVIGATION ----------------
  function navHTML(index) {
    var backBtn =
      index > 1
        ? '<button type="button" class="btn btn-ghost" id="back"><span aria-hidden="true">←</span> Retour</button>'
        : '<button type="button" class="btn btn-ghost" id="back"><span aria-hidden="true">←</span> Accueil</button>';
    var nextLabel = index === 5 ? "Voir mon résultat" : "Suivant";
    return (
      '<div class="nav">' +
      backBtn +
      '<span class="spacer"></span>' +
      '<button type="button" class="btn btn-primary" id="next" disabled>' + nextLabel +
      ' <span aria-hidden="true">→</span></button>' +
      "</div>"
    );
  }

  function enableNext(ok) {
    var n = document.getElementById("next");
    if (n) n.disabled = !ok;
  }

  function bindNav(index, isValid) {
    var back = document.getElementById("back");
    var next = document.getElementById("next");
    if (back)
      back.addEventListener("click", function () {
        step = index - 1;
        render();
      });
    if (next)
      next.addEventListener("click", function () {
        if (!isValid()) return;
        if (index === 5) {
          submitDiagnostic();
        } else {
          step = index + 1;
          render();
        }
      });
  }

  // ---------------- SUBMIT DIAGNOSTIC ----------------
  function submitDiagnostic() {
    var next = document.getElementById("next");
    if (next) {
      next.disabled = true;
      next.textContent = "Analyse…";
    }
    fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        situation: answers.situation,
        thematique_principale: answers.thematique_principale,
        thematique_secondaire: answers.thematique_secondaire,
        aide: answers.aide,
        public: answers.public,
        echeance: answers.echeance,
      }),
    })
      .then(function (r) {
        return r.json().then(function (j) {
          return { ok: r.ok, j: j };
        });
      })
      .then(function (res) {
        if (!res.ok) throw new Error("submit");
        diagnosticId = res.j.id;
        lastResult = res.j.result;
        step = 6;
        renderResult(res.j.result);
      })
      .catch(function () {
        if (next) {
          next.disabled = false;
          next.textContent = "Voir mon résultat →";
        }
        alert("Une erreur est survenue. Vérifiez votre connexion et réessayez.");
      });
  }

  // ---------------- RÉSULTAT ----------------
  function renderResult(r) {
    setProgress(0);
    var secondaireTile = r.themeSecondaire
      ? '<div class="result-tile secondaire"><span class="lbl">Besoin complémentaire</span><span class="val">' +
        esc(r.themeSecondaire.label) + "</span></div>"
      : "";
    var secondaireNote = r.secondaireNote ? '<p class="note">' + esc(r.secondaireNote) + "</p>" : "";

    screenEl.innerHTML =
      '<div class="result-hero">' +
      '<span class="eyebrow">Votre diagnostic numérique</span>' +
      "<h1>" + esc(r.service.accroche) + "</h1>" +
      "<p>" + esc(r.service.resume) + "</p>" +
      "</div>" +
      '<div class="result-grid">' +
      '<div class="result-tile highlight"><span class="lbl">Thématique prioritaire</span><span class="val">' +
      esc(r.themePrincipal.label) + "</span></div>" +
      '<div class="result-tile"><span class="lbl">Recommandation</span><span class="val">' +
      esc(r.service.label) + "</span></div>" +
      secondaireTile +
      '<div class="result-tile"><span class="lbl">Public concerné</span><span class="val">' +
      esc(r.publicLabel) + "</span></div>" +
      '<div class="result-tile"><span class="lbl">Échéance</span><span class="val">' +
      esc(r.echeanceLabel) + "</span></div>" +
      "</div>" +
      '<div class="reco-box">' +
      "<h2>Notre recommandation</h2>" +
      "<p>" + esc(r.explanation) + "</p>" +
      secondaireNote +
      "</div>" +
      '<div class="cta-box">' +
      "<h2>" + esc(r.cta_title) + "</h2>" +
      "<p>" + esc(r.cta_text) + "</p>" +
      '<button class="btn btn-primary full" id="to-contact">Être recontacté par le Guichet du Numérique</button>' +
      "</div>" +
      '<div class="nav"><button type="button" class="btn-link" id="restart-res">Recommencer pour une autre association</button>' +
      '<span class="spacer"></span>' +
      '<button type="button" class="btn-link" id="skip-res">Terminer</button></div>';

    document.getElementById("to-contact").addEventListener("click", function () {
      step = 7;
      renderContact();
    });
    document.getElementById("restart-res").addEventListener("click", restart);
    document.getElementById("skip-res").addEventListener("click", function () {
      step = 8;
      renderThanks(false);
    });
    scrollTop();
  }

  // ---------------- CONTACT ----------------
  function renderContact() {
    setProgress(0);
    var ct = C.contact;
    var fieldHTML = ct.fields
      .map(function (f) {
        var req = f.requiredIfContact ? ' <span class="req" title="requis en cas de demande de contact">*</span>' : "";
        var input =
          f.type === "textarea"
            ? '<textarea id="f-' + f.id + '" name="' + f.id + '"></textarea>'
            : '<input type="' + f.type + '" id="f-' + f.id + '" name="' + f.id + '" ' +
              (f.type === "email" ? 'autocomplete="email"' : "") + " />";
        return (
          '<div class="field" data-field="' + f.id + '">' +
          '<label for="f-' + f.id + '">' + esc(f.label) + req + "</label>" +
          input +
          '<span class="err">Ce champ est requis.</span>' +
          "</div>"
        );
      })
      .join("");

    var consentsHTML = ct.requests
      .map(function (rq) {
        return (
          '<label class="consent' + (rq.exclusive ? " exclusive" : "") + '" data-val="' + esc(rq.value) + '">' +
          '<input type="checkbox" value="' + esc(rq.value) + '"' + (rq.exclusive ? ' data-exclusive="1"' : "") + " />" +
          '<span class="c-label">' + esc(rq.label) + "</span>" +
          "</label>"
        );
      })
      .join("");

    // champ prénom + nom sur une ligne
    screenEl.innerHTML =
      '<div class="card">' +
      '<span class="eyebrow">Prise de contact facultative</span>' +
      '<h2 class="q-title">' + esc(ct.intro_title) + "</h2>" +
      '<p class="q-help">' + esc(ct.intro_text) + "</p>" +
      '<div class="error-banner" id="form-error"></div>' +
      '<form id="contact-form" novalidate>' +
      fieldHTML +
      '<div class="consents">' + consentsHTML + "</div>" +
      '<div class="privacy-note">' + esc(ct.privacy_note) +
      ' <a href="' + esc(ct.privacy_url) + '" target="_blank" rel="noopener">Politique de confidentialité</a>.</div>' +
      '<button type="submit" class="btn btn-primary full" id="send-contact">' + esc(ct.cta) + "</button>" +
      "</form>" +
      '<div class="nav"><button type="button" class="btn-link" id="back-result">← Retour au résultat</button>' +
      '<span class="spacer"></span>' +
      '<button type="button" class="btn-link" id="skip-contact">' + esc(ct.skip) + "</button></div>" +
      "</div>";

    // Logique d'exclusivité des consentements
    var consents = Array.prototype.slice.call(screenEl.querySelectorAll(".consent"));
    consents.forEach(function (lab) {
      var cb = lab.querySelector("input");
      cb.addEventListener("change", function () {
        var isExclusive = cb.getAttribute("data-exclusive") === "1";
        if (cb.checked && isExclusive) {
          consents.forEach(function (other) {
            var ocb = other.querySelector("input");
            if (ocb !== cb) {
              ocb.checked = false;
              other.classList.remove("checked");
            }
          });
        } else if (cb.checked && !isExclusive) {
          consents.forEach(function (other) {
            var ocb = other.querySelector("input");
            if (ocb.getAttribute("data-exclusive") === "1") {
              ocb.checked = false;
              other.classList.remove("checked");
            }
          });
        }
        lab.classList.toggle("checked", cb.checked);
      });
    });

    document.getElementById("contact-form").addEventListener("submit", function (e) {
      e.preventDefault();
      sendContact();
    });
    document.getElementById("back-result").addEventListener("click", function () {
      step = 6;
      renderResult(lastResult);
    });
    document.getElementById("skip-contact").addEventListener("click", function () {
      step = 8;
      renderThanks(false);
    });
    scrollTop();
  }

  function getRequests() {
    return Array.prototype.slice
      .call(screenEl.querySelectorAll(".consent input:checked"))
      .map(function (cb) {
        return cb.value;
      });
  }

  function sendContact() {
    var banner = document.getElementById("form-error");
    banner.classList.remove("show");
    var requests = getRequests();
    var noContact = requests.indexOf("no-contact") !== -1;
    var active = ["contact", "formations", "newsletter"].some(function (v) {
      return requests.indexOf(v) !== -1;
    });

    // validation front
    Array.prototype.forEach.call(screenEl.querySelectorAll(".field"), function (f) {
      f.classList.remove("invalid");
    });

    if (!active && !noContact) {
      banner.textContent = "Choisissez au moins une option ci-dessous (être recontacté, recevoir des informations, ou indiquer que vous ne souhaitez pas être contacté).";
      banner.classList.add("show");
      return;
    }

    var payload = {
      diagnostic_id: diagnosticId,
      requests: requests,
    };
    var val = function (id) {
      var el = document.getElementById("f-" + id);
      return el ? el.value.trim() : "";
    };
    ["prenom", "nom", "association", "fonction", "email", "telephone", "precisions"].forEach(function (id) {
      payload[id] = val(id);
    });

    if (active && !noContact) {
      var required = ["prenom", "nom", "association", "email"];
      var missing = [];
      required.forEach(function (id) {
        if (!payload[id]) missing.push(id);
      });
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email);
      if (!emailOk && payload.email) missing.indexOf("email") === -1 && missing.push("email");
      if (missing.length) {
        missing.forEach(function (id) {
          var f = screenEl.querySelector('.field[data-field="' + id + '"]');
          if (f) {
            f.classList.add("invalid");
            if (id === "email" && payload.email && !emailOk)
              f.querySelector(".err").textContent = "Adresse e-mail invalide.";
            else f.querySelector(".err").textContent = "Ce champ est requis.";
          }
        });
        banner.textContent = "Merci de compléter les champs requis pour être recontacté.";
        banner.classList.add("show");
        var first = screenEl.querySelector(".field.invalid input");
        if (first) first.focus();
        return;
      }
    }

    var btn = document.getElementById("send-contact");
    btn.disabled = true;
    btn.textContent = "Envoi…";
    fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        if (!r.ok) throw new Error("contact");
        step = 8;
        renderThanks(!noContact && active);
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = C.contact.cta;
        banner.textContent = "L'envoi a échoué. Vérifiez votre connexion et réessayez.";
        banner.classList.add("show");
      });
  }

  // ---------------- MERCI ----------------
  function renderThanks(contacted) {
    setProgress(0);
    screenEl.innerHTML =
      '<div class="card thanks">' +
      '<div class="big-check" aria-hidden="true">' +
      '<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#13925c" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      "</div>" +
      "<h1>" + (contacted ? "Merci, c'est noté !" : "Merci pour votre participation !") + "</h1>" +
      "<p>" +
      (contacted
        ? "Votre demande a bien été transmise au Guichet du Numérique. Nous reviendrons vers vous rapidement pour convenir d'un premier échange de 30 minutes."
        : "Votre diagnostic est terminé. N'hésitez pas à passer nous voir sur le stand du Guichet du Numérique pour en discuter de vive voix.") +
      "</p>" +
      '<button class="btn btn-primary full" id="restart">Nouveau diagnostic</button>' +
      "</div>";
    document.getElementById("restart").addEventListener("click", restart);
    scrollTop();
  }

  function restart() {
    answers = {
      situation: null,
      thematique_principale: null,
      thematique_secondaire: null,
      aide: null,
      public: null,
      echeance: null,
    };
    diagnosticId = null;
    lastResult = null;
    step = 0;
    render();
  }

  // ---------------- ROUTEUR ----------------
  function render() {
    if (step === 0) return renderIntro();
    if (step >= 1 && step <= 5) return renderQuestion(step);
    if (step === 6) return renderResult(lastResult);
    if (step === 7) return renderContact();
    if (step === 8) return renderThanks(false);
  }

  // ---------------- INIT ----------------
  fetch("/api/content")
    .then(function (r) {
      return r.json();
    })
    .then(function (content) {
      C = content;
      render();
    })
    .catch(function () {
      screenEl.innerHTML =
        '<div class="card"><h2 class="q-title">Chargement impossible</h2><p class="q-help">Le diagnostic n\'a pas pu se charger. Veuillez recharger la page.</p><button class="btn btn-primary" onclick="location.reload()">Recharger</button></div>';
    });
})();
