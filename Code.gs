/**
 * Gas Cylinder Board — Google Apps Script backend.
 * The Google Sheet this script is attached to IS the database:
 *   tab "Cylinders", tab "Requests", tab "Settings" (title + lab PIN).
 *
 * FIRST TIME: choose the function "setup" in the toolbar and click Run.
 * Then: Deploy → New deployment → Web app → Execute as: Me,
 *       Who has access: Anyone → Deploy, and copy the Web app URL.
 */

const DEFAULT_PIN = "2468";   // used only by setup(); change the PIN later in the Settings tab
const TABLES = {
  cylinders: { sheet: "Cylinders", cols: ["id","cylNo","gas","purity","size","status","connected","location","own","supplier","user","remarks","updated","updatedAt","updatedBy"] },
  requests:  { sheet: "Requests",  cols: ["id","gas","qty","purity","size","supplier","location","requestedBy","note","status","created","createdBy","orderedAt","receivedAt","closedAt"] },
};
const PRESENCE_SECONDS = 70;

// ---------- one-time setup ----------
function setup() {
  const ss = SpreadsheetApp.getActive();
  Object.values(TABLES).forEach(t => {
    let sh = ss.getSheetByName(t.sheet) || ss.insertSheet(t.sheet);
    sh.getRange(1, 1, sh.getMaxRows(), t.cols.length).setNumberFormat("@");
    sh.getRange(1, 1, 1, t.cols.length).setValues([t.cols]).setFontWeight("bold");
    sh.setFrozenRows(1);
  });
  let st = ss.getSheetByName("Settings") || ss.insertSheet("Settings");
  if (st.getLastRow() < 2) {
    st.getRange("A:B").setNumberFormat("@");
    st.getRange(1, 1, 3, 2).setValues([["key","value"],["title","Gas Cylinder Status"],["pin", DEFAULT_PIN]]);
    st.getRange(1, 1, 1, 2).setFontWeight("bold");
  }
  const cyl = ss.getSheetByName("Cylinders");
  if (cyl.getLastRow() < 2) {
    const cols = TABLES.cylinders.cols;
    const rows = SEED.map(o => cols.map(c => cell_(o[c])));
    cyl.getRange(2, 1, rows.length, cols.length).setValues(rows);
  }
  const s1 = ss.getSheetByName("Sheet1");
  if (s1 && ss.getSheets().length > 1 && s1.getLastRow() === 0) ss.deleteSheet(s1);
  SpreadsheetApp.getUi && Logger.log("Setup done. Lab PIN is in the Settings tab.");
}

// ---------- web app ----------
// The board sends every request as GET ?q=<json> (most reliable across browsers).
function doGet(e) {
  const q = e && e.parameter && e.parameter.q;
  if (!q) return json_(snapshot_({}));
  let b = {};
  try { b = JSON.parse(q); } catch (err) { return json_({ ok:false, code:"bad_request", error:"Bad request" }); }
  return handle_(b);
}
function doPost(e) {
  let b = {};
  try { b = JSON.parse(e.postData.contents || "{}"); } catch (err) { return json_({ ok:false, code:"bad_request", error:"Bad request" }); }
  return handle_(b);
}

function handle_(b) {
  const name = String(b.name || "").slice(0, 60).trim();
  try {
    if (b.action === "list") return json_(snapshot_({ name, editing: b.editing }));
    if (String(b.pin || "") !== setting_("pin")) { Utilities.sleep(400); return json_({ ok:false, code:"bad_pin", error:"Wrong lab PIN" }); }
    if (b.action === "checkPin") return json_({ ok:true });
    const lock = LockService.getScriptLock(); lock.waitLock(15000);
    try {
      if (b.action === "put")  put_(b.table, b.id, b.data || {}, !!b.replace, name);
      else if (b.action === "del")  del_(b.table, b.id);
      else if (b.action === "meta") { if (b.data && b.data.title) setSetting_("title", String(b.data.title).slice(0, 80)); }
      else return json_({ ok:false, code:"bad_request", error:"Unknown action" });
    } finally { lock.releaseLock(); }
    return json_(snapshot_({ name }));
  } catch (err) {
    return json_({ ok:false, code:"server_error", error:String(err && err.message || err) });
  }
}

// ---------- data ----------
function snapshot_(opts) {
  const out = { ok:true, cylinders: read_("cylinders"), requests: read_("requests"), meta: { title: setting_("title") } };
  out.here = presence_(opts.name, opts.editing);
  return out;
}
function read_(table) {
  const t = TABLES[table], sh = SpreadsheetApp.getActive().getSheetByName(t.sheet);
  const n = sh.getLastRow() - 1; if (n < 1) return [];
  const vals = sh.getRange(2, 1, n, t.cols.length).getDisplayValues();
  return vals.filter(r => r[0]).map(r => {
    const o = {}; t.cols.forEach((c, i) => o[c] = r[i]);
    if ("connected" in o) o.connected = /^true$/i.test(o.connected);
    if ("qty" in o) o.qty = Number(o.qty) || 1;
    return o;
  });
}
function put_(table, id, data, replace, name) {
  const t = TABLES[table]; if (!t || !id) throw new Error("Bad table or id");
  const sh = SpreadsheetApp.getActive().getSheetByName(t.sheet);
  const row = findRow_(sh, id);
  let cur = {};
  if (row && !replace) { const v = sh.getRange(row, 1, 1, t.cols.length).getDisplayValues()[0]; t.cols.forEach((c, i) => cur[c] = v[i]); }
  const o = Object.assign(cur, data, { id: id });
  if (table === "cylinders") { o.updatedAt = new Date().toISOString(); o.updatedBy = name || o.updatedBy || ""; }
  const vals = [t.cols.map(c => cell_(o[c]))];
  if (row) sh.getRange(row, 1, 1, t.cols.length).setValues(vals);
  else sh.getRange(sh.getLastRow() + 1, 1, 1, t.cols.length).setNumberFormat("@").setValues(vals);
}
function del_(table, id) {
  const t = TABLES[table]; if (!t) throw new Error("Bad table");
  const sh = SpreadsheetApp.getActive().getSheetByName(t.sheet);
  const row = findRow_(sh, id); if (row) sh.deleteRow(row);
}
function findRow_(sh, id) {
  const n = sh.getLastRow() - 1; if (n < 1) return 0;
  const ids = sh.getRange(2, 1, n, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) if (ids[i][0] === String(id)) return i + 2;
  return 0;
}
function cell_(v) {
  if (v === null || v === undefined) return "";
  let s = typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v);
  if (/^[=+]/.test(s)) s = "'" + s;   // never let typed text become a formula
  return s.slice(0, 2000);
}

// ---------- settings + presence ----------
function setting_(key) {
  const sh = SpreadsheetApp.getActive().getSheetByName("Settings");
  const v = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 2).getDisplayValues();
  const r = v.find(x => x[0] === key); return r ? String(r[1]).trim() : "";
}
function setSetting_(key, value) {
  const sh = SpreadsheetApp.getActive().getSheetByName("Settings");
  const v = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 1).getDisplayValues();
  const i = v.findIndex(x => x[0] === key);
  if (i >= 0) sh.getRange(i + 1, 2).setValue(value); else sh.appendRow([key, value]);
}
function presence_(name, editing) {
  const cache = CacheService.getScriptCache();
  let here = {}; try { here = JSON.parse(cache.get("here") || "{}"); } catch (e) {}
  const t = Date.now();
  if (name) here[name] = { t: t, editing: typeof editing === "string" ? editing.slice(0, 40) : null };
  Object.keys(here).forEach(k => { if (t - here[k].t > PRESENCE_SECONDS * 1000) delete here[k]; });
  cache.put("here", JSON.stringify(here), 600);
  return Object.keys(here).map(k => ({ name: k, editing: here[k].editing }));
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// ---------- your cylinders (AUG2026 sheet), loaded once by setup() ----------
const SEED = [{"id":"c001","cylNo":"130513","own":"Own","gas":"CH4","purity":"99","size":"B","user":"Inhouse Gases","status":"In use","connected":true,"location":"Inside 404","remarks":"Beside door","updated":"2026-07-08","supplier":"RANA"},{"id":"c002","cylNo":"9208","own":"Rent","gas":"Zero Air","purity":"","size":"B","user":"","status":"In use","connected":true,"location":"Inside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c003","cylNo":"6310","own":"Rent","gas":"He","purity":"99.9995","size":"B","user":"","status":"In use","connected":true,"location":"Inside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c004","cylNo":"10584","own":"Rent","gas":"N2","purity":"99.999","size":"B","user":"","status":"In use","connected":true,"location":"Inside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c005","cylNo":"8890","own":"Rent","gas":"N2","purity":"99.999","size":"B","user":"","status":"Full","connected":false,"location":"Inside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c006","cylNo":"11397","own":"Rent","gas":"Ar","purity":"99.999","size":"B","user":"","status":"In use","connected":true,"location":"Inside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c007","cylNo":"82437","own":"Own","gas":"N2","purity":"","size":"B","user":"","status":"Empty","connected":false,"location":"Inside 404","remarks":"","updated":"2026-07-08","supplier":"RANA"},{"id":"c008","cylNo":"4531","own":"Rent","gas":"Ar","purity":"99.999","size":"B","user":"Common","status":"In use","connected":false,"location":"Inside 404","remarks":"next to Fridge","updated":"2026-07-08","supplier":"INDO"},{"id":"c009","cylNo":"25979","own":"Own","gas":"CO2","purity":"","size":"B","user":"","status":"Not in use","connected":false,"location":"Inside 404","remarks":"","updated":"2026-07-08","supplier":"RANA"},{"id":"c010","cylNo":"5858","own":"Rent","gas":"N2","purity":"99.999","size":"B","user":"Fumehood 1","status":"Full","connected":false,"location":"Inside 404","remarks":"Fumehood 1","updated":"2026-07-08","supplier":"INDO"},{"id":"c011","cylNo":"17413","own":"Own","gas":"C2H6","purity":"99.5","size":"S","user":"","status":"In use","connected":true,"location":"Inside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c012","cylNo":"1738052","own":"Own","gas":"CO2","purity":"","size":"S","user":"","status":"Full","connected":false,"location":"Inside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c013","cylNo":"152595","own":"Own","gas":"CH4","purity":"99.5","size":"S","user":"","status":"In use","connected":true,"location":"Inside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c014","cylNo":"54929","own":"Own","gas":"He","purity":"99.9995","size":"B","user":"BELSORP / XEMIS","status":"In use","connected":true,"location":"Inside 404","remarks":"BELSORP / XEMIS","updated":"2026-07-08","supplier":"RANA"},{"id":"c015","cylNo":"29460","own":"Own","gas":"CO2","purity":"","size":"B","user":"","status":"In use","connected":true,"location":"Inside 404","remarks":"","updated":"2026-07-08","supplier":"RANA"},{"id":"c016","cylNo":"178395","own":"Own","gas":"N2","purity":"99.9995","size":"B","user":"","status":"In use","connected":true,"location":"Inside 404","remarks":"","updated":"2026-07-08","supplier":"RANA"},{"id":"c017","cylNo":"40674","own":"Own","gas":"CH4","purity":"99.5","size":"B","user":"","status":"In use","connected":true,"location":"Inside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c018","cylNo":"62533","own":"Own","gas":"Zero Air","purity":"99.999","size":"B","user":"","status":"In use","connected":true,"location":"Inside 404","remarks":"","updated":"2026-07-08","supplier":"RANA"},{"id":"c019","cylNo":"5195","own":"Rent","gas":"Ar","purity":"","size":"B","user":"","status":"Not in use","connected":false,"location":"Inside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c020","cylNo":"50194","own":"Rent","gas":"O2","purity":"HP","size":"B","user":"Fumehood 2","status":"In use","connected":true,"location":"Inside 404","remarks":"Fumehood 2","updated":"2026-07-08","supplier":"INDO"},{"id":"c021","cylNo":"220537","own":"Own","gas":"C2H4","purity":"1.9","size":"S","user":"","status":"Not in use","connected":false,"location":"Inside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c022","cylNo":"3420","own":"Rent","gas":"C3H8","purity":"99.5","size":"B","user":"","status":"Not in use","connected":false,"location":"Inside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c023","cylNo":"1890","own":"Own","gas":"CO2","purity":"","size":"S","user":"","status":"Not in use","connected":false,"location":"Inside 404","remarks":"","updated":"2026-07-08","supplier":"RANA"},{"id":"c024","cylNo":"5876","own":"Rent","gas":"N2","purity":"99.999","size":"B","user":"common (DRIFTS / ASAP/ AUTOCHEM)","status":"Full","connected":false,"location":"Outside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c025","cylNo":"9752","own":"Rent","gas":"Ar","purity":"99.999","size":"B","user":"","status":"In use","connected":true,"location":"Outside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c026","cylNo":"10940","own":"Rent","gas":"H2","purity":"99.999","size":"B","user":"","status":"Not in use","connected":false,"location":"Outside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c027","cylNo":"4904","own":"Rent","gas":"H2","purity":"99.999","size":"B","user":"","status":"In use","connected":true,"location":"Outside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c028","cylNo":"4691","own":"Rent","gas":"H2/Ar","purity":"10","size":"B","user":"","status":"Not in use","connected":false,"location":"Outside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c029","cylNo":"227072","own":"Own","gas":"CH4","purity":"","size":"S","user":"","status":"Empty","connected":false,"location":"Outside 404","remarks":"","updated":"2026-07-08","supplier":"RANA"},{"id":"c030","cylNo":"36202","own":"Own","gas":"N2O/He","purity":"1.05","size":"S","user":"","status":"Full","connected":false,"location":"Outside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c031","cylNo":"77284","own":"Own","gas":"C2H6","purity":"99.5","size":"S","user":"","status":"Empty","connected":false,"location":"Outside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c032","cylNo":"117702","own":"Own","gas":"CO2","purity":"","size":"B","user":"","status":"Not in use","connected":false,"location":"Outside 404","remarks":"","updated":"2026-07-08","supplier":"RANA"},{"id":"c033","cylNo":"9648","own":"Rent","gas":"CO/He","purity":"10.1","size":"B","user":"","status":"In use","connected":true,"location":"Outside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c034","cylNo":"6301","own":"Rent","gas":"He","purity":"99.999","size":"B","user":"","status":"In use","connected":true,"location":"Outside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c035","cylNo":"72538","own":"Own","gas":"C2H6","purity":"99.5","size":"S","user":"","status":"Empty","connected":false,"location":"Outside 404","remarks":"","updated":"2026-07-08","supplier":"RANA"},{"id":"c036","cylNo":"102168","own":"Own","gas":"NO/N2","purity":"3241 PPM","size":"S","user":"","status":"Not in use","connected":false,"location":"Outside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c037","cylNo":"566572","own":"Own","gas":"NH3/Ar","purity":"2196 PPM","size":"S","user":"","status":"In use","connected":false,"location":"Outside 404","remarks":"","updated":"2026-07-08","supplier":"SKGA"},{"id":"c038","cylNo":"73332","own":"Own","gas":"CH4","purity":"99.5","size":"S","user":"","status":"In use","connected":true,"location":"Outside 404","remarks":"","updated":"2026-07-08","supplier":"RANA"},{"id":"c039","cylNo":"77283","own":"Own","gas":"C3H8","purity":"99.5","size":"S","user":"","status":"Empty","connected":false,"location":"Outside 404","remarks":"","updated":"2026-07-08","supplier":"RANA"},{"id":"c040","cylNo":"330661","own":"Own","gas":"CO2/N2","purity":"","size":"S","user":"","status":"Not in use","connected":false,"location":"Outside 404","remarks":"","updated":"2026-07-08","supplier":"RANA"},{"id":"c041","cylNo":"39852","own":"Own","gas":"CO2/H2/Ar","purity":"","size":"S","user":"","status":"Not in use","connected":false,"location":"Outside 404","remarks":"","updated":"2026-07-08","supplier":"RANA"},{"id":"c042","cylNo":"2896","own":"Own","gas":"CO/Ar","purity":"10.1","size":"S","user":"","status":"Not in use","connected":false,"location":"Outside 404","remarks":"","updated":"2026-07-08","supplier":"SKGA"},{"id":"c043","cylNo":"6203","own":"Rent","gas":"O2/Ar","purity":"10","size":"B","user":"","status":"In use","connected":true,"location":"Outside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c044","cylNo":"4745","own":"Rent","gas":"N2","purity":"99.39","size":"B","user":"","status":"In use","connected":true,"location":"Outside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c045","cylNo":"47248","own":"Rent","gas":"H2","purity":"99.999","size":"B","user":"","status":"Full","connected":false,"location":"Outside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c046","cylNo":"5659","own":"Rent","gas":"CO2","purity":"99","size":"B","user":"","status":"In use","connected":true,"location":"Outside 404","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c047","cylNo":"6582","own":"Own","gas":"CH4/H2","purity":"21.3","size":"B","user":"","status":"Empty","connected":false,"location":"Outside 404","remarks":"","updated":"2026-07-08","supplier":"RANA"},{"id":"c048","cylNo":"52219","own":"Own","gas":"N2/H2","purity":"95","size":"B","user":"","status":"Not in use","connected":false,"location":"Outside 404","remarks":"","updated":"2026-07-08","supplier":"RANA"},{"id":"c049","cylNo":"6992","own":"Rent","gas":"H2/Ar","purity":"10","size":"B","user":"Autochem","status":"In use","connected":true,"location":"Inside 403","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c050","cylNo":"11288","own":"Rent","gas":"H2/Ar","purity":"10","size":"B","user":"Tubular furnace","status":"Full","connected":false,"location":"Inside 403","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c051","cylNo":"49223","own":"Rent","gas":"Zero Air","purity":"HP","size":"B","user":"","status":"In use","connected":true,"location":"Inside 403","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c052","cylNo":"5508","own":"Rent","gas":"N2","purity":"99.999","size":"B","user":"","status":"In use","connected":true,"location":"Inside 403","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c053","cylNo":"110986","own":"Rent","gas":"H2/Ar","purity":"10","size":"B","user":"","status":"In use","connected":true,"location":"Inside 403","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c054","cylNo":"67246","own":"Own","gas":"Ar","purity":"99.9997","size":"B","user":"","status":"Not in use","connected":false,"location":"Inside 403","remarks":"","updated":"2026-07-08","supplier":"RANA"},{"id":"c055","cylNo":"4650","own":"Rent","gas":"H2","purity":"99.999","size":"B","user":"","status":"Not in use","connected":false,"location":"Inside 403","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c056","cylNo":"7075","own":"Rent","gas":"N2","purity":"99.999","size":"B","user":"DRIFTS","status":"In use","connected":true,"location":"Inside 403","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c057","cylNo":"5203","own":"Rent","gas":"Ar","purity":"99.999","size":"B","user":"413 ( workstation 3)","status":"In use","connected":true,"location":"Outside 413","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c058","cylNo":"K13921120","own":"Own","gas":"CO2","purity":"99.999","size":"B","user":"","status":"In use","connected":true,"location":"Outside 413","remarks":"","updated":"2026-07-08","supplier":"RANA"},{"id":"c059","cylNo":"50277","own":"Rent","gas":"Zero Air","purity":"HP","size":"B","user":"","status":"In use","connected":true,"location":"Outside 413","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c060","cylNo":"6381","own":"Rent","gas":"He","purity":"99.9998","size":"B","user":"","status":"Empty","connected":true,"location":"Outside 413","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c061","cylNo":"4710","own":"Rent","gas":"H2","purity":"HP","size":"B","user":"","status":"In use","connected":true,"location":"Outside 413","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c062","cylNo":"10679","own":"Rent","gas":"N2","purity":"99.999","size":"B","user":"413 ( workstation 1 and 2)","status":"In use","connected":true,"location":"Outside 413","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c063","cylNo":"5418","own":"Rent","gas":"N2","purity":"99.999","size":"B","user":"","status":"Full","connected":false,"location":"Outside 413","remarks":"","updated":"2026-07-08","supplier":"INDO"},{"id":"c064","cylNo":"10751","own":"Rent","gas":"CO2","purity":"99","size":"B","user":"","status":"In use","connected":true,"location":"Outside 413","remarks":"","updated":"2026-07-08","supplier":"INDO"}];
