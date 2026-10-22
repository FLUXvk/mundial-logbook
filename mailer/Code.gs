/**
 * Mundial Field Log Book — email mailer (Google Apps Script)
 * Receives a PDF from the tablet app and emails it from your Gmail account.
 *
 * 1. Change ACCESS_CODE below to your own secret (letters & numbers).
 * 2. Deploy → New deployment → type "Web app" → Execute as: Me → Who has access: Anyone → Deploy.
 * 3. Copy the web app URL (ends in /exec) into the app: Settings → Mailer link, and the same ACCESS_CODE.
 */
const ACCESS_CODE = 'CHANGE-ME-to-a-secret-code';
const ALLOWED_DOMAINS = [];        // optional, e.g. ['mundial.com.na'] — leave empty to allow any recipient
const SENDER_NAME = 'Mundial Field Log Book';

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.token !== ACCESS_CODE) return reply({ ok: false, error: 'Wrong access code' });
    const to = String(d.to || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return reply({ ok: false, error: 'Invalid recipient' });
    if (ALLOWED_DOMAINS.length && !ALLOWED_DOMAINS.some(dom => to.toLowerCase().endsWith('@' + dom))) return reply({ ok: false, error: 'Recipient not allowed' });
    const pdf = Utilities.newBlob(Utilities.base64Decode(d.pdf), 'application/pdf', d.filename || 'logbook.pdf');
    GmailApp.sendEmail(to, d.subject || 'Mundial log book report', d.body || 'Report attached.', { attachments: [pdf], name: SENDER_NAME });
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}
function doGet() { return reply({ ok: true, service: 'Mundial Field Log Book mailer' }); }
function reply(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
