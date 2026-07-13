// ============================================================
//  RSVP form logic — pre-fill, conditionals, and submission
// ============================================================

// 1) PASTE your Google Apps Script Web App URL here after deploying (see apps-script/README).
//    Until then, submissions fall back to an email so nothing is ever lost.
var ENDPOINT = "PASTE_YOUR_APPS_SCRIPT_URL_HERE";
var FALLBACK_EMAIL = "johana.carrier@gmail.com"; // used only if the endpoint isn't set / fails

// ---- Nights the couple is on site (18–26 Dec 2026) ----
var NIGHTS = [
  { v: "18", d: "Ve" }, { v: "19", d: "Sa" }, { v: "20", d: "Di" },
  { v: "21", d: "Lu" }, { v: "22", d: "Ma ★" }, { v: "23", d: "Me" },
  { v: "24", d: "Je" }, { v: "25", d: "Ve" }, { v: "26", d: "Sa" }
];

var qp = new URLSearchParams(location.search);
var form = document.getElementById("rsvpForm");
var errBox = document.getElementById("errBox");

// ---- Build the nights selector ----
(function buildNights() {
  var wrap = document.getElementById("nights");
  NIGHTS.forEach(function (n) {
    var l = document.createElement("label");
    l.innerHTML = '<input type="checkbox" name="nights" value="' + n.v + '"><b>' + n.v + '</b><span>déc</span>';
    wrap.appendChild(l);
  });
})();

// ---- Pre-fill from the personalised link (?id=&h=&a=&k=&email=) ----
(function prefill() {
  if (qp.get("h")) document.getElementById("household").value = qp.get("h");
  if (qp.get("a")) document.getElementById("adults").value = qp.get("a");
  if (qp.get("k")) document.getElementById("children").value = qp.get("k");
  if (qp.get("email")) document.getElementById("email").value = qp.get("email");
  if (qp.get("id")) document.getElementById("guestId").value = qp.get("id");

  var name = qp.get("h");
  if (name) {
    var g = document.getElementById("greeting");
    var first = name.split(/\s|,|&|et\s/)[0];
    g.querySelector(".fr").textContent = "Bonjour " + name + ", on a hâte de vous lire";
    g.querySelector(".en").textContent = "Hello " + name + ", we can't wait to hear from you";
  }
})();

// ---- Conditional sections ----
function refreshConditionals() {
  var attending = (form.querySelector('input[name="attending"]:checked') || {}).value;
  toggle("ifYes", attending === "yes");
  var lodging = (form.querySelector('input[name="lodging"]:checked') || {}).value;
  toggle("ifAuberge", attending === "yes" && lodging === "auberge");
}
function toggle(id, show) {
  document.getElementById(id).classList[show ? "add" : "remove"]("show");
}
form.addEventListener("change", refreshConditionals);
refreshConditionals();

// ---- Submit ----
form.addEventListener("submit", function (e) {
  e.preventDefault();
  errBox.classList.remove("err");

  var attending = (form.querySelector('input[name="attending"]:checked') || {}).value;
  if (!attending) return showError();
  if (!document.getElementById("household").value.trim()) return showError();

  var btn = document.getElementById("submitBtn");
  btn.disabled = true;

  var data = collect();

  // No configured endpoint -> open a pre-filled email so nothing is lost.
  if (ENDPOINT.indexOf("PASTE_") === 0) {
    return emailFallback(data, btn);
  }

  var body = new URLSearchParams(data);
  fetch(ENDPOINT, { method: "POST", mode: "no-cors", body: body })
    .then(function () { success(); })
    .catch(function () { emailFallback(data, btn); });
});

function collect() {
  var out = {};
  var fd = new FormData(form);
  // multi-value fields (nights, carpool) get joined
  var multi = {};
  fd.forEach(function (val, key) {
    if (multi[key] !== undefined) { multi[key] += ", " + val; }
    else if (out[key] !== undefined) { multi[key] = out[key] + ", " + val; }
    else { out[key] = val; }
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

// If the endpoint isn't set or the network fails, hand the guest a ready-to-send email.
function emailFallback(data, btn) {
  var isFr = document.documentElement.getAttribute("data-lang") === "fr";
  var lines = Object.keys(data).map(function (k) { return k + ": " + data[k]; }).join("\n");
  var subject = encodeURIComponent("RSVP — " + (data.household || "") + " — 22.12.2026");
  var mailto = "mailto:" + FALLBACK_EMAIL + "?subject=" + subject + "&body=" + encodeURIComponent(lines);
  window.location.href = mailto;
  errBox.textContent = isFr
    ? "Votre logiciel de mail va s'ouvrir avec votre réponse pré-remplie — il ne reste qu'à l'envoyer. Merci !"
    : "Your email app will open with your reply pre-filled — just hit send. Thank you!";
  errBox.classList.add("err");
  btn.disabled = false;
}
