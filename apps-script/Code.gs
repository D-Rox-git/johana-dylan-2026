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
  "nights", "lodging", "bathroom", "roomwith",
  "ski_type", "ski_period", "ski_people", "ski_days", "ski_sizes",
  "travel", "carpool", "childages", "diet", "ceremony",
  "email", "phone", "message", "page_lang", "submittedLang"
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000); // serialise appends so rows never collide
  try {
    var p = (e && e.parameter) ? e.parameter : {};
    var sheet = getSheet_();
    var now = Utilities.formatDate(new Date(), "Europe/Paris", "yyyy-MM-dd HH:mm:ss");

    var row = COLS.map(function (c) {
      if (c === "timestamp") return now;
      return p[c] !== undefined ? p[c] : "";
    });
    sheet.appendRow(row);

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
