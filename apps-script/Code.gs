/**
 * RSVP backend for johana-dylan-2026
 * ------------------------------------------------------------------
 * Deploy this as a Web App bound to a Google Sheet. It receives each
 * RSVP as a POST, appends a row, emails you a notification, and (if an
 * address was given) sends the guest a bilingual confirmation.
 *
 * SETUP (5 minutes):
 *  1. Create a Google Sheet. Extensions ▸ Apps Script. Paste this file.
 *  2. Set NOTIFY_TO below to your email.
 *  3. Deploy ▸ New deployment ▸ type "Web app".
 *       Execute as: Me       Who has access: Anyone
 *  4. Copy the Web App URL into  js/rsvp.js  (the ENDPOINT constant).
 *  5. Run `setup` once from the editor to write the header row (grants perms).
 * ------------------------------------------------------------------
 */

var NOTIFY_TO = "dylan.glover@gmail.com, johana.carrier@gmail.com";
var SHEET_NAME = "RSVPs";

// Column order in the sheet. Add fields here and to the form; unknowns are ignored.
var COLS = [
  "timestamp", "id", "household", "attending", "over5", "under5", "cots",
  "nights", "lodging", "roomwith",
  "ski_type", "ski_period", "ski_people", "ski_days", "ski_sizes",
  "travel", "carpool", "carpool_seats", "childages", "diet", "ceremony",
  "email", "phone", "message", "page_lang", "submittedLang"
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000); // serialise appends so rows never collide
  try {
    var p = (e && e.parameter) ? e.parameter : {};
    var sheet = getSheet_();
    var now = Utilities.formatDate(new Date(), "Europe/Paris", "yyyy-MM-dd HH:mm:ss");

    p.timestamp = now;
    appendByHeader_(sheet, p); // writes by header position; auto-adds any new field as a new column

    markResponded_(p, now); // stamp the Guests tab so you see who's replied at a glance
    notify_(p, now);
    confirmToGuest_(p);

    return json_({ ok: true });
  } catch (err) {
    // Still try to alert you if something breaks.
    try { MailApp.sendEmail(NOTIFY_TO, "⚠️ RSVP error", String(err) + "\n\n" + JSON.stringify(e && e.parameter)); } catch (e2) {}
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json_({ ok: true, service: "jd-rsvp", hint: "POST your RSVP here." });
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(COLS);
    sh.setFrozenRows(1);
  }
  return sh;
}

/**
 * Append a row keyed by the sheet's header, so column order is stable and any
 * NEW field the form starts sending automatically gets its own column — no
 * need to touch this script or redeploy again when the form evolves.
 */
function appendByHeader_(sheet, obj) {
  var lastCol = sheet.getLastColumn();
  var header = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  if (!header.length || !header.join("")) {         // empty sheet -> seed from COLS
    header = COLS.slice();
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
    sheet.setFrozenRows(1);
  }
  // preferred order first, then any posted keys not yet in the header
  var keys = COLS.concat(Object.keys(obj).filter(function (k) { return COLS.indexOf(k) < 0; }));
  keys.forEach(function (k) {
    if (header.indexOf(k) < 0) { header.push(k); sheet.getRange(1, header.length).setValue(k); }
  });
  var row = header.map(function (h) { return obj[h] !== undefined ? obj[h] : ""; });
  sheet.appendRow(row);
}

/** Wipe the RSVPs tab (clears test rows) and rebuild fresh headers from COLS. */
function resetRSVPs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (sh) ss.deleteSheet(sh);
  getSheet_();
}

/**
 * Close the loop: when an RSVP comes in, stamp the matching row on the
 * "Guests" tab (the one the mail-merge uses) so you always know who has
 * replied vs. who still needs a nudge. Silently does nothing if there's
 * no Guests tab or no id match.
 */
function markResponded_(p, now) {
  if (!p.id) return;
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Guests");
  if (!sh) return;
  var values = sh.getDataRange().getValues();
  var head = values[0].map(function (h) { return String(h).trim(); });
  var idCol = head.indexOf("id"), rCol = head.indexOf("responded");
  if (idCol < 0 || rCol < 0) return;
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][idCol]).trim() === String(p.id).trim()) {
      var tag = (p.attending === "yes" ? "✅ oui " : "❌ non ") + now;
      sh.getRange(r + 1, rCol + 1).setValue(tag);
      return;
    }
  }
}

/** Notification to the couple, so you see every reply in real time. */
function notify_(p, now) {
  var coming = p.attending === "yes";
  var head = (coming ? "🎉 " : "😢 ") + (p.household || "Someone") +
             (coming ? " comes on 22.12!" : " can't make it");
  var body = COLS.map(function (c) {
    var v = c === "timestamp" ? now : (p[c] || "");
    return v ? (c + ": " + v) : null;
  }).filter(Boolean).join("\n");
  MailApp.sendEmail(NOTIFY_TO, head, body);
}

/** Bilingual confirmation to the guest (only if they left an address). */
function confirmToGuest_(p) {
  var to = (p.email || "").trim();
  if (!to || to.indexOf("@") < 0) return;
  var fr = (p.page_lang || p.submittedLang) === "fr";
  var name = (p.household || "").split(/\s|,|&|et\s/)[0];
  var coming = p.attending === "yes";
  var subject = fr ? "Merci pour votre réponse — Johana & Dylan"
                   : "Thank you for your RSVP — Johana & Dylan";
  var msg = fr
    ? ("Merci " + name + " !\n\nVotre réponse est bien enregistrée" +
       (coming ? ", on se réjouit de vous voir à Serre Chevalier le 22 décembre ! ❤️" : ". Vous allez nous manquer. ❤️") +
       "\n\nVous pouvez modifier votre réponse à tout moment en renvoyant le formulaire.\n\nÀ très vite,\nJohana & Dylan")
    : ("Thank you " + name + "!\n\nYour reply is saved" +
       (coming ? " — we can't wait to see you in Serre Chevalier on 22 December! ❤️" : ". We'll miss you. ❤️") +
       "\n\nYou can change your answer any time by submitting the form again.\n\nSee you soon,\nJohana & Dylan");
  MailApp.sendEmail(to, subject, msg);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Run once from the editor to create the sheet + grant permissions. */
function setup() {
  getSheet_();
  Logger.log("Sheet ready. Now Deploy ▸ New deployment ▸ Web app.");
}
