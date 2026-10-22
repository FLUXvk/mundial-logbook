# Mundial Field Log Book — RFA MDC Compliance Monitoring (Log Book 1)

Offline tablet app for the 10 cantilever poles. Record quarterly PM, Swakopmund interim recoats and emergency call-outs, capture readings, photos, GPS, signatures and the company stamp, then email a Mundial-branded PDF.

## 1. Publish on GitHub Pages (once, ~10 minutes)

1. Sign in at https://github.com (create a free account if needed).
2. **New repository** → name it `mundial-logbook` → choose **Public** (Pages is free for public repos; the app contains no client data — all records stay on the tablet) → **Create repository**.
3. On the empty repo page click **uploading an existing file**, then drag in **everything inside this folder** (`index.html`, `app.js`, `sw.js`, `manifest.webmanifest`, `.nojekyll`, and the folders `assets`, `icons`, `lib`, `mailer`). Click **Commit changes**.
   - Tip: the hidden `.nojekyll` file may not show in your file browser — it is optional.
4. Go to **Settings → Pages** → *Source*: **Deploy from a branch** → Branch **main**, folder **/ (root)** → **Save**.
5. After 1–2 minutes the site is live at `https://<your-github-username>.github.io/mundial-logbook/`.

## 2. Install on the Android tablet

1. Open the link above in **Chrome** on the tablet.
2. Tap **Install app** on the home screen of the log book (or Chrome menu ⋮ → **Add to home screen / Install app**).
3. Open it once while online — after that it works fully offline (border posts, road blocks).
4. When Chrome asks, **allow Location** (GPS on each visit) and **Camera** (photos).

## 3. Set up email delivery (Gmail, free, ~5 minutes)

The app emails PDFs through a small Google Apps Script that runs in **your own** Google account.

1. Go to https://script.google.com → **New project** → name it `Mundial log book mailer`.
2. Delete the sample code and paste the contents of `mailer/Code.gs`.
3. Change `ACCESS_CODE` to your own secret (e.g. `Mundial-RFA-7G2k`). **Save**.
4. **Deploy → New deployment** → gear icon → **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   - **Deploy** → approve the Google permission prompts (Advanced → Go to project → Allow).
5. Copy the **Web app URL** (ends in `/exec`).
6. In the tablet app: **Settings → Email delivery** → enter your email address, paste the URL as *Mailer link*, enter the same access code → **Save** → **Send test email**.

Reports are sent from your Gmail account to the address in Settings. If the tablet is offline, completed reports wait in the **outbox** and send automatically when it reconnects (or tap *Send now*).

You can always use **Share PDF** instead — it opens the Android share sheet (Gmail, Outlook, WhatsApp, Drive).

## 4. Day-to-day use

- **New pole visit** → choose the pole, visit type (Quarterly PM / Swakopmund interim recoat / Emergency) and quarter. Coating-due visits are flagged ★ automatically (quarters 1 & 3 by default — Settings; Swakopmund every visit).
- Work through Details → Checklist (OK / Fault / N/A; faults need a remark) → Readings → Handhelds → Findings → Photos → Annexures → Sign-off. Everything saves automatically.
- **Arrival photo** — prompted as soon as a visit is started (pole and site as found). **Cabinet interior photo** — prompted when you tick the first Control Cabinet item. Both are flagged if missing at completion and lead the Photos page of the PDF.
- **Annexures** — after Photos, upload one or two images from the tablet gallery / Files, e.g. DJI drone thermal or aerial images transferred from the DJI RC (Bluetooth / USB) beforehand. DJI files ending `_T` are labelled Thermal, `_W` / `_Z` / `_V` Aerial / visual (changeable). Each annexure is a full page at the end of the PDF (Annexure A, B). The limit is set by `MAX_ANNEX` at the top of `app.js`.
- **Sign-off** — each signer can draw a signature, add a photo (e.g. the signatory or a signed paper form), or both. Photos appear next to the signature in the PDF.
- **Vehicle & distance** — add company vehicles once in *Settings → Company vehicles*; on each visit select the vehicle and enter the **odometer at trip start** and the **odometer at the pole**. The app shows the **total trip distance** = 2 × (pole − trip start), and it is printed on the PDF.
- **Photos** — every photo point (arrival, cabinet interior, extra photos, stamp photo, picture of signature) offers **📷 Take photo** (camera) or **🖼 Gallery** (pick an existing image).
- **Signatures** — draw with a finger or stylus; **↶ Undo** removes the last stroke, **Clear** empties the box, and **Take picture of signature** (camera or gallery) adds a picture of a signature, e.g. on a paper form.
- **Complete & send** checks for missing items/signatures, then emails or shares the PDF.
- **Incident register** — one line per incident, tick *Resolved?*, share or email the register as a PDF.
- **Settings → Export backup** after each trip: records live only on the tablet. Keep the backup file on Google Drive or email it to yourself. *Import backup* restores it on another tablet.

## 5. Updating the app

Upload the new files over the old ones in the GitHub repo (Add file → Upload files → Commit) — `sw.js` already carries a new `VERSION` with each release (currently `mundial-logbook-v1.2.0`). Tablets show **Update available** the next time they open the app online. Records are kept.

## Files

| File | Purpose |
|---|---|
| `index.html` | App screen layout and styling |
| `app.js` | App logic: forms, storage, PDF, email outbox |
| `sw.js` | Offline support (caches the app) |
| `manifest.webmanifest`, `icons/` | Installable app name and icons |
| `assets/` | Mundial logo and PDF watermark |
| `lib/` | jsPDF + AutoTable (PDF generation, MIT licence) |
| `mailer/Code.gs` | Google Apps Script email mailer |
