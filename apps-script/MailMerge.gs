/**
 * Personalised bilingual mail-merge for johana-dylan-2026
 * ------------------------------------------------------------------
 * Sends each household a warm FR/EN email with a UNIQUE pre-filled RSVP
 * link, straight from your Gmail (replies come back to you, great
 * deliverability). Import private/guests.csv into a Sheet tab named
 * "Guests" (File ▸ Import ▸ Upload ▸ "Replace current sheet"), then run.
 *
 * Guests tab columns (row 1 = headers, exactly these):
 *   id | group | name | adults | children | email1 | email2 | lang | sent | responded
 *
 * HOW TO RUN:
 *   1. Set BASE_URL + SENDER_NAME below.
 *   2. Run `sendTest` first — it sends ONE email to TEST_ADDRESS so you can eyeball it.
 *   3. Happy? Run `sendBatch`. It emails everyone whose "sent" cell is empty,
 *      then writes a timestamp there so re-runs never double-send.
 *      (Gmail sends ~100/day on a free account, plenty for 70 households.)
 * ------------------------------------------------------------------
 */

var BASE_URL    = "https://YOURNAME.github.io/johana-dylan-2026"; // <- your GitHub Pages URL, no trailing slash
var SENDER_NAME = "Johana & Dylan";
var REPLY_TO    = "johana.carrier@gmail.com";
var TEST_ADDRESS = "dylan.glover@gmail.com";
var GUEST_TAB   = "Guests";

/** Build the personalised RSVP link for one guest row. */
function buildLink_(g) {
  var q = "?id=" + encodeURIComponent(g.id) +
          "&h="  + encodeURIComponent(g.name) +
          "&a="  + encodeURIComponent(g.adults || "") +
          "&k="  + encodeURIComponent(g.children || "") +
          "&email=" + encodeURIComponent(g.email1 || "");
  return BASE_URL + "/rsvp.html" + q;
}

/** Subject + HTML body. Leads with the guessed language, keeps both. */
function buildEmail_(g) {
  var link = buildLink_(g);
  var first = String(g.name || "").split(/\s|,|&|\bet\b/)[0];
  var subject = "❤️ Johana & Dylan — répondez à l'invitation / RSVP (22.12.2026)";

  var fr =
    '<p>Bonjour <strong>' + first + '</strong>,</p>' +
    '<p>Le grand jour approche&nbsp;! Pour nous aider à organiser l\'hébergement à Serre Chevalier ' +
    '(l\'auberge est privatisée, mais les lits sont comptés&nbsp;!), pouvez-vous remplir notre petit ' +
    'formulaire dès que possible&nbsp;?</p>' +
    '<p style="text-align:center;margin:26px 0">' +
    '<a href="' + link + '" style="background:#7d3145;color:#fff;padding:13px 30px;border-radius:999px;' +
    'text-decoration:none;font-family:sans-serif;font-weight:600;display:inline-block">Répondre à l\'invitation</a></p>' +
    '<p>Vous y retrouverez aussi toutes les infos pratiques (accès, chambres, tarifs, ski…). ' +
    'Le lien est personnalisé pour votre foyer, pas besoin de tout retaper.</p>';

  var en =
    '<p>Hello <strong>' + first + '</strong>,</p>' +
    '<p>The big day is coming! To help us organise the accommodation in Serre Chevalier ' +
    '(the hostel is ours, but the beds are counted!), could you fill in our little form as soon as you can?</p>' +
    '<p style="text-align:center;margin:26px 0">' +
    '<a href="' + link + '" style="background:#7d3145;color:#fff;padding:13px 30px;border-radius:999px;' +
    'text-decoration:none;font-family:sans-serif;font-weight:600;display:inline-block">RSVP now</a></p>' +
    '<p>You\'ll also find all the practical details there (getting there, rooms, prices, skiing…). ' +
    'The link is personalised for your household, so nothing to retype.</p>';

  var blocks = (g.lang === "en") ? [en, hr_(), fr] : [fr, hr_(), en];
  var html =
    '<div style="max-width:560px;margin:0 auto;font-family:Georgia,serif;font-size:16px;color:#2b2b28;line-height:1.6">' +
    '<p style="text-align:center;font-size:26px;color:#2f4a3e;margin:0 0 4px">Johana &amp; Dylan</p>' +
    '<p style="text-align:center;color:#8a5a3b;font-style:italic;margin:0 0 24px">22 décembre 2026 · Serre Chevalier</p>' +
    blocks.join("") +
    '<p style="text-align:center;color:#6b6a63;font-size:13px;margin-top:28px">' +
    'Si le bouton ne marche pas, copiez ce lien / If the button fails, paste this link:<br>' +
    '<a href="' + link + '">' + link + '</a></p>' +
    '</div>';
  return { subject: subject, html: html };
}
function hr_() { return '<hr style="border:none;border-top:1px solid #e3dac9;margin:22px 0">'; }

/** Read the Guests tab into objects. */
function readGuests_() {
  var sh = SpreadsheetApp.getActive().getSheetByName(GUEST_TAB);
  if (!sh) throw new Error('No tab named "' + GUEST_TAB + '". Import guests.csv first.');
  var values = sh.getDataRange().getValues();
  var head = values[0].map(function (h) { return String(h).trim(); });
  var idx = {}; head.forEach(function (h, i) { idx[h] = i; });
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (!row[idx.id]) continue;
    rows.push({
      _row: r + 1,
      id: row[idx.id], group: row[idx.group], name: row[idx.name],
      adults: row[idx.adults], children: row[idx.children],
      email1: String(row[idx.email1] || "").trim(),
      email2: String(row[idx.email2] || "").trim(),
      lang: String(row[idx.lang] || "fr").trim(),
      sent: row[idx.sent], responded: row[idx.responded]
    });
  }
  return { sheet: sh, rows: rows, idx: idx };
}

/** Send ONE test email to yourself using the first guest as the template. */
function sendTest() {
  var g = readGuests_().rows[0];
  var m = buildEmail_(g);
  MailApp.sendEmail({ to: TEST_ADDRESS, subject: "[TEST] " + m.subject, htmlBody: m.html,
                      name: SENDER_NAME, replyTo: REPLY_TO });
  Logger.log("Test sent to " + TEST_ADDRESS + " (rendered for: " + g.name + ")");
}

/** Send to everyone not yet emailed. Marks the "sent" cell so re-runs are safe. */
function sendBatch() {
  var g = readGuests_();
  var sh = g.sheet, sentCol = g.idx.sent + 1;
  var quota = MailApp.getRemainingDailyQuota();
  var count = 0, skipped = 0;
  var stamp = Utilities.formatDate(new Date(), "Europe/Paris", "yyyy-MM-dd HH:mm");

  g.rows.forEach(function (row) {
    if (count >= quota - 2) return;               // stay under Gmail's daily cap
    if (row.sent) return;                          // already emailed
    var recipients = [row.email1, row.email2].filter(function (e) { return e && e.indexOf("@") > 0; });
    if (!recipients.length) { skipped++; sh.getRange(row._row, sentCol).setValue("NO EMAIL"); return; }

    var m = buildEmail_(row);
    MailApp.sendEmail({ to: recipients.join(","), subject: m.subject, htmlBody: m.html,
                        name: SENDER_NAME, replyTo: REPLY_TO });
    sh.getRange(row._row, sentCol).setValue(stamp);
    count++;
  });
  Logger.log("Sent " + count + " emails. " + skipped + " households had no address. Remaining quota: " +
             (quota - count));
}
