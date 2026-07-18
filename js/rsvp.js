// ============================================================
//  RSVP form logic — pre-fill, conditionals, and submission
// ============================================================

// 1) PASTE your Google Apps Script Web App URL here after deploying (see apps-script/README).
//    Until then, submissions fall back to an email so nothing is ever lost.
var ENDPOINT = "PASTE_YOUR_APPS_SCRIPT_URL_HERE";
var FALLBACK_EMAIL = "johana.carrier@gmail.com"; // used only if the endpoint isn't set / fails

// ---- Days the couple is on site: Fri 18 → Sat 26 Dec 2026 ----
// Nights you can sleep = 18…25 (checking out on the morning after). The 26th is the last morning.
var DAYS = [
  { v: "18", fr: "Ven", en: "Fri" }, { v: "19", fr: "Sam", en: "Sat" },
  { v: "20", fr: "Dim", en: "Sun" }, { v: "21", fr: "Lun", en: "Mon" },
  { v: "22", fr: "Mar", en: "Tue", star: true }, { v: "23", fr: "Mer", en: "Wed" },
  { v: "24", fr: "Jeu", en: "Thu" }, { v: "25", fr: "Ven", en: "Fri" },
  { v: "26", fr: "Sam", en: "Sat" }
];

var qp = new URLSearchParams(location.search);
var form = document.getElementById("rsvpForm");
var errBox = document.getElementById("errBox");

// ---- Build a day selector (used for nights AND for ski-rental days) ----
function buildDays(containerId, fieldName, includeLast) {
  var wrap = document.getElementById(containerId);
  DAYS.forEach(function (n, i) {
    if (!includeLast && i === DAYS.length - 1) return; // no "night of the 26th"
    var l = document.createElement("label");
    l.innerHTML =
      '<input type="checkbox" name="' + fieldName + '" value="' + n.v + '">' +
      '<span class="dow"><span class="fr">' + n.fr + (n.star ? " ★" : "") + '</span>' +
      '<span class="en">' + n.en + (n.star ? " ★" : "") + '</span></span>' +
      '<b>' + n.v + '</b><span class="mth">déc</span>';
    wrap.appendChild(l);
  });
}
buildDays("nights", "nights", false); // sleeping nights 18→25
buildDays("skidays", "ski_days", true); // ski days 18→26

// ---- Pre-fill name/email/id from the personalised link (NOT the headcounts) ----
(function prefill() {
  if (qp.get("h")) document.getElementById("household").value = qp.get("h");
  if (qp.get("email")) document.getElementById("email").value = qp.get("email");
  if (qp.get("id")) document.getElementById("guestId").value = qp.get("id");

  var name = qp.get("h");
  if (name) {
    var g = document.getElementById("greeting");
    g.querySelector(".fr").textContent = "Bonjour " + name + ", on a hâte de vous lire";
    g.querySelector(".en").textContent = "Hello " + name + ", we can't wait to hear from you";
  }
})();

// ---- Conditional sections ----
function val(name) { var el = form.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ""; }
function num(id) { return parseInt(document.getElementById(id).value, 10) || 0; }

function refreshConditionals() {
  var attending = val("attending") === "yes";
  toggle("ifYes", attending);
  toggle("ifAuberge", attending && val("lodging") === "auberge");
  toggle("ifCots", attending && num("under5") > 0);
  var ski = val("ski_type");
  toggle("ifSki", attending && ski && ski !== "none");
}
function toggle(id, show) { document.getElementById(id).classList[show ? "add" : "remove"]("show"); }
form.addEventListener("change", refreshConditionals);
form.addEventListener("input", refreshConditionals); // catch typing in the number fields
refreshConditionals();

// ---- Submit ----
form.addEventListener("submit", function (e) {
  e.preventDefault();
  errBox.classList.remove("err");

  if (!val("attending")) return showError();
  if (!document.getElementById("household").value.trim()) return showError();

  var btn = document.getElementById("submitBtn");
  btn.disabled = true;
  var data = collect();

  if (ENDPOINT.indexOf("PASTE_") === 0) return emailFallback(data, btn);

  fetch(ENDPOINT, { method: "POST", mode: "no-cors", body: new URLSearchParams(data) })
    .then(function () { success(); })
    .catch(function () { emailFallback(data, btn); });
});

function collect() {
  var out = {}, multi = {}, fd = new FormData(form);
  fd.forEach(function (v, k) {
    if (multi[k] !== undefined) multi[k] += ", " + v;
    else if (out[k] !== undefined) multi[k] = out[k] + ", " + v;
    else out[k] = v;
  });
  Object.keys(multi).forEach(function (k) { out[k] = multi[k]; });
  out.page_lang = document.documentElement.getAttribute("data-lang");
  return out;
}

function success() {
  form.style.display = "none";
  document.getElementById("thankyou").classList.add("show");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showError() {
  var isFr = document.documentElement.getAttribute("data-lang") === "fr";
  errBox.textContent = isFr
    ? "Merci de nous dire au moins qui vous êtes et si vous venez le 22."
    : "Please tell us at least who you are and whether you're coming on the 22nd.";
  errBox.classList.add("err");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function emailFallback(data, btn) {
  var isFr = document.documentElement.getAttribute("data-lang") === "fr";
  var lines = Object.keys(data).map(function (k) { return k + ": " + data[k]; }).join("\n");
  var subject = encodeURIComponent("RSVP — " + (data.household || "") + " — 22.12.2026");
  window.location.href = "mailto:" + FALLBACK_EMAIL + "?subject=" + subject + "&body=" + encodeURIComponent(lines);
  errBox.textContent = isFr
    ? "Votre logiciel de mail va s'ouvrir avec votre réponse pré-remplie — il ne reste qu'à l'envoyer. Merci !"
    : "Your email app will open with your reply pre-filled — just hit send. Thank you!";
  errBox.classList.add("err");
  btn.disabled = false;
}
