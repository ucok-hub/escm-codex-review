// uat_apps_script.gs — tempel ke Google Apps Script yang TERIKAT pada Google Sheet UAT.
// 1) Buat Google Sheet baru (mis. "UAT SUS ESCM"). Extensions → Apps Script.
// 2) Tempel kode ini. Simpan.
// 3) Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone.
// 4) Salin Web app URL → .env (root repo): UAT_APPS_SCRIPT_URL=...
const HEADER = ["timestamp","email","peran","pengalaman","freqTools","q1","q2","q3","q4","q5","q6","q7","q8","q9","q10","komentar"];
function sheet_() { return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]; }
function emailExists_(email) {
  const sh = sheet_(); const last = sh.getLastRow();
  if (last < 2) return false;
  const col = sh.getRange(2, 2, last - 1, 1).getValues();
  const t = String(email).trim().toLowerCase();
  return col.some(function (r) { return String(r[0]).trim().toLowerCase() === t; });
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === "check") return json_({ exists: emailExists_(p.email || "") });
  return json_({ ok: true });
}
function doPost(e) {
  let b = {};
  try { b = JSON.parse(e.postData.contents); } catch (_) { return json_({ error: "bad json" }); }
  const email = String(b.email || "").trim();
  if (!email) return json_({ error: "no email" });
  if (emailExists_(email)) return json_({ duplicate: true });
  const sh = sheet_();
  if (sh.getLastRow() === 0) sh.appendRow(HEADER);
  const a = b.answers || [];
  sh.appendRow([new Date(), email, b.peran || "", b.pengalaman || "", b.freqTools || "",
    a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7],a[8],a[9], b.komentar || ""]);
  return json_({ ok: true });
}
