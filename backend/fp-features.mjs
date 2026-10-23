// Deterministic offline fallback over the app's own records. Never calls a provider.
export const FP_LABEL = "Deterministic fallback — no AI provider called";
export function filterRecords(rows, opts = {}) {
  const q = String(opts.q ?? "").trim().toLowerCase(); const status = String(opts.status ?? "").trim();
  return (rows||[]).filter(r => (!status || String(r.status ?? "") === status) && (!q || Object.values(r).some(v => v != null && (typeof v === "object" ? JSON.stringify(v) : String(v)).toLowerCase().includes(q))));
}
export function filterTasks(rows, opts = {}) {
  const q = String(opts.q ?? "").trim().toLowerCase();
  return (rows||[]).filter(r => (!opts.status || String(r.status ?? "") === opts.status) && (!opts.priority || String(r.priority ?? "") === opts.priority) && (!q || [r.title, r.description].some(v => v != null && String(v).toLowerCase().includes(q))));
}
export function recordsToCsv(rows, columns) {
  const cols = columns ?? Object.keys(rows[0] ?? {});
  const esc = v => { const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return [cols.join(","), ...rows.map(r => cols.map(c => esc(r[c])).join(","))].join("\n");
}
export function exportRecords(rows, format, columns) {
  if (format === "csv") return { contentType: "text/csv; charset=utf-8", body: recordsToCsv(rows, columns) };
  if (format === "json") return { contentType: "application/json", body: JSON.stringify(rows, null, 2) };
  throw Object.assign(new Error("Choose JSON or CSV"), { status: 422 });
}
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
export function summarize(feature, label, records, primaryField) {
  const rows = Array.isArray(records) ? records : [];
  const val = r => num(r[primaryField] ?? r.amount ?? r.payload?.[primaryField]);
  const totalPrimary = rows.reduce((s, r) => s + val(r), 0);
  const open = rows.filter(r => !["Approved", "Closed", "DONE"].includes(String(r.status ?? ""))).length;
  const emptyPrimary = rows.filter(r => (r[primaryField] ?? r.payload?.[primaryField]) == null || (r[primaryField] ?? r.payload?.[primaryField]) === "").length;
  return { aiGenerated: false, source: "deterministic-fallback", label: FP_LABEL, feature, title: label,
    summary: `${label}: ${rows.length} record(s) reviewed; ${open} not approved/closed; primary total ${totalPrimary}.`,
    findings: [`Records reviewed: ${rows.length}`, `Not approved/closed: ${open}`, `Empty ${primaryField}: ${emptyPrimary}`, `Primary (${primaryField}) total: ${totalPrimary} (0 preserved when none)`],
    metrics: { records: rows.length, open, emptyPrimary, totalPrimary, hasRecords: rows.length > 0 } };
}

export function waterBalanceGap(records){return summarize("waterBalanceGap","Non-revenue water balance gap",records,"receivedAmount");}

export function meterLossPriority(records){return summarize("meterLossPriority","Meter under-registration priority",records,"entitledAmount");}

export function leakRecoveryValue(records){return summarize("leakRecoveryValue","Leak and billing recovery value",records,"receivedAmount");}

export const FP_FEATURES = ['waterBalanceGap', 'meterLossPriority', 'leakRecoveryValue'];
