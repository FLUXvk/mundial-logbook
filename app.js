/* Mundial Technologies — Field Log Book (RFA MDC Compliance Monitoring, Log Book 1)
   Offline-first web app: pole visit records, incident register, PDF export, email outbox. */
'use strict';
const APP_VERSION = '1.2.0';
const MAX_ANNEX = 2; // drone / thermal annexure images per visit
const BOOK_REF = 'MT-MLB-RFA-CMS-01';
const BLUE = [3, 82, 148], RED = [238, 28, 37], TINT = [238, 244, 250], LINE = [197, 214, 232], MUTED = [91, 100, 117], INK = [26, 26, 46];

/* ------------------------------------------------------------------ site data */
const SITES = [
  { code: 'P01', name: 'Noordoewer Border Post', power: 'Grid', anpr: 2, ov: 2, rfid: 2, heater: false, cm: 2, regime: '2nd', region: 'South' },
  { code: 'P02', name: 'Ariamsvlei Border Post', power: 'Grid', anpr: 2, ov: 2, rfid: 2, heater: false, cm: 2, regime: '2nd', region: 'South' },
  { code: 'P03', name: 'Trans Kalahari Border Post (Buitepos)', power: 'Grid', anpr: 2, ov: 2, rfid: 2, heater: false, cm: 1, regime: '2nd', region: 'East' },
  { code: 'P04', name: 'Oshikango Border Post', power: 'Grid', anpr: 2, ov: 2, rfid: 2, heater: false, cm: 3, regime: '2nd', region: 'North' },
  { code: 'P05', name: 'Katima Mulilo (Wenela) Border Post', power: 'Grid', anpr: 2, ov: 2, rfid: 2, heater: false, cm: 3, regime: '2nd', region: 'North-East' },
  { code: 'P06', name: 'Swakopmund Road Block', power: 'Grid', anpr: 2, ov: 2, rfid: 2, heater: true, cm: 1, regime: 'monthly', region: 'Central-West' },
  { code: 'P07', name: 'Okapuka Road Block — Pole A', power: 'Grid', anpr: 1, ov: 1, rfid: 1, heater: false, cm: 1, regime: '2nd', region: 'Central' },
  { code: 'P08', name: 'Okapuka Road Block — Pole B', power: 'Grid', anpr: 1, ov: 1, rfid: 1, heater: false, cm: 1, regime: '2nd', region: 'Central' },
  { code: 'P09', name: 'HK Gantry (Kapps Farm police road block)', power: 'Solar', anpr: 2, ov: 2, rfid: 2, heater: false, cm: 1, regime: '2nd', region: 'Central-East', gps: '22°29\'01.54"S 17°30\'43.74"E' },
  { code: 'P10', name: 'Rehoboth Gantry (Windhoek–Rehoboth road block)', power: 'Solar', anpr: 2, ov: 2, rfid: 2, heater: false, cm: 1, regime: '2nd', region: 'Central-South', gps: '22°46\'41.04"S 17°07\'53.29"E' },
];
const CM_LABEL = { 1: 'Month 1 — central', 2: 'Month 2 — south', 3: 'Month 3 — north' };
const site = code => SITES.find(s => s.code === code);
const KIND_LABEL = { pm: 'Quarterly PM', interim: 'Swakopmund interim recoat', emergency: 'Emergency call-out' };

function checklistFor(rec) {
  const s = site(rec.site);
  if (rec.kind === 'interim') {
    return [
      { t: 'SAFETY', items: ['Traffic accommodation set up & removed; police informed'] },
      { t: `CAMERAS (${s.anpr} ANPR + ${s.ov} overview)`, items: ['Lenses & housings cleaned (salt / fog residue removed)', '★ Ceramic coating applied to all lenses', 'Seals & desiccant checked', 'Image & plate capture checked on edge PC after coating'] },
      { t: 'CABINET (coastal climate)', items: ['Hygrostat set-point & panel heater working', 'Cabinet dry; no condensation or corrosion', 'AC cooling unit running'] },
    ].map(gid);
  }
  const coat = rec.coatDue ? '★ Ceramic coating applied to all lenses — DUE this visit' : 'Ceramic coating applied (not due this visit — tick N/A)';
  const g = [
    { t: 'SAFETY & STRUCTURE', items: ['Traffic accommodation set up & removed; officials informed', 'Pole structure, welds, base bolts, corrosion & earthing', 'Cable entries, conduits & labels'] },
    { t: `CAMERAS (${s.anpr} ANPR + ${s.ov} overview)`, items: ['Lenses & housings cleaned (lens-safe cleaner, microfibre)', coat, 'Brackets, seals & cabling secure', 'Focus, field of view, IR & plate capture checked'] },
    { t: `UHF RFID READERS (${s.rfid})`, items: ['Readers cleaned; mounting & cabling checked', 'Live read test with handheld / test tag OK'] },
  ];
  const cab = ['Seals, door lock, dust & insects; desiccant refreshed', s.power === 'Grid' ? 'AC cooling unit: filter cleaned, drain clear, running' : 'DC fans & filters: running, airflow clear'];
  if (s.heater) cab.push('Hygrostat set-point & panel heater tested');
  g.push({ t: 'CONTROL CABINET', items: cab });
  if (s.power === 'Grid') g.push({ t: 'BACKUP POWER (24 VDC)', items: ['Mean Well 24 VDC charger output & AC supply / breakers / surge', 'Hubble 25 kWh battery: SOC, BMS alarms, terminals', 'DC distribution, breakers & fuses'] });
  else g.push({ t: 'SOLAR POWER (48 VDC)', items: ['4 × 545 W CS panels cleaned (deionised water) & inspected; string cabling', 'Luxpower 5 kW inverter: status & fault log', 'Hubble AM-2 5 kWh battery: SOC, BMS alarms; DC breakers'] });
  g.push({ t: 'COMPUTE & NETWORK', items: ['Asus rugged edge PC: health, disk, services, time sync', 'FortiSwitch rugged 8-port: ports & link status', 'FortiGate 70F-3G4G: LTE signal, VPN to RFA HQ up', 'FortiAP FAP-432F: handheld connects to intranet'] });
  g.push({ t: 'HANDHELD RFID DEVICE(S)', items: ['Physical condition, battery, trigger & RFID read; app syncs'] });
  return g.map(gid);
}
function gid(g, gi) { return { title: g.t, items: g.items.map((text, i) => ({ id: `g${gi}i${i}`, text, star: text.startsWith('★') })) }; }
function allItems(rec) { return checklistFor(rec).flatMap(g => g.items); }

function readingsFor(rec) {
  const s = site(rec.site);
  if (rec.kind === 'interim') return ['Cabinet humidity (%RH)', 'Hygrostat set-point (%RH)', 'Cabinet temperature (°C)', 'ANPR reads last 24 h'];
  const p = s.power === 'Grid'
    ? ['AC supply voltage (V)', 'Charger output (V DC)', 'Battery voltage (V)', 'Battery SOC (%)', 'BMS alarms (Y/N)']
    : ['PV string voltage (V)', 'PV current (A)', 'Inverter status / fault code', 'Battery voltage (V, 48 V)', 'Battery SOC (%)'];
  const c = ['Cabinet temperature (°C)', 'LTE signal RSRP (dBm)', 'VPN to RFA HQ up (Y/N)', 'ANPR reads last 24 h (count / %)', 'RFID test-tag reads (count)', 'Edge PC disk free (%)'];
  return p.concat(c, s.heater ? ['Cabinet humidity (%RH)', 'Hygrostat set-point (%RH)'] : []);
}
const powerLabel = s => s.power === 'Grid' ? 'Grid — Mean Well 24 V + Hubble 25 kWh' : 'Solar — 4×545 W PV + Luxpower 5 kW + AM-2 5 kWh';
function recTitle(rec) {
  const s = site(rec.site);
  if (rec.kind === 'interim') return `Swakopmund Interim Recoat — ${s.code} ${s.name}`;
  const q = rec.kind === 'emergency' ? 'Emergency' : `Q${rec.quarter}`;
  return `Pole Visit Record — ${q} · ${s.code} ${s.name}`;
}

/* ------------------------------------------------------------------ storage (IndexedDB) */
const DB = (() => {
  let dbp;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('mundial-logbook', 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('records')) d.createObjectStore('records', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('incidents')) d.createObjectStore('incidents', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv', { keyPath: 'k' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const tx = async (store, mode, fn) => {
    const d = await open();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode); const req = fn(t.objectStore(store));
      t.oncomplete = () => res(req ? req.result : undefined); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  };
  return {
    all: s => tx(s, 'readonly', st => st.getAll()),
    get: (s, id) => tx(s, 'readonly', st => st.get(id)),
    put: (s, v) => tx(s, 'readwrite', st => st.put(v)),
    del: (s, id) => tx(s, 'readwrite', st => st.delete(id)),
  };
})();
let SETTINGS = { email: '', scriptUrl: '', token: '', techs: ['', '', ''], vehicles: [], lastVehicle: '', stamp: '', coatQuarters: '1,3', autoSend: true };
async function loadSettings() { try { const v = await DB.get('kv', 'settings'); if (v) SETTINGS = Object.assign(SETTINGS, v.v); } catch (e) { console.warn(e); } }
async function saveSettings() { await DB.put('kv', { k: 'settings', v: SETTINGS }); }

/* ------------------------------------------------------------------ helpers */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const nowTime = () => new Date().toTimeString().slice(0, 5);
const fmtDate = s => { if (!s) return ''; const d = new Date(s + 'T00:00:00'); return isNaN(d) ? s : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); };
const fmtDT = ts => ts ? new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
function toast(msg, ms = 2600) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), ms); }
function modal(title, html, actions) {
  return new Promise(res => {
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="box"><h3>${esc(title)}</h3><div>${html}</div><div class="acts">${actions.map((a, i) => `<button class="btn ${a.cls || ''}" data-i="${i}">${esc(a.label)}</button>`).join('')}</div></div>`;
    m.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) { m.remove(); res(actions[+b.dataset.i].value); } });
    document.body.appendChild(m);
  });
}
function fileToDataURL(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); }); }
async function compressImage(file, max = 1400, q = 0.72) {
  const url = await fileToDataURL(file);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', q);
}
async function urlToDataURL(u) { const r = await fetch(u); const b = await r.blob(); return fileToDataURL(b); }
function imgSize(dataUrl) { return new Promise(res => { const i = new Image(); i.onload = () => res({ w: i.width, h: i.height }); i.onerror = () => res({ w: 1, h: 1 }); i.src = dataUrl; }); }

/* camera + gallery buttons sharing one data attribute (both inputs trigger the same handler) */
function pickBtns(attr, val, camLabel, opts = {}) {
  const a = `${attr}="${esc(val)}"`, m = opts.multiple ? 'multiple' : '';
  return `<label class="btn sm ${opts.primary ? 'primary' : ''}" style="cursor:pointer">📷 ${camLabel}<input type="file" accept="image/*" capture="environment" ${a} ${m} hidden></label>` +
    `<label class="btn sm" style="cursor:pointer">🖼 Gallery<input type="file" accept="image/*" ${a} ${m} hidden></label>`;
}
const num = v => { const n = parseFloat(String(v ?? '').replace(/[^\d.]/g, '')); return isNaN(n) ? null : n; };
function tripKm(rec) {
  const a = num(rec.odoStart), b = num(rec.odoPole);
  if (a === null || b === null) return null;
  const one = b - a; return one < 0 ? { err: 'Odometer at pole is lower than at trip start' } : { one, total: one * 2 };
}
const tripText = rec => { const t = tripKm(rec); return !t ? '' : t.err ? t.err : `${t.total.toLocaleString('en-GB')} km (2 × ${t.one.toLocaleString('en-GB')} km one way)`; };

/* ------------------------------------------------------------------ progress */
function progress(rec) {
  const items = allItems(rec);
  const done = items.filter(i => rec.checks[i.id] && rec.checks[i.id].v).length;
  const sigs = ['lead', 'tech', 'cust'].filter(k => rec.sign[k] && (rec.sign[k].sig || rec.sign[k].photo)).length;
  return { items: items.length, done, sigs, pct: Math.round(100 * (done + sigs) / (items.length + 3)) };
}

/* ------------------------------------------------------------------ router */
const app = $('#app');
window.addEventListener('hashchange', route);
async function route() {
  const [view, id] = location.hash.replace(/^#\/?/, '').split('/');
  window.scrollTo(0, 0);
  try {
    if (view === 'new') return renderNew();
    if (view === 'visit' && id) return renderVisit(id);
    if (view === 'incidents') return renderIncidents();
    if (view === 'settings') return renderSettings();
    return renderHome();
  } catch (e) { console.error(e); app.innerHTML = `<div class="wrap"><div class="warn">Something went wrong: ${esc(e.message)}</div><a class="btn" href="#">Home</a></div>`; }
}
function setTitle(t) { $('#tb-title').textContent = t; }

/* ------------------------------------------------------------------ home */
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; const b = $('#install'); if (b) b.hidden = false; });
async function renderHome() {
  setTitle('Field Log Book');
  const recs = (await DB.all('records')).sort((a, b) => b.updatedAt - a.updatedAt);
  const queued = recs.filter(r => r.mail && r.mail.state === 'queued').length;
  const setupNeeded = !SETTINGS.email || !SETTINGS.scriptUrl;
  app.innerHTML = `<div class="wrap">
    ${setupNeeded ? `<div class="warn">Email not set up yet — open <a href="#settings">Settings</a> to enter your email address and mailer link. Until then, use “Share PDF” to send reports.</div>` : ''}
    ${queued ? `<div class="warn">${queued} report(s) waiting in the outbox — they send automatically when the tablet is online. <button class="btn sm" id="flush">Send now</button></div>` : ''}
    <div class="tiles">
      <button class="tile" data-go="#new"><b>＋ New pole visit</b><span>Quarterly PM, Swakopmund recoat or emergency call-out</span></button>
      <button class="tile red" data-go="#incidents"><b>Incident register</b><span>One line per incident · resolved?</span></button>
      <button class="tile" data-go="#settings"><b>Settings</b><span>Email, technicians, vehicles, company stamp, backup</span></button>
      <button class="tile" id="install" hidden><b>Install app</b><span>Add to the tablet home screen</span></button>
    </div>
    <div class="card"><h2>Visit records (${recs.length})</h2>
      ${recs.length ? recs.map(recRow).join('') : '<div class="in hint">No visits yet. Tap “New pole visit” to start.</div>'}
    </div>
    <p class="hint">Mundial Technologies · Field Log Book v${APP_VERSION} · ${BOOK_REF} · data is stored on this tablet — use Settings → Backup regularly.</p>
  </div>`;
  if (deferredInstall) $('#install').hidden = false;
  app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => location.hash = b.dataset.go);
  $('#install').onclick = async () => { if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; $('#install').hidden = true; } };
  const fl = $('#flush'); if (fl) fl.onclick = () => processOutbox(true).then(renderHome);
  app.querySelectorAll('[data-act]').forEach(b => b.onclick = () => recAction(b.dataset.act, b.dataset.id));
}
function recRow(r) {
  const p = progress(r); const s = site(r.site);
  const st = r.status === 'completed' ? '<span class="chip done">Completed</span>' : '<span class="chip draft">Draft</span>';
  const ml = r.mail && r.mail.state !== 'none' ? `<span class="chip ${r.mail.state}">${{ queued: 'In outbox', sent: 'Emailed', failed: 'Email failed' }[r.mail.state] || ''}</span>` : '';
  return `<div class="rec"><div class="info"><b>${esc(s.code)} · ${esc(s.name)}</b>
    <div>${esc(r.kind === 'pm' ? 'Q' + r.quarter + ' ' + KIND_LABEL.pm : KIND_LABEL[r.kind])}${r.coatDue ? ' · ★ coating' : ''} · ${esc(fmtDate(r.date))} · ${p.pct}% complete</div>
    <div>${st}${ml}</div></div>
    <button class="btn sm" data-act="open" data-id="${r.id}">Open</button>
    <button class="btn sm" data-act="share" data-id="${r.id}">Share PDF</button>
    ${r.status === 'completed' ? `<button class="btn sm" data-act="mail" data-id="${r.id}">Email</button>` : ''}
    <button class="btn sm ghost" data-act="del" data-id="${r.id}">Delete</button></div>`;
}
async function recAction(act, id) {
  const r = await DB.get('records', id); if (!r) return;
  if (act === 'open') location.hash = '#visit/' + id;
  if (act === 'share') await shareRecord(r);
  if (act === 'mail') { await queueMail(r); renderHome(); }
  if (act === 'del') {
    const ok = await modal('Delete this record?', `<p>${esc(recTitle(r))} — ${esc(fmtDate(r.date))}. This cannot be undone.</p>`, [{ label: 'Cancel', value: false, cls: 'ghost' }, { label: 'Delete', value: true, cls: 'red' }]);
    if (ok) { await DB.del('records', id); renderHome(); }
  }
}

/* ------------------------------------------------------------------ new visit */
function renderNew() {
  setTitle('New pole visit');
  const st = { site: '', kind: 'pm', quarter: 1, coat: null };
  const coatQs = String(SETTINGS.coatQuarters).split(/[ ,;]+/).map(Number).filter(Boolean);
  const draw = () => {
    const s = site(st.site);
    const auto = s ? (st.kind === 'interim' || s.regime === 'monthly' || (st.kind === 'pm' && coatQs.includes(+st.quarter))) : false;
    const coat = st.coat === null ? auto : st.coat;
    app.innerHTML = `<div class="wrap">
      <div class="card"><h2>1 · Select pole</h2><div class="in">
        ${[1, 2, 3].map(cm => `<p class="hint"><b>${CM_LABEL[cm]}</b></p><div class="poles">${SITES.filter(x => x.cm === cm).map(x =>
          `<button class="pole ${st.site === x.code ? 'sel' : ''}" data-site="${x.code}"><b>${x.code} · ${esc(x.name)}</b><div>${x.power} · ${x.anpr} ANPR + ${x.ov} overview · ${x.rfid} RFID${x.heater ? ' · heater' : ''}${x.regime === 'monthly' ? ' · recoat monthly' : ''}</div></button>`).join('')}</div>`).join('')}
      </div></div>
      <div class="card"><h2>2 · Visit type</h2><div class="in">
        <div class="seg" id="kind">${['pm', 'interim', 'emergency'].map(k => `<button data-k="${k}" class="${st.kind === k ? 'on' : ''}" ${k === 'interim' && s && s.regime !== 'monthly' ? 'disabled' : ''}>${KIND_LABEL[k]}</button>`).join('')}</div>
        ${st.kind === 'pm' ? `<p class="hint" style="margin-top:14px">Quarter (cycle)</p><div class="seg" id="q">${[1, 2, 3, 4].map(q => `<button data-q="${q}" class="${+st.quarter === q ? 'on' : ''}">Q${q}</button>`).join('')}</div>` : ''}
        ${st.kind === 'interim' ? '<p class="hint">Monthly lens clean & recoat at Swakopmund between quarterly visits.</p>' : ''}
        <p class="hint" style="margin-top:14px">Ceramic coating ${auto ? 'is due (every 2nd quarter / Swakopmund monthly)' : 'is not due'} — change if needed:</p>
        <div class="seg" id="coat"><button data-c="1" class="${coat ? 'on' : ''}">★ Coating due</button><button data-c="0" class="${!coat ? 'on' : ''}">Not due</button></div>
      </div></div>
      <div class="row" style="gap:12px"><a class="btn ghost" href="#">Cancel</a><button class="btn primary" id="go" ${s ? '' : 'disabled'}>Start visit record</button></div>
    </div>`;
    app.querySelectorAll('[data-site]').forEach(b => b.onclick = () => { st.site = b.dataset.site; if (st.kind === 'interim' && site(st.site).regime !== 'monthly') st.kind = 'pm'; st.coat = null; draw(); });
    app.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { st.kind = b.dataset.k; st.coat = null; draw(); });
    app.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { st.quarter = +b.dataset.q; st.coat = null; draw(); });
    app.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { st.coat = b.dataset.c === '1'; draw(); });
    $('#go').onclick = async () => {
      const rec = {
        id: uid(), kind: st.kind, site: st.site, quarter: st.kind === 'pm' ? st.quarter : null, coatDue: !!coat,
        date: today(), timeIn: nowTime(), timeOut: '', techs: [...SETTINGS.techs], vehicle: SETTINGS.lastVehicle || (SETTINGS.vehicles || [])[0] || '', odoStart: '', odoPole: '', officials: '', faultRef: '', gps: null,
        checks: {}, readings: {}, handhelds: [{}, {}], findings: { faults: '', parts: '', photos: '' }, photos: [], keyPhotos: {}, annex: [],
        sign: { lead: { name: SETTINGS.techs[0] || '', date: today() }, tech: { name: SETTINGS.techs[1] || '', date: today() }, cust: { name: '', date: today() } },
        stampMode: SETTINGS.stamp ? 'digital' : 'paper', stampPhoto: '', status: 'draft', mail: { state: 'none' }, createdAt: Date.now(), updatedAt: Date.now(),
      };
      await DB.put('records', rec);
      PROMPT_ARRIVAL = rec.id;
      location.hash = '#visit/' + rec.id;
      setTimeout(() => captureGPS(rec, true), 800);
    };
  };
  draw();
}

/* ------------------------------------------------------------------ GPS */
function captureGPS(rec, silent) {
  if (!navigator.geolocation) { if (!silent) toast('GPS not available on this device'); return; }
  navigator.geolocation.getCurrentPosition(async p => {
    const r = (CURRENT && CURRENT.id === rec.id) ? CURRENT : await DB.get('records', rec.id); if (!r) return;
    r.gps = { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6), acc: Math.round(p.coords.accuracy), at: Date.now() };
    r.updatedAt = Date.now(); await DB.put('records', r);
    const el = $('#gps'); if (el) el.textContent = gpsText(r.gps);
    if (!silent) toast('Location captured');
  }, e => { if (!silent) toast('Could not get location: ' + e.message); }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 });
}
const gpsText = g => g ? `${g.lat}, ${g.lng} (±${g.acc} m) at ${fmtDT(g.at)}` : 'Not captured yet';

/* ------------------------------------------------------------------ visit form */
let saveTimer = null, CURRENT = null, PROMPT_ARRIVAL = null, CAB_HINTED = {};
async function renderVisit(id) {
  const rec = await DB.get('records', id);
  if (!rec) { location.hash = ''; return; }
  CURRENT = rec;
  rec.keyPhotos = rec.keyPhotos || {}; rec.annex = rec.annex || [];
  if (rec.odometer && !rec.odoPole) { rec.odoPole = rec.odometer; delete rec.odometer; }
  if (rec.vehicle === undefined) rec.vehicle = '';
  const keySlot = (k, label, hint) => { const kp = rec.keyPhotos[k]; return `<div class="keyph ${kp ? 'has' : ''}" id="kp-${k}">
      <div class="kh"><b>📷 ${label}</b><span class="hint">${kp ? 'Taken ' + esc(fmtDT(kp.at)) : hint}</span></div>
      ${kp ? `<img src="${kp.data}" alt="${label}">` : ''}
      <div class="row" style="gap:8px;flex-wrap:wrap">${pickBtns('data-kp', k, kp ? 'Retake' : 'Take photo', { primary: !kp })}
      ${kp ? `<input class="kcap" data-kpc="${k}" placeholder="Caption (optional)" value="${esc(kp.caption || '')}"><button class="btn sm ghost" data-kpx="${k}">Remove</button>` : ''}</div></div>`; };
  const s = site(rec.site);
  setTitle(`${s.code} · ${rec.kind === 'pm' ? 'Q' + rec.quarter : KIND_LABEL[rec.kind]}`);
  const groups = checklistFor(rec); let n = 0;
  const save = (now) => { rec.updatedAt = Date.now(); clearTimeout(saveTimer); const f = () => DB.put('records', rec).then(updateBar); now ? f() : (saveTimer = setTimeout(f, 350)); };
  const sec = (key, title, body) => `<section class="card" id="s-${key}"><h2>${title}</h2><div class="in">${body}</div></section>`;
  const tf = (label, path, val, type = 'text', extra = '') => `<label class="f">${label}<input type="${type}" data-p="${path}" value="${esc(val)}" ${extra}></label>`;

  const details = `<div class="grid2">
      ${tf('Date', 'date', rec.date, 'date')}
      <div class="row">${tf('Time in', 'timeIn', rec.timeIn, 'time')}<button class="btn sm ghost" data-now="timeIn">Now</button></div>
      <div class="row">${tf('Time out', 'timeOut', rec.timeOut, 'time')}<button class="btn sm ghost" data-now="timeOut">Now</button></div>
      ${(() => { const vs = SETTINGS.vehicles || []; const list = rec.vehicle && !vs.includes(rec.vehicle) ? [rec.vehicle, ...vs] : vs;
        return `<label class="f">Company vehicle<select data-veh>${list.length ? '' : '<option value="">— add vehicles in Settings —</option>'}${list.length && !rec.vehicle ? '<option value="">Select vehicle…</option>' : ''}${list.map(v => `<option ${v === rec.vehicle ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>`; })()}
      ${tf('Odometer at trip start (km)', 'odoStart', rec.odoStart, 'text', 'inputmode="numeric" data-odo')}
      ${tf('Odometer at this pole (km)', 'odoPole', rec.odoPole, 'text', 'inputmode="numeric" data-odo')}
      <div class="tripkm" id="tripkm"></div>
      ${tf('Technician 1 (lead)', 'techs.0', rec.techs[0])}${tf('Technician 2', 'techs.1', rec.techs[1])}${tf('Technician 3', 'techs.2', rec.techs[2])}
      ${tf('Police / border official informed', 'officials', rec.officials)}
      ${rec.kind === 'emergency' ? tf('Fault reference / priority', 'faultRef', rec.faultRef) : ''}
    </div>
    <p class="hint" style="margin-top:12px"><b>Pole:</b> ${esc(s.code)} ${esc(s.name)} · ${esc(powerLabel(s))} · ${CM_LABEL[s.cm]}${s.gps ? ' · ' + esc(s.gps) : ''}</p>
    <p class="hint"><b>Visit:</b> ${esc(rec.kind === 'pm' ? 'Quarterly PM, Q' + rec.quarter : KIND_LABEL[rec.kind])} · ceramic coating ${rec.coatDue ? '<b style="color:var(--blue)">★ due</b>' : 'not due'}</p>
    <div class="row" style="align-items:center"><span class="hint" style="flex:1"><b>GPS:</b> <span id="gps">${esc(gpsText(rec.gps))}</span></span><button class="btn sm" id="gpsbtn">Capture location</button></div>
    <div style="margin-top:12px">${keySlot('arrival', 'Arrival photo', 'Required — pole and site as found on arrival, before any work')}</div>`;

  const isCab = t => /CABINET/.test(t);
  const checklist = groups.map(g => `<div class="grp">${esc(g.title)}</div>` + g.items.map(it => {
    n++; const c = rec.checks[it.id] || {};
    return `<div class="item" data-item="${it.id}" data-cab="${isCab(g.title) ? 1 : 0}"><span class="n">${n}</span><span class="tx ${it.star ? 'star' : ''}">${esc(it.text)}</span>
      <div class="ofn">${['ok', 'fault', 'na'].map(v => `<button class="${v} ${c.v === v ? 'on' : ''}" data-v="${v}">${{ ok: 'OK', fault: 'Fault', na: 'N/A' }[v]}</button>`).join('')}</div>
      <div class="rmk" ${c.v === 'fault' || c.r ? '' : 'hidden'}><input placeholder="Remarks / device ID${c.v === 'fault' ? ' (required for faults)' : ''}" data-rmk="${it.id}" value="${esc(c.r || '')}"></div></div>`;
  }).join('') + (isCab(g.title) ? `<div class="in" style="border-top:1px solid var(--tint)">${keySlot('cabinet', 'Cabinet interior photo', 'Required — open cabinet: power system, edge PC, Fortinet devices, wiring')}</div>` : '')).join('');

  const rd = readingsFor(rec);
  const readings = `<div class="grid2">${rd.map((l, i) => `<label class="f">${esc(l)}<input data-rd="${esc(l)}" value="${esc(rec.readings[l] || '')}" inputmode="${/\(Y\/N\)|status/.test(l) ? 'text' : 'decimal'}"></label>`).join('')}</div>`;

  const hh = rec.kind === 'interim' ? '' : `${rec.handhelds.map((h, i) => `<div class="card" style="box-shadow:none;border:1.5px solid var(--line)"><div class="in"><div class="grid2">
      <label class="f">Device ID<input data-hh="${i}.id" value="${esc(h.id || '')}"></label>
      <label class="f">Serial no.<input data-hh="${i}.serial" value="${esc(h.serial || '')}"></label>
      <label class="f">Battery %<input data-hh="${i}.batt" value="${esc(h.batt || '')}" inputmode="numeric"></label>
      <label class="f">App version<input data-hh="${i}.app" value="${esc(h.app || '')}"></label></div>
      <p class="hint">Condition</p><div class="seg">${['Good', 'Worn', 'Damaged'].map(c => `<button data-hhc="${i}" data-c="${c}" class="${h.cond === c ? 'on' : ''}">${c}</button>`).join('')}
      <button data-hhr="${i}" class="${h.rfid ? 'on' : ''}">RFID read OK</button></div></div></div>`).join('')}
      <button class="btn sm" id="addhh">＋ Add handheld</button>`;

  const findings = `<div class="grid2" style="grid-template-columns:1fr">
      <label class="f">Faults found / devices offline<textarea data-p="findings.faults">${esc(rec.findings.faults)}</textarea></label>
      <label class="f">Parts required / follow-up<textarea data-p="findings.parts">${esc(rec.findings.parts)}</textarea></label>
      ${rec.kind === 'interim' ? '' : `<label class="f">Photos taken (ref.)<input data-p="findings.photos" value="${esc(rec.findings.photos)}"></label>`}</div>`;

  const keyStatus = ['arrival', 'cabinet'].map(k => `<span class="chip ${rec.keyPhotos[k] ? 'done' : 'draft'}">${k === 'arrival' ? 'Arrival' : 'Cabinet interior'} ${rec.keyPhotos[k] ? '✓' : '— missing'}</span>`).join('');
  const photos = `<p>${keyStatus}</p><p class="hint">Add further photos of the pole, readings and faults. All photos are added to the PDF.</p>
      <div class="row" style="gap:8px;flex-wrap:wrap"><label class="btn sm primary" style="cursor:pointer">📷 Take photo<input type="file" accept="image/*" capture="environment" data-ph="1" hidden></label><label class="btn sm" style="cursor:pointer">🖼 Gallery (several)<input type="file" accept="image/*" data-ph="1" multiple hidden></label></div>
      <div class="photos" id="phs" style="margin-top:12px">${rec.photos.map(p => `<div class="photo"><img src="${p.data}" alt=""><input data-cap="${p.id}" placeholder="Caption" value="${esc(p.caption || '')}"><div class="x"><button class="btn sm ghost" data-delph="${p.id}">Remove</button></div></div>`).join('')}</div>`;

  const annexure = `<p class="hint">Upload ${MAX_ANNEX === 1 ? 'one image' : 'one or two images'} from the tablet gallery or Files — e.g. DJI drone thermal or aerial images transferred from the DJI RC by Bluetooth / USB beforehand. Each image becomes a full-page annexure in the PDF.</p>
      ${rec.annex.length < MAX_ANNEX ? `<label class="btn primary" style="cursor:pointer">📁 Upload annexure image<input type="file" id="anx" accept="image/*" ${MAX_ANNEX - rec.annex.length > 1 ? 'multiple' : ''} hidden></label>` : `<p class="hint"><b>Maximum of ${MAX_ANNEX} annexures reached</b> — remove one to replace it.</p>`}
      <div class="photos annex" style="margin-top:12px">${rec.annex.map((a, i) => `<div class="photo"><div class="anxlab">Annexure ${String.fromCharCode(65 + i)}</div><img src="${a.data}" alt="">
        <div class="seg" style="padding:8px">${['Thermal', 'Aerial / visual', 'Other'].map(t => `<button class="${a.type === t ? 'on' : ''}" data-anxt="${a.id}" data-t="${t}">${t}</button>`).join('')}</div>
        <input data-anxc="${a.id}" placeholder="Description (e.g. thermal scan of cabinet & panels)" value="${esc(a.caption || '')}">
        <div class="x"><span class="hint" style="flex:1;padding:6px">${esc(a.name || '')}</span><button class="btn sm ghost" data-anxx="${a.id}">Remove</button></div></div>`).join('')}</div>`;

  const signRole = (k, label) => `<div class="sigbox"><div class="hd"><span>${label}</span><span class="sigacts"><button class="btn sm ghost" data-undo="${k}">↶ Undo</button><button class="btn sm ghost" data-clr="${k}">Clear</button></span></div>
      <canvas class="sig" data-sig="${k}"></canvas>
      <div class="row" style="gap:8px;align-items:center;flex-wrap:wrap">${rec.sign[k].photo ? `<img class="sigph" src="${rec.sign[k].photo}" alt="">` : ''}
        ${pickBtns('data-sp', k, rec.sign[k].photo ? 'Retake picture of signature' : 'Take picture of signature')}
        ${rec.sign[k].photo ? `<button class="btn sm ghost" data-spx="${k}">Remove picture</button>` : '<span class="hint">Optional — e.g. a signature on a paper form</span>'}</div>
      <div class="grid2"><label class="f">Name<input data-sn="${k}" value="${esc(rec.sign[k].name || '')}"></label><label class="f">Date<input type="date" data-sd="${k}" value="${esc(rec.sign[k].date || today())}"></label></div></div>`;
  const signoff = `<div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">${signRole('lead', 'Mundial RND Technician (lead)')}${signRole('tech', 'Mundial RND Technician')}${signRole('cust', 'Customer (RFA / site official)')}</div>
      <p class="hint" style="margin-top:14px"><b>Company stamp</b></p>
      <div class="seg" id="stm">${[['digital', 'Digital company stamp'], ['photo', 'Photo of stamped paper'], ['paper', 'Stamp on printout']].map(([v, l]) => `<button data-stm="${v}" class="${rec.stampMode === v ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div id="stampArea" style="margin-top:10px">${stampArea(rec)}</div>`;

  app.innerHTML = `<nav class="jump">${[['details', 'Details'], ['check', 'Checklist'], ['read', 'Readings'], ...(rec.kind === 'interim' ? [] : [['hh', 'Handhelds']]), ['find', 'Findings'], ['photo', 'Photos'], ['annex', 'Annexures'], ['sign', 'Sign-off']].map(([k, l]) => `<a href="javascript:void 0" data-jump="${k}" id="j-${k}">${l}</a>`).join('')}</nav>
    <div class="wrap">
      <h1>${esc(recTitle(rec))}</h1>
      ${rec.status === 'completed' ? `<div class="okmsg">Completed ${esc(fmtDT(rec.completedAt))}. Editing will keep it completed — tap “Complete & send” again to re-send.</div>` : ''}
      ${sec('details', 'Visit details', details)}
      <section class="card" id="s-check"><h2>Maintenance checklist</h2>${checklist}</section>
      ${sec('read', 'Readings', readings)}
      ${rec.kind === 'interim' ? '' : sec('hh', 'Handheld RFID device(s) at this site', hh)}
      ${sec('find', 'Findings', findings)}
      ${sec('photo', `Photos (${rec.photos.length + Object.keys(rec.keyPhotos).length})`, photos)}
      ${sec('annex', `Annexures — drone / thermal images (${rec.annex.length}/${MAX_ANNEX})`, annexure)}
      ${sec('sign', 'Sign-off', signoff)}
    </div>
    <div class="bar"><div class="prog" id="prog"></div>
      <a class="btn ghost" href="#">Home</a>
      <button class="btn" id="pdfbtn">Share PDF</button>
      <button class="btn primary" id="donebtn">Complete &amp; send</button></div>`;

  /* --- bindings */
  app.querySelectorAll('[data-jump]').forEach(a => a.onclick = () => { const el = $('#s-' + a.dataset.jump); window.scrollTo({ top: el.offsetTop - 120, behavior: 'smooth' }); });
  app.querySelectorAll('[data-p]').forEach(inp => inp.oninput = () => { setPath(rec, inp.dataset.p, inp.value); save(); });
  app.querySelectorAll('[data-now]').forEach(b => b.onclick = () => { const k = b.dataset.now; rec[k] = nowTime(); $(`[data-p="${k}"]`).value = rec[k]; save(true); });
  $('#gpsbtn').onclick = () => { save(true); captureGPS(rec, false); };
  app.querySelectorAll('.item').forEach(row => {
    const iid = row.dataset.item;
    row.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
      const c = rec.checks[iid] || (rec.checks[iid] = {});
      c.v = c.v === b.dataset.v ? '' : b.dataset.v;
      row.querySelectorAll('[data-v]').forEach(x => x.classList.toggle('on', x.dataset.v === c.v));
      const rm = row.querySelector('.rmk'); rm.hidden = !(c.v === 'fault' || c.r);
      if (c.v === 'fault') { const i = rm.querySelector('input'); i.placeholder = 'Remarks / device ID (required for faults)'; i.focus(); }
      if (row.dataset.cab === '1' && !rec.keyPhotos.cabinet && !CAB_HINTED[rec.id]) {
        CAB_HINTED[rec.id] = true;
        modal('Cabinet interior photo', '<p>Cabinet is open — take the interior photo now (power system, edge PC, Fortinet devices, wiring)?</p>', [{ label: 'Later', value: false, cls: 'ghost' }, { label: '📷 Take photo', value: true, cls: 'primary' }])
          .then(ok => { if (ok) $('[data-kp="cabinet"]').click(); });
      }
      save(true);
    });
  });
  app.querySelectorAll('[data-rmk]').forEach(i => i.oninput = () => { (rec.checks[i.dataset.rmk] || (rec.checks[i.dataset.rmk] = {})).r = i.value; save(); });
  app.querySelectorAll('[data-rd]').forEach(i => i.oninput = () => { rec.readings[i.dataset.rd] = i.value; save(); });
  app.querySelectorAll('[data-hh]').forEach(i => i.oninput = () => { const [k, f] = i.dataset.hh.split('.'); rec.handhelds[+k][f] = i.value; save(); });
  app.querySelectorAll('[data-hhc]').forEach(b => b.onclick = () => { const h = rec.handhelds[+b.dataset.hhc]; h.cond = h.cond === b.dataset.c ? '' : b.dataset.c; save(true); renderVisitKeep(rec.id, 's-hh'); });
  app.querySelectorAll('[data-hhr]').forEach(b => b.onclick = () => { const h = rec.handhelds[+b.dataset.hhr]; h.rfid = !h.rfid; b.classList.toggle('on', h.rfid); save(true); });
  const addhh = $('#addhh'); if (addhh) addhh.onclick = () => { rec.handhelds.push({}); save(true); renderVisitKeep(rec.id, 's-hh'); };
  app.querySelectorAll('[data-ph]').forEach(i => i.onchange = async e => {
    const files = [...e.target.files]; if (!files.length) return;
    toast(`Adding ${files.length} photo(s)…`);
    for (const f of files) { try { rec.photos.push({ id: uid(), data: await compressImage(f), caption: '', at: Date.now() }); } catch (err) { toast('Could not read a photo'); } }
    save(true); renderVisitKeep(rec.id, 's-photo');
  });
  app.querySelectorAll('[data-cap]').forEach(i => i.oninput = () => { const p = rec.photos.find(x => x.id === i.dataset.cap); if (p) { p.caption = i.value; save(); } });
  app.querySelectorAll('[data-delph]').forEach(b => b.onclick = () => { rec.photos = rec.photos.filter(x => x.id !== b.dataset.delph); save(true); renderVisitKeep(rec.id, 's-photo'); });
  const veh = $('[data-veh]'); if (veh) veh.onchange = async () => { rec.vehicle = veh.value; save(true); if (veh.value) { SETTINGS.lastVehicle = veh.value; saveSettings(); } };
  const showTrip = () => { const t = tripKm(rec), el = $('#tripkm'); if (!el) return; el.className = 'tripkm' + (t && t.err ? ' bad' : t ? ' ok' : ''); el.innerHTML = !t ? 'Total trip distance: enter both odometer readings' : t.err ? '⚠ ' + esc(t.err) : `Total trip distance <b>${t.total.toLocaleString('en-GB')} km</b> <span>(one way ${t.one.toLocaleString('en-GB')} km × 2)</span>`; };
  app.querySelectorAll('[data-odo]').forEach(i => i.addEventListener('input', showTrip)); showTrip();
  app.querySelectorAll('[data-kp]').forEach(i => i.onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    rec.keyPhotos[i.dataset.kp] = { data: await compressImage(f), at: Date.now(), caption: (rec.keyPhotos[i.dataset.kp] || {}).caption || '' };
    save(true); renderVisitKeep(rec.id); toast(i.dataset.kp === 'arrival' ? 'Arrival photo saved' : 'Cabinet interior photo saved');
  });
  app.querySelectorAll('[data-kpc]').forEach(i => i.oninput = () => { rec.keyPhotos[i.dataset.kpc].caption = i.value; save(); });
  app.querySelectorAll('[data-kpx]').forEach(b => b.onclick = () => { delete rec.keyPhotos[b.dataset.kpx]; save(true); renderVisitKeep(rec.id); });
  const anx = $('#anx'); if (anx) anx.onchange = async e => {
    const files = [...e.target.files].slice(0, MAX_ANNEX - rec.annex.length); if (!files.length) return;
    if (e.target.files.length > files.length) toast(`Only ${MAX_ANNEX} annexures allowed — extra images skipped`);
    toast('Adding annexure image(s)…', 1500);
    for (const f of files) { try { rec.annex.push({ id: uid(), data: await compressImage(f, 2200, 0.88), name: f.name, type: /_[WZV]\.|_[WZV]_|visual|wide|zoom/i.test(f.name) ? 'Aerial / visual' : 'Thermal', caption: '', at: f.lastModified || Date.now() }); } catch (err) { toast('Could not read ' + f.name); } }
    save(true); renderVisitKeep(rec.id);
  };
  app.querySelectorAll('[data-anxt]').forEach(b => b.onclick = () => { const a = rec.annex.find(x => x.id === b.dataset.anxt); a.type = b.dataset.t; save(true); renderVisitKeep(rec.id); });
  app.querySelectorAll('[data-anxc]').forEach(i => i.oninput = () => { const a = rec.annex.find(x => x.id === i.dataset.anxc); if (a) { a.caption = i.value; save(); } });
  app.querySelectorAll('[data-anxx]').forEach(b => b.onclick = () => { rec.annex = rec.annex.filter(x => x.id !== b.dataset.anxx); save(true); renderVisitKeep(rec.id); });
  app.querySelectorAll('[data-sp]').forEach(i => i.onchange = async e => { const f = e.target.files[0]; if (!f) return; rec.sign[i.dataset.sp].photo = await compressImage(f, 1000, 0.75); save(true); renderVisitKeep(rec.id); });
  app.querySelectorAll('[data-spx]').forEach(b => b.onclick = () => { rec.sign[b.dataset.spx].photo = ''; save(true); renderVisitKeep(rec.id); });
  const pads = {};
  app.querySelectorAll('canvas[data-sig]').forEach(c => { pads[c.dataset.sig] = sigPad(c, rec.sign[c.dataset.sig], () => save(true)); });
  app.querySelectorAll('[data-undo]').forEach(b => b.onclick = () => { if (!pads[b.dataset.undo].undo()) toast('Nothing to undo'); });
  app.querySelectorAll('[data-clr]').forEach(b => b.onclick = () => pads[b.dataset.clr].clear());
  app.querySelectorAll('[data-sn]').forEach(i => i.oninput = () => { rec.sign[i.dataset.sn].name = i.value; save(); });
  app.querySelectorAll('[data-sd]').forEach(i => i.oninput = () => { rec.sign[i.dataset.sd].date = i.value; save(); });
  app.querySelectorAll('[data-stm]').forEach(b => b.onclick = () => { rec.stampMode = b.dataset.stm; save(true); renderVisitKeep(rec.id, 's-sign'); });
  bindStampArea(rec, save);
  $('#pdfbtn').onclick = async () => { await DB.put('records', rec); shareRecord(rec); };
  $('#donebtn').onclick = () => completeVisit(rec);
  function updateBar() {
    const p = progress(rec);
    const kp = ['arrival', 'cabinet'].filter(k => rec.keyPhotos[k]).length;
    $('#prog').innerHTML = `Checklist ${p.done}/${p.items} · signatures ${p.sigs}/3 · key photos ${kp}/2 · ${rec.photos.length} photo(s) · ${rec.annex.length} annexure(s)<div class="meter"><i style="width:${p.pct}%"></i></div>`;
    const doneC = p.done === p.items; const j = $('#j-check'); if (j) j.classList.toggle('done', doneC);
    const js = $('#j-sign'); if (js) js.classList.toggle('done', p.sigs === 3);
  }
  updateBar();
  if (PROMPT_ARRIVAL === rec.id && !rec.keyPhotos.arrival) {
    PROMPT_ARRIVAL = null;
    modal('Arrival photo', `<p>Take the arrival photo of ${esc(s.code)} ${esc(s.name)} now — pole and site as found, before any work starts.</p>`, [{ label: 'Later', value: false, cls: 'ghost' }, { label: '📷 Take arrival photo', value: true, cls: 'primary' }])
      .then(ok => { if (ok) $('[data-kp="arrival"]').click(); });
  }
}
async function renderVisitKeep(id, anchor) {
  const y = window.scrollY; await renderVisit(id); window.scrollTo(0, y);
}
function setPath(obj, path, val) { const ks = path.split('.'); let o = obj; ks.slice(0, -1).forEach(k => o = o[k]); o[ks[ks.length - 1]] = val; }
function stampArea(rec) {
  if (rec.stampMode === 'digital') return SETTINGS.stamp ? `<img class="stamp-prev" src="${SETTINGS.stamp}" alt="Company stamp"><p class="hint">The digital stamp from Settings is placed in the stamp box of the PDF.</p>` : `<div class="warn">No digital stamp saved yet — add one in <a href="#settings">Settings</a>, or choose another option.</div>`;
  if (rec.stampMode === 'photo') return `${rec.stampPhoto ? `<img class="stamp-prev" src="${rec.stampPhoto}" alt="Stamp photo">` : ''}<div class="row" style="gap:8px;margin-top:6px;flex-wrap:wrap">${pickBtns('data-stph', '1', (rec.stampPhoto ? 'Retake' : 'Take') + ' photo of stamp')}</div>`;
  return `<p class="hint">The stamp box is left empty on the PDF for a physical stamp on the printout.</p>`;
}
function bindStampArea(rec, save) {
  app.querySelectorAll('[data-stph]').forEach(i => i.onchange = async e => { const f = e.target.files[0]; if (!f) return; rec.stampPhoto = await compressImage(f, 900, 0.8); save(true); renderVisitKeep(rec.id, 's-sign'); });
}

/* ------------------------------------------------------------------ signature pad */
function sigPad(canvas, so, onChange) {
  // so = rec.sign[role]; strokes are kept (normalised 0–1) so Undo can remove the last stroke
  const ratio = Math.max(window.devicePixelRatio || 1, 1), ctx = canvas.getContext('2d');
  so.strokes = so.strokes || [];
  let W = 1, H = 1, base = null, cur = null;
  if (so.sig && !so.strokes.length) { base = new Image(); base.onload = redraw; base.src = so.sig; } // older records: signature image only
  function style() { ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0b2a5b'; }
  function fit() { const r = canvas.getBoundingClientRect(); W = r.width || 300; H = r.height || 170; canvas.width = W * ratio; canvas.height = H * ratio; ctx.setTransform(ratio, 0, 0, ratio, 0, 0); style(); redraw(); }
  function redraw() {
    ctx.clearRect(0, 0, W, H);
    if (base && base.complete && base.naturalWidth) ctx.drawImage(base, 0, 0, W, H);
    for (const st of so.strokes) {
      ctx.beginPath(); st.forEach(([x, y], i) => i ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H));
      if (st.length === 1) ctx.lineTo(st[0][0] * W + 0.5, st[0][1] * H + 0.5);
      ctx.stroke();
    }
  }
  function commit() { so.sig = (so.strokes.length || base) ? canvas.toDataURL('image/png') : ''; onChange(); }
  const pos = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / W, (e.clientY - r.top) / H]; };
  canvas.addEventListener('pointerdown', e => { cur = [pos(e)]; so.strokes.push(cur); canvas.setPointerCapture(e.pointerId); e.preventDefault(); });
  canvas.addEventListener('pointermove', e => {
    if (!cur) return; const p = pos(e), l = cur[cur.length - 1];
    ctx.beginPath(); ctx.moveTo(l[0] * W, l[1] * H); ctx.lineTo(p[0] * W, p[1] * H); ctx.stroke();
    cur.push([+p[0].toFixed(4), +p[1].toFixed(4)]); e.preventDefault();
  });
  const end = () => { if (!cur) return; if (cur.length === 1) redraw(); cur = null; commit(); };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end); canvas.addEventListener('pointerleave', end);
  fit();
  return {
    undo() { if (so.strokes.length) { so.strokes.pop(); redraw(); commit(); return true; } if (base) { base = null; redraw(); commit(); return true; } return false; },
    clear() { so.strokes = []; base = null; redraw(); commit(); },
  };
}

/* ------------------------------------------------------------------ complete & send */
async function completeVisit(rec) {
  const p = progress(rec);
  const faultsNoRemark = allItems(rec).filter(i => rec.checks[i.id] && rec.checks[i.id].v === 'fault' && !(rec.checks[i.id].r || '').trim()).length;
  const probs = [];
  if (p.done < p.items) probs.push(`${p.items - p.done} checklist item(s) not answered`);
  if (faultsNoRemark) probs.push(`${faultsNoRemark} fault(s) without a remark / device ID`);
  if (!rec.keyPhotos || !rec.keyPhotos.arrival) probs.push('arrival photo missing');
  if (!rec.keyPhotos || !rec.keyPhotos.cabinet) probs.push('cabinet interior photo missing');
  if (!rec.sign.lead.sig && !rec.sign.lead.photo) probs.push('lead technician has not signed');
  if (!rec.sign.cust.sig && !rec.sign.cust.photo) probs.push('customer has not signed');
  if (!rec.timeOut) { rec.timeOut = nowTime(); }
  if (probs.length) {
    const go = await modal('Not quite complete', `<p>${probs.map(esc).join('<br>')}</p><p class="hint">Complete anyway?</p>`, [{ label: 'Go back', value: false, cls: 'ghost' }, { label: 'Complete anyway', value: true, cls: 'primary' }]);
    if (!go) return;
  }
  rec.status = 'completed'; rec.completedAt = Date.now(); rec.updatedAt = Date.now();
  await DB.put('records', rec);
  const canMail = SETTINGS.email && SETTINGS.scriptUrl;
  const choice = await modal('Visit completed', `<p>${esc(recTitle(rec))}</p><p class="hint">${canMail ? `Email the PDF to <b>${esc(SETTINGS.email)}</b>${navigator.onLine ? '' : ' (offline — it will wait in the outbox and send automatically)'}, or share it from the tablet.` : 'Email is not set up in Settings yet — share the PDF from the tablet (Gmail, Outlook, WhatsApp…).'}</p>`,
    [{ label: 'Share PDF…', value: 'share' }, ...(canMail ? [{ label: 'Email PDF', value: 'mail', cls: 'primary' }] : []), { label: 'Close', value: 'close', cls: 'ghost' }]);
  if (choice === 'mail') await queueMail(rec);
  if (choice === 'share') await shareRecord(rec);
  location.hash = '';
}

/* ------------------------------------------------------------------ PDF */
let LOGO = null, WM = null;
async function loadAssets() { if (!LOGO) LOGO = await urlToDataURL('assets/logo.png'); if (!WM) WM = await urlToDataURL('assets/watermark.png'); }
const T = s => String(s ?? '').replace(/★/g, '*').replace(/→/g, '->').replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/＋/g, '+').replace(/[^\x00-\xFF—–·°×±€]/g, '');
function newDoc() { return new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true }); }
const M = { l: 14, r: 14, t: 26, b: 18 };
function frame(doc, headerLeft) {
  const n = doc.getNumberOfPages(), W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.addImage(WM, 'PNG', (W - 150) / 2, (H - 62.5) / 2, 150, 62.5, 'wm', 'FAST');
    doc.addImage(LOGO, 'PNG', M.l, 7, 30, 12.5, 'logo', 'FAST');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED);
    doc.text(T(headerLeft), W - M.r, 11, { align: 'right' });
    doc.text(BOOK_REF, W - M.r, 15.5, { align: 'right' });
    doc.setDrawColor(...RED); doc.setLineWidth(0.6); doc.line(M.l, 21, W - M.r, 21);
    doc.setLineWidth(0.4); doc.line(M.l, H - 13, W - M.r, H - 13);
    doc.setFontSize(7.5);
    doc.text(T(`Confidential — Mundial Technologies  |  RFA MDC Compliance Monitoring  |  Page ${i} of ${n}`), W / 2, H - 8.5, { align: 'center' });
  }
}
function titleBlock(doc, title, y) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...BLUE);
  const lines = doc.splitTextToSize(T(title), W - M.l - M.r); doc.text(lines, M.l, y + 5);
  const yy = y + 5 + (lines.length - 1) * 6 + 3; doc.setDrawColor(...RED); doc.setLineWidth(0.5); doc.line(M.l, yy, W - M.r, yy);
  return yy + 4;
}
function sectionHead(doc, text, y) {
  const H = doc.internal.pageSize.getHeight();
  if (y > H - M.b - 25) { doc.addPage(); y = M.t + 2; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...BLUE); doc.text(T(text), M.l, y + 4); return y + 6.5;
}
const baseTable = { margin: { left: M.l, right: M.r, top: M.t + 2, bottom: M.b }, styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.8, textColor: INK, lineColor: LINE, lineWidth: 0.2, overflow: 'linebreak', valign: 'middle' }, headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold' }, theme: 'grid' };
const lab = t => ({ content: T(t), styles: { fillColor: TINT, textColor: BLUE, fontStyle: 'bold' } });

async function buildVisitPDF(rec) {
  await loadAssets();
  const doc = newDoc(), s = site(rec.site), W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  let y = titleBlock(doc, recTitle(rec), M.t);
  const body = [
    [lab('Date'), T(fmtDate(rec.date)), lab('Visit type'), T((rec.kind === 'pm' ? 'Quarterly PM' : KIND_LABEL[rec.kind]) + (rec.coatDue ? ' + ceramic coating' : ''))],
    [lab('Time in'), T(rec.timeIn), lab('Time out'), T(rec.timeOut)],
    [lab('Power'), T(powerLabel(s)), lab('Schedule'), T(CM_LABEL[s.cm] + (rec.quarter ? ` · Q${rec.quarter}` : ''))],
    [lab('Technicians'), T(rec.techs.filter(Boolean).join(', ')), lab('Vehicle'), T(rec.vehicle || '')],
    [lab('Odometer trip start'), T(rec.odoStart ? rec.odoStart + ' km' : ''), lab('Odometer at pole'), T(rec.odoPole ? rec.odoPole + ' km' : '')],
    [lab('Total trip distance'), { content: T(tripText(rec)), colSpan: 3, styles: { fontStyle: 'bold', textColor: BLUE } }],
    [lab('Officials informed'), T(rec.officials), lab('GPS'), T(rec.gps ? `${rec.gps.lat}, ${rec.gps.lng} (±${rec.gps.acc} m)` : (s.gps || ''))],
  ];
  if (rec.kind === 'emergency') body.push([lab('Fault ref. / priority'), { content: T(rec.faultRef), colSpan: 3 }]);
  doc.autoTable({ ...baseTable, startY: y, body, columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 61 }, 2: { cellWidth: 25 } } });
  y = doc.lastAutoTable.finalY + 5;

  // checklist
  const groups = checklistFor(rec); const rows = [], meta = []; let n = 0;
  groups.forEach(g => {
    rows.push([{ content: T(g.title), colSpan: 6, styles: { fillColor: TINT, textColor: BLUE, fontStyle: 'bold', fontSize: 7.5, halign: 'left', cellPadding: 1.1 } }]); meta.push(null);
    g.items.forEach(it => { n++; const c = rec.checks[it.id] || {}; rows.push([String(n), { content: T(it.text), styles: it.star ? { fontStyle: 'bold', textColor: BLUE } : {} }, '', '', '', T(c.r || '')]); meta.push(c.v || ''); });
  });
  doc.autoTable({
    ...baseTable, startY: y, head: [['#', 'Maintenance checklist', 'OK', 'Fault', 'N/A', 'Remarks / device']], body: rows,
    styles: { ...baseTable.styles, fontSize: 8, cellPadding: 1.45 }, rowPageBreak: 'avoid',
    columnStyles: { 0: { cellWidth: 8, halign: 'center', textColor: MUTED }, 1: { cellWidth: 92 }, 2: { cellWidth: 12 }, 3: { cellWidth: 12 }, 4: { cellWidth: 12 } },
    headStyles: { ...baseTable.headStyles, halign: 'left' },
    didDrawCell: d => {
      if (d.section !== 'body' || d.column.index < 2 || d.column.index > 4) return;
      const v = meta[d.row.index]; if (v === null || v === undefined) return;
      const want = ['ok', 'fault', 'na'][d.column.index - 2];
      const bx = d.cell.x + d.cell.width / 2 - 1.9, by = d.cell.y + d.cell.height / 2 - 1.9, sz = 3.8;
      doc.setLineWidth(0.25); doc.setDrawColor(...BLUE);
      if (v === want) {
        const col = want === 'ok' ? [29, 127, 59] : want === 'fault' ? RED : [125, 133, 151];
        doc.setFillColor(...col); doc.rect(bx, by, sz, sz, 'F'); doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.6);
        if (want === 'ok') { doc.line(bx + 0.8, by + 2, bx + 1.6, by + 2.9); doc.line(bx + 1.6, by + 2.9, bx + 3.1, by + 0.9); }
        else if (want === 'fault') { doc.line(bx + 0.9, by + 0.9, bx + 2.9, by + 2.9); doc.line(bx + 2.9, by + 0.9, bx + 0.9, by + 2.9); }
        else { doc.line(bx + 0.8, by + 1.9, bx + 3, by + 1.9); }
      } else doc.rect(bx, by, sz, sz);
    },
  });
  y = doc.lastAutoTable.finalY + 5;

  // readings
  y = sectionHead(doc, 'Readings', y);
  const rd = readingsFor(rec), half = Math.ceil(rd.length / 2), rrows = [];
  for (let i = 0; i < half; i++) rrows.push([T(rd[i]), T(rec.readings[rd[i]] || ''), T(rd[i + half] || ''), T(rd[i + half] ? rec.readings[rd[i + half]] || '' : '')]);
  doc.autoTable({ ...baseTable, startY: y, head: [['Reading', 'Value', 'Reading', 'Value']], body: rrows, columnStyles: { 0: { cellWidth: 56 }, 1: { cellWidth: 35 }, 2: { cellWidth: 56 } } });
  y = doc.lastAutoTable.finalY + 5;

  // handhelds
  if (rec.kind !== 'interim') {
    y = sectionHead(doc, 'Handheld RFID device(s) at this site', y);
    const hrows = rec.handhelds.filter(h => Object.values(h).some(Boolean)).map(h => [T(h.id), T(h.serial), T(h.cond || ''), T(h.batt), h.rfid ? 'OK' : '', T(h.app)]);
    if (!hrows.length) hrows.push(['', '', '', '', '', '']);
    doc.autoTable({ ...baseTable, startY: y, head: [['Device ID', 'Serial no.', 'Condition', 'Battery %', 'RFID read', 'App version']], body: hrows });
    y = doc.lastAutoTable.finalY + 5;
  }
  // findings
  y = sectionHead(doc, 'Findings', y);
  const frows = [[lab('Faults found / devices offline'), T(rec.findings.faults)], [lab('Parts required / follow-up'), T(rec.findings.parts)]];
  if (rec.kind !== 'interim') frows.push([lab('Photos taken (ref.)'), T(rec.findings.photos || photoSummary(rec))]);
  doc.autoTable({ ...baseTable, startY: y, body: frows, columnStyles: { 0: { cellWidth: 52 } }, bodyStyles: { minCellHeight: 9 } });
  y = doc.lastAutoTable.finalY + 6;

  // sign-off block (needs ~62 mm)
  if (y > H - M.b - 64) { doc.addPage(); y = M.t + 2; }
  y = sectionHead(doc, 'Sign-off', y);
  const stampW = 50, stampH = 52;
  doc.setDrawColor(...BLUE); doc.setLineWidth(0.4); doc.rect(M.l, y, stampW, stampH);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...BLUE); doc.text('COMPANY STAMP', M.l + stampW / 2, y + 4, { align: 'center' });
  const stampImg = rec.stampMode === 'digital' ? SETTINGS.stamp : rec.stampMode === 'photo' ? rec.stampPhoto : '';
  if (stampImg) { const sz = await imgSize(stampImg); const k = Math.min((stampW - 6) / sz.w, (stampH - 10) / sz.h); const w = sz.w * k, h = sz.h * k; doc.addImage(stampImg, stampImg.startsWith('data:image/png') ? 'PNG' : 'JPEG', M.l + (stampW - w) / 2, y + 7 + (stampH - 10 - h) / 2, w, h); }
  const roles = [['lead', 'Mundial RND Technician (lead)'], ['tech', 'Mundial RND Technician'], ['cust', 'Customer (RFA / site official)']];
  const sigs = roles.map(([k]) => rec.sign[k].sig || '');
  const sphs = roles.map(([k]) => rec.sign[k].photo || '');
  const sphSz = await Promise.all(sphs.map(x => x ? imgSize(x) : null));
  doc.autoTable({
    ...baseTable, startY: y, margin: { ...baseTable.margin, left: M.l + stampW + 3 }, tableWidth: W - M.l - M.r - stampW - 3,
    head: [['Sign-off', 'Name', 'Signature', 'Sig. picture', 'Date']],
    body: roles.map(([k, l]) => [lab(l), T(rec.sign[k].name || ''), '', '', T(fmtDate(rec.sign[k].date))]),
    columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 27 }, 2: { cellWidth: 37 }, 3: { cellWidth: 19 } }, bodyStyles: { minCellHeight: 15 },
    didDrawCell: d => {
      if (d.section !== 'body') return;
      if (d.column.index === 2 && sigs[d.row.index]) doc.addImage(sigs[d.row.index], 'PNG', d.cell.x + 1, d.cell.y + 1, d.cell.width - 2, d.cell.height - 2);
      if (d.column.index === 3 && sphs[d.row.index]) { const z = sphSz[d.row.index]; const k = Math.min((d.cell.width - 2) / z.w, (d.cell.height - 2) / z.h); doc.addImage(sphs[d.row.index], 'JPEG', d.cell.x + (d.cell.width - z.w * k) / 2, d.cell.y + (d.cell.height - z.h * k) / 2, z.w * k, z.h * k); }
    },
  });
  y = Math.max(doc.lastAutoTable.finalY, y + stampH) + 4;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...MUTED);
  doc.text(T(`Record ${rec.id} · created ${fmtDT(rec.createdAt)} · ${rec.status === 'completed' ? 'completed ' + fmtDT(rec.completedAt) : 'DRAFT'} · Mundial Field Log Book v${APP_VERSION}`), M.l, Math.min(y, H - M.b));

  // photos (key photos first)
  const kp = rec.keyPhotos || {};
  const allPh = [...(kp.arrival ? [{ ...kp.arrival, label: 'Arrival' }] : []), ...(kp.cabinet ? [{ ...kp.cabinet, label: 'Cabinet interior' }] : []),
    ...rec.photos.map((p, i) => ({ ...p, label: `Photo ${i + 1}` }))];
  if (allPh.length) {
    doc.addPage(); y = titleBlock(doc, `Photos — ${s.code} ${s.name}`, M.t);
    const colW = (W - M.l - M.r - 6) / 2; let col = 0;
    for (const p of allPh) {
      const sz = await imgSize(p.data); const k = Math.min(colW / sz.w, 78 / sz.h); const w = sz.w * k, h = sz.h * k;
      if (col === 0 && y + h + 10 > H - M.b) { doc.addPage(); y = M.t + 2; }
      const x = M.l + col * (colW + 6);
      doc.addImage(p.data, 'JPEG', x, y, w, h);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...INK);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLUE); doc.text(T(p.label), x, y + h + 4);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...INK);
      doc.text(doc.splitTextToSize(T((p.caption ? p.caption + '  ·  ' : '') + fmtDT(p.at)), colW - doc.getTextWidth(T(p.label)) - 3), x + doc.getTextWidth(T(p.label)) + 3, y + h + 4);
      if (col === 1) { y += 90; col = 0; } else col = 1;
    }
  }
  // annexures — one full page each
  (rec.annex || []).forEach((a, i) => { a._i = i; });
  for (const a of rec.annex || []) {
    doc.addPage(); const L = String.fromCharCode(65 + a._i);
    y = titleBlock(doc, `Annexure ${L} — ${a.type || 'Image'} image · ${s.code} ${s.name}`, M.t);
    const sz = await imgSize(a.data); const maxW = W - M.l - M.r, maxH = H - M.b - y - 22;
    const k = Math.min(maxW / sz.w, maxH / sz.h); const w = sz.w * k, h = sz.h * k;
    doc.setDrawColor(...LINE); doc.setLineWidth(0.3); doc.rect(M.l + (maxW - w) / 2 - 0.5, y + 1.5, w + 1, h + 1);
    doc.addImage(a.data, 'JPEG', M.l + (maxW - w) / 2, y + 2, w, h);
    let ty = y + h + 8;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...BLUE); doc.text(T(`Annexure ${L}: ${a.caption || (a.type || 'Image') + ' image'}`), M.l, ty);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED);
    doc.text(T(`Source file: ${a.name || '—'} · image date ${fmtDT(a.at)} · uploaded to the field log book (e.g. DJI drone imagery)`), M.l, ty + 5);
  }
  frame(doc, 'RFA MDC — Compliance Monitoring Solution Log Book');
  return doc;
}
function photoSummary(rec) {
  const kp = rec.keyPhotos || {}; const parts = [];
  if (kp.arrival) parts.push('arrival'); if (kp.cabinet) parts.push('cabinet interior');
  const n = parts.length + rec.photos.length; const a = (rec.annex || []).length;
  return (n ? `${n} photo(s) in this report${parts.length ? ' incl. ' + parts.join(' & ') : ''}` : '') + (a ? `${n ? '; ' : ''}${a} annexure image(s) (${(rec.annex || []).map((x, i) => String.fromCharCode(65 + i) + ': ' + (x.type || 'image')).join(', ')})` : '');
}
const pdfName = rec => `Mundial_RFA_${site(rec.site).code}_${rec.kind === 'pm' ? 'Q' + rec.quarter : rec.kind}_${rec.date}.pdf`;
const mailSubject = rec => `Mundial RFA log book — ${site(rec.site).code} ${site(rec.site).name} — ${rec.kind === 'pm' ? 'Q' + rec.quarter + ' PM' : KIND_LABEL[rec.kind]} — ${fmtDate(rec.date)}`;

async function sharePdf(doc, filename, title) {
  const blob = doc.output('blob'); const file = new File([blob], filename, { type: 'application/pdf' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title, text: title }); return; }
  } catch (e) { if (e.name === 'AbortError') return; console.warn(e); }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
  toast('PDF saved to Downloads — attach it to an email.');
}
async function shareRecord(rec) { toast('Creating PDF…', 1500); const doc = await buildVisitPDF(rec); await sharePdf(doc, pdfName(rec), mailSubject(rec)); }

/* ------------------------------------------------------------------ email outbox */
async function queueMail(rec) {
  if (!SETTINGS.email || !SETTINGS.scriptUrl) { toast('Set your email and mailer link in Settings first'); return; }
  rec.mail = { state: 'queued', at: Date.now() }; rec.updatedAt = Date.now(); await DB.put('records', rec);
  if (navigator.onLine) await processOutbox(true); else toast('Offline — report saved in the outbox, it will send when online');
}
let sending = false;
async function processOutbox(verbose) {
  if (sending || !navigator.onLine || !SETTINGS.scriptUrl) return; sending = true;
  let sent = 0, failed = 0;
  try {
    const recs = (await DB.all('records')).filter(r => r.mail && r.mail.state === 'queued');
    const incQ = await DB.get('kv', 'incidentMail');
    for (const r of recs) {
      try {
        const doc = await buildVisitPDF(r);
        await postMail({ subject: mailSubject(r), filename: pdfName(r), pdf: doc.output('datauristring').split(',')[1], body: mailBody(r) });
        r.mail = { state: 'sent', at: Date.now() }; sent++;
      } catch (e) { r.mail = { state: 'queued', at: r.mail.at, err: String(e.message || e) }; failed++; }
      await DB.put('records', r);
    }
    if (incQ && incQ.v === 'queued') {
      try { const doc = await buildIncidentPDF(); await postMail({ subject: 'Mundial RFA log book — Incident Register — ' + fmtDate(today()), filename: `Mundial_RFA_Incident_Register_${today()}.pdf`, pdf: doc.output('datauristring').split(',')[1], body: 'Incident register attached.' }); await DB.put('kv', { k: 'incidentMail', v: 'sent' }); sent++; }
      catch (e) { failed++; }
    }
  } finally { sending = false; }
  if (verbose || sent) toast(failed ? `${sent} sent, ${failed} still waiting (${navigator.onLine ? 'mailer error — check Settings' : 'offline'})` : sent ? `${sent} report(s) emailed to ${SETTINGS.email}` : 'Nothing waiting in the outbox');
  if (location.hash === '' || location.hash === '#') renderHome();
}
function mailBody(r) {
  const s = site(r.site), p = progress(r);
  const faults = allItems(r).filter(i => r.checks[i.id] && r.checks[i.id].v === 'fault').map(i => `- ${i.text}${r.checks[i.id].r ? ' — ' + r.checks[i.id].r : ''}`);
  return `${recTitle(r)}\nDate: ${fmtDate(r.date)}  ${r.timeIn}–${r.timeOut}\nTechnicians: ${r.techs.filter(Boolean).join(', ')}\nVehicle: ${r.vehicle || '—'} · total trip distance: ${tripText(r) || '—'}\nChecklist: ${p.done}/${p.items} answered, ${faults.length} fault(s)\n${faults.join('\n')}\n\nFindings: ${r.findings.faults || '—'}\nFollow-up: ${r.findings.parts || '—'}\n\nSent from the Mundial Technologies Field Log Book (${BOOK_REF}).`;
}
async function postMail(payload) {
  const res = await fetch(SETTINGS.scriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...payload, token: SETTINGS.token, to: SETTINGS.email }) });
  const j = await res.json().catch(() => ({ ok: false, error: 'Unexpected reply from mailer' }));
  if (!j.ok) throw new Error(j.error || 'Mailer error');
  return j;
}
window.addEventListener('online', () => { netBadge(); processOutbox(false); });
window.addEventListener('offline', netBadge);
function netBadge() { const n = $('#net'); n.textContent = navigator.onLine ? 'Online' : 'Offline'; n.classList.toggle('off', !navigator.onLine); }

/* ------------------------------------------------------------------ incident register */
async function renderIncidents() {
  setTitle('Incident register');
  const list = (await DB.all('incidents')).sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt);
  const opts = v => ['', ...SITES.map(s => s.code), 'HQ / general'].map(c => `<option value="${esc(c)}" ${c === v ? 'selected' : ''}>${c ? esc(c === 'HQ / general' ? c : c + ' ' + site(c).name) : 'Site…'}</option>`).join('');
  app.innerHTML = `<div class="wrap">
    <div class="card"><h2>New incident</h2><div class="in"><div class="incident" style="border:0;padding:0">
      <input type="date" id="nd" value="${today()}"><select id="ns">${opts('')}</select>
      <input class="note" id="nn" placeholder="One-line note: device, what happened, who reported">
      <label class="res"><input type="checkbox" id="nr"> Resolved?</label><button class="btn primary" id="add">Add</button></div></div></div>
    <div class="card"><h2>Register (${list.length})</h2>
      ${list.length ? list.map(i => `<div class="incident" data-id="${i.id}"><input type="date" data-f="date" value="${esc(i.date)}"><select data-f="site">${opts(i.site)}</select>
        <input class="note" data-f="note" value="${esc(i.note)}"><label class="res"><input type="checkbox" data-f="resolved" ${i.resolved ? 'checked' : ''}> Resolved?</label>
        <button class="btn sm ghost" data-del="${i.id}">✕</button></div>`).join('') : '<div class="in hint">No incidents recorded.</div>'}
    </div>
    <div class="row" style="gap:10px;flex-wrap:wrap"><a class="btn ghost" href="#">Home</a><button class="btn" id="ishare">Share PDF</button>${SETTINGS.email && SETTINGS.scriptUrl ? '<button class="btn primary" id="imail">Email PDF</button>' : ''}</div>
  </div>`;
  $('#add').onclick = async () => {
    const note = $('#nn').value.trim(); if (!note) { toast('Write a short note first'); return; }
    await DB.put('incidents', { id: uid(), date: $('#nd').value, site: $('#ns').value, note, resolved: $('#nr').checked, createdAt: Date.now() }); renderIncidents();
  };
  app.querySelectorAll('.incident[data-id] [data-f]').forEach(el => el.onchange = el.oninput = async () => {
    const id = el.closest('[data-id]').dataset.id; const i = await DB.get('incidents', id);
    i[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value; await DB.put('incidents', i);
  });
  app.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (await modal('Delete incident?', '', [{ label: 'Cancel', value: false, cls: 'ghost' }, { label: 'Delete', value: true, cls: 'red' }])) { await DB.del('incidents', b.dataset.del); renderIncidents(); } });
  $('#ishare').onclick = async () => sharePdf(await buildIncidentPDF(), `Mundial_RFA_Incident_Register_${today()}.pdf`, 'Mundial RFA — Incident Register');
  const im = $('#imail'); if (im) im.onclick = async () => { await DB.put('kv', { k: 'incidentMail', v: 'queued' }); if (navigator.onLine) processOutbox(true); else toast('Offline — will send when online'); };
}
async function buildIncidentPDF() {
  await loadAssets();
  const doc = newDoc(); const list = (await DB.all('incidents')).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  let y = titleBlock(doc, 'Incident Register', M.t);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED);
  doc.text(T('One line per incident affecting the cantilever poles, cameras, RFID readers, cabinets, power systems or handhelds.'), M.l, y + 2); y += 6;
  const res = list.map(i => i.resolved);
  doc.autoTable({
    ...baseTable, startY: y, head: [['#', 'Date', 'Site', 'Notes', 'Resolved?']],
    body: list.length ? list.map((i, k) => [String(k + 1), T(fmtDate(i.date)), T(i.site === 'HQ / general' ? i.site : i.site ? i.site + ' ' + site(i.site).name : ''), T(i.note), '']) : [['', '', '', 'No incidents recorded', '']],
    columnStyles: { 0: { cellWidth: 9, halign: 'center' }, 1: { cellWidth: 24 }, 2: { cellWidth: 46 }, 4: { cellWidth: 18 } }, bodyStyles: { minCellHeight: 8 },
    didDrawCell: d => {
      if (d.section !== 'body' || d.column.index !== 4 || !list.length) return;
      const bx = d.cell.x + d.cell.width / 2 - 1.9, by = d.cell.y + d.cell.height / 2 - 1.9;
      doc.setDrawColor(...BLUE); doc.setLineWidth(0.25);
      if (res[d.row.index]) { doc.setFillColor(29, 127, 59); doc.rect(bx, by, 3.8, 3.8, 'F'); doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.6); doc.line(bx + 0.8, by + 2, bx + 1.6, by + 2.9); doc.line(bx + 1.6, by + 2.9, bx + 3.1, by + 0.9); }
      else doc.rect(bx, by, 3.8, 3.8);
    },
  });
  frame(doc, 'RFA MDC — Compliance Monitoring Solution Log Book');
  return doc;
}

/* ------------------------------------------------------------------ settings */
async function renderSettings() {
  setTitle('Settings');
  let est = ''; try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); est = `${(e.usage / 1048576).toFixed(1)} MB used of ${(e.quota / 1048576 / 1024).toFixed(1)} GB available`; } } catch (e) { }
  app.innerHTML = `<div class="wrap">
    <div class="card"><h2>Email delivery</h2><div class="in">
      <p class="hint">Reports are emailed through your own Google account (Apps Script mailer — see the setup guide). Offline reports wait in the outbox and send automatically when the tablet is back online.</p>
      <div class="grid2">
        <label class="f">Send reports to (email)<input id="em" type="email" value="${esc(SETTINGS.email)}" placeholder="name@company.com"></label>
        <label class="f">Mailer link (Apps Script web app URL)<input id="su" value="${esc(SETTINGS.scriptUrl)}" placeholder="https://script.google.com/macros/s/…/exec"></label>
        <label class="f">Mailer access code<input id="tk" value="${esc(SETTINGS.token)}" placeholder="same code as in the script"></label>
      </div>
      <div class="row" style="margin-top:12px;gap:10px"><button class="btn primary" id="sv1">Save</button><button class="btn" id="test">Send test email</button></div>
    </div></div>
    <div class="card"><h2>Technicians (pre-filled on new visits)</h2><div class="in"><div class="grid2">
      ${[0, 1, 2].map(i => `<label class="f">Technician ${i + 1}${i === 0 ? ' (lead)' : ''}<input data-t="${i}" value="${esc(SETTINGS.techs[i] || '')}"></label>`).join('')}
      <label class="f">Ceramic coating due in quarters<input id="cq" value="${esc(SETTINGS.coatQuarters)}" placeholder="1,3"></label>
    </div><button class="btn primary" id="sv2" style="margin-top:12px">Save</button></div></div>
    <div class="card"><h2>Company vehicles</h2><div class="in">
      <p class="hint">Vehicles listed here can be selected on each visit (with trip-start and at-pole odometer readings).</p>
      ${(SETTINGS.vehicles || []).length ? `<div class="vlist">${SETTINGS.vehicles.map((v, i) => `<div class="vrow"><span>🚙 ${esc(v)}</span><button class="btn sm ghost" data-vdel="${i}">Remove</button></div>`).join('')}</div>` : '<p class="hint"><b>No vehicles yet.</b></p>'}
      <div class="row" style="gap:10px;margin-top:10px"><label class="f">Add vehicle (make / model · registration)<input id="vnew" placeholder="e.g. Double cab 4x4 · N 12-345 W"></label><button class="btn primary" id="vadd">Add</button></div>
    </div></div>
    <div class="card"><h2>Digital company stamp</h2><div class="in">
      ${SETTINGS.stamp ? `<img class="stamp-prev" src="${SETTINGS.stamp}" alt="stamp">` : '<p class="hint">No stamp saved.</p>'}
      <p class="hint">Stamp a clean sheet of white paper, photograph it straight-on, then crop close to the stamp. A transparent PNG works best.</p>
      <div class="row" style="gap:10px"><label class="btn" style="cursor:pointer">Upload / photograph stamp<input type="file" id="st" accept="image/*" hidden></label>${SETTINGS.stamp ? '<button class="btn ghost" id="stx">Remove</button>' : ''}</div>
    </div></div>
    <div class="card"><h2>Backup</h2><div class="in">
      <p class="hint">All records live on this tablet only. Export a backup file regularly (e.g. after every trip) and keep it on Google Drive / email. ${esc(est)}</p>
      <div class="row" style="gap:10px;flex-wrap:wrap"><button class="btn" id="bk">Export backup</button><label class="btn ghost" style="cursor:pointer">Import backup<input type="file" id="imp" accept="application/json,.json" hidden></label></div>
    </div></div>
    <p class="hint">Mundial Field Log Book v${APP_VERSION} · ${BOOK_REF}</p>
  </div>`;
  $('#sv1').onclick = async () => { SETTINGS.email = $('#em').value.trim(); SETTINGS.scriptUrl = $('#su').value.trim(); SETTINGS.token = $('#tk').value.trim(); await saveSettings(); toast('Saved'); };
  $('#test').onclick = async () => {
    SETTINGS.email = $('#em').value.trim(); SETTINGS.scriptUrl = $('#su').value.trim(); SETTINGS.token = $('#tk').value.trim(); await saveSettings();
    if (!navigator.onLine) return toast('Connect to the internet to send a test');
    try { await loadAssets(); const d = newDoc(); titleBlock(d, 'Mundial Field Log Book — test email', M.t); frame(d, 'Test'); await postMail({ subject: 'Mundial Field Log Book — test email', filename: 'Mundial_test.pdf', pdf: d.output('datauristring').split(',')[1], body: 'If you received this with a PDF attached, email delivery works.' }); toast('Test email sent to ' + SETTINGS.email, 4000); }
    catch (e) { toast('Test failed: ' + e.message, 6000); }
  };
  $('#sv2').onclick = async () => { app.querySelectorAll('[data-t]').forEach(i => SETTINGS.techs[+i.dataset.t] = i.value.trim()); SETTINGS.coatQuarters = $('#cq').value.trim() || '1,3'; await saveSettings(); toast('Saved'); };
  $('#st').onchange = async e => { const f = e.target.files[0]; if (!f) return; SETTINGS.stamp = f.type === 'image/png' ? await fileToDataURL(f) : await compressImage(f, 900, 0.85); await saveSettings(); renderSettings(); };
  $('#vadd').onclick = async () => { const v = $('#vnew').value.trim(); if (!v) return toast('Enter the vehicle description first'); SETTINGS.vehicles = [...(SETTINGS.vehicles || []).filter(x => x !== v), v]; await saveSettings(); renderSettings(); toast('Vehicle added'); };
  app.querySelectorAll('[data-vdel]').forEach(b => b.onclick = async () => { const v = SETTINGS.vehicles[+b.dataset.vdel]; SETTINGS.vehicles.splice(+b.dataset.vdel, 1); if (SETTINGS.lastVehicle === v) SETTINGS.lastVehicle = ''; await saveSettings(); renderSettings(); });
  const sx = $('#stx'); if (sx) sx.onclick = async () => { SETTINGS.stamp = ''; await saveSettings(); renderSettings(); };
  $('#bk').onclick = async () => {
    const data = { app: 'mundial-logbook', version: APP_VERSION, exportedAt: new Date().toISOString(), records: await DB.all('records'), incidents: await DB.all('incidents'), settings: { ...SETTINGS, token: '' } };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' }); const name = `Mundial_logbook_backup_${today()}.json`;
    const file = new File([blob], name, { type: 'application/json' });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; } } catch (e) { if (e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  };
  $('#imp').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const d = JSON.parse(await f.text()); if (d.app !== 'mundial-logbook') throw new Error('Not a log book backup');
      for (const r of d.records || []) await DB.put('records', r); for (const i of d.incidents || []) await DB.put('incidents', i);
      toast(`Imported ${(d.records || []).length} records and ${(d.incidents || []).length} incidents`); } catch (err) { toast('Import failed: ' + err.message); }
  };
}

/* ------------------------------------------------------------------ boot */
(async function boot() {
  netBadge();
  try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { }
  await loadSettings();
  route();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    try {
      const reg = await navigator.serviceWorker.register('sw.js');
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing; nw && nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            modal('Update available', '<p>A new version of the log book is ready. Your records are kept.</p>', [{ label: 'Later', value: false, cls: 'ghost' }, { label: 'Update now', value: true, cls: 'primary' }]).then(ok => { if (ok) { nw.postMessage('skip'); setTimeout(() => location.reload(), 400); } });
          }
        });
      });
    } catch (e) { console.warn('SW', e); }
  }
  setTimeout(() => processOutbox(false), 1500);
})();
