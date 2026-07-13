# Johana & Dylan — 22.12.2026 · Serre Chevalier

A small, bilingual (FR/EN), static wedding site with a custom RSVP form.
No build step, no framework. Hosts free on GitHub Pages. RSVPs land in a
Google Sheet you own (via Apps Script), so you can slice the data for room
allocation. Mailing goes out from your own Gmail with per-household
pre-filled links.

```
index.html          Home: story, key dates, CTA
infos.html          Venue, prices, rooms, getting there, packing, ceremony, FAQ
rsvp.html           The multi-dimensional RSVP form
css/style.css       Warm alpine design
js/main.js          Language toggle (FR/EN, remembered)
js/rsvp.js          Form logic, pre-fill, submission   ← paste ENDPOINT here
apps-script/Code.gs      RSVP backend (Sheet + notifications)
apps-script/MailMerge.gs Personalised bilingual mail-merge from Gmail
private/            Guest list w/ emails — GIT-IGNORED, never published
```

---

## 1. Put it online (GitHub Pages) — 10 min

```bash
# from this folder
git init && git add -A && git commit -m "Wedding site"
gh repo create johana-dylan-2026 --public --source=. --push   # or create on github.com and push
```
Then on GitHub: **Settings ▸ Pages ▸ Source: `main` / root**. Your site appears at
`https://<username>.github.io/johana-dylan-2026/` within a minute or two.

> Prefer a real domain (e.g. `johana-et-dylan.fr`)? Buy one (~12 €/yr), add a
> `CNAME` file, and point DNS at GitHub Pages. Nicer in an invitation email.

The site works immediately. Until you wire the backend (step 2), the RSVP
button opens a pre-filled email to you, so **no reply is ever lost**.

## 2. Collect RSVPs in a Google Sheet — 5 min

1. Create a Google Sheet → **Extensions ▸ Apps Script**.
2. Paste **`apps-script/Code.gs`**. Set `NOTIFY_TO` to your address(es).
3. Run `setup` once (grant permissions).
4. **Deploy ▸ New deployment ▸ Web app** — *Execute as: Me*, *Access: Anyone*.
5. Copy the Web App URL into **`js/rsvp.js`** → `ENDPOINT`. Commit & push.

Now every RSVP appends a row, emails you instantly, and sends the guest a
bilingual confirmation. Change the form? Add the field name to `COLS` in
`Code.gs` too.

## 3. Send the invitations — from your Gmail

1. In the **same Sheet**, add a tab named **`Guests`** and import
   `private/guests.csv` (File ▸ Import ▸ Upload ▸ *Replace current sheet*).
   It already has all 70 households, headcounts, emails, and a language guess.
2. Paste **`apps-script/MailMerge.gs`**. Set `BASE_URL` to your Pages URL.
3. Run **`sendTest`** → check the email that lands in your inbox.
4. Run **`sendBatch`** → everyone gets a personalised link; the `sent` column
   is stamped so you can safely re-run for stragglers.

The link pre-fills each household's name and headcount, and carries a hidden
`id` so responses map straight back to your list — no more guessing who
"Marie" is.

---

## Why this beats a Google Form

- **Conditional, multi-night, capacity-aware.** Nights (18–26 Dec), auberge vs.
  Grand Aigle vs. day-only, room-mate wishes, ski rental, cots, carpooling,
  and the separate 27 Nov ceremony — a flat form can't branch on these.
- **The data is yours, and pivotable.** One Sheet drives the room allocation
  (72 beds, your `Chambres` layout) directly.
- **Personal, not corporate.** Mail from your own address, replies to you.

## Managing the bed crunch (the real problem)

You have up to **112 adults + 63 children = 175** against **72 beds**. As
replies arrive, pivot the RSVP sheet by `nights` × `lodging` to see auberge
demand per night. Steer overflow to Le Grand Aigle / day-only early. The
`roomwith` + `bathroom` fields feed straight into your existing room sheet.
