import { useEffect, useState } from "react";
import RefreshButton from "../components/RefreshButton.jsx";

const actionStyles = {
  UPDATE: "bg-sky-100 text-sky-700",
  DELETE: "bg-red-100 text-red-700",
  CREATE: "bg-violet-100 text-violet-700",
  APPROVE: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700",
  VIEW: "bg-sky-100 text-sky-700",
  EXPORT: "bg-amber-100 text-amber-700",
  LOGIN: "bg-violet-100 text-violet-700",
};

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({
    dateRange: "30",
    user: "",
    action: "",
    module: "",
    result: "Success",
    search: "",
  });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(1);
  const base = import.meta.env.VITE_API_BASE_URL || "/api";

  const load = async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ limit: "10", page: String(page) });
    Object.entries(applied).forEach(([key, value]) => {
      if (value && value !== "All") params.set(key, value);
    });
    try {
      const res = await fetch(`${base}/audit?${params}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Unable to load audit logs");
      setRows(body.data || []);
      setPagination(body.pagination || { total: 0, page: 1, pages: 1 });
      setSelected((body.data || [])[0] || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, applied]);

  const applyFilters = () => {
    setPage(1);
    setApplied(filters);
  };

  const resetFilters = () => {
    const reset = { dateRange: "30", user: "", action: "", module: "", result: "Success", search: "" };
    setFilters(reset);
    setPage(1);
    setApplied(reset);
  };

  const exportLogs = () => {
    const headings = ["Date & Time","User","Action","Module","Description","IP Address","Result"];
    const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [
      headings.map(escape).join(","),
      ...rows.map((row) => [
        row.created_at, row.user_name, row.action, row.module || row.entity_type,
        row.description, row.ip_address, row.result,
      ].map(escape).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "audit-logs.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (value) => value ? new Date(value).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }) : "—";

  const actionName = (action) => String(action || "").split(" ")[0].toUpperCase();
  const total = pagination.total || 0;
  const start = total === 0 ? 0 : (page - 1) * 10 + 1;
  const end = Math.min(page * 10, total);
  const resultSuccess = rows.filter((row) => row.result === "Success").length;
  const resultFailed = rows.filter((row) => row.result === "Failed").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Audit Log</h2>
          <p className="mt-1 text-sm text-slate-500">Track and monitor all system activities</p>
        </div>
        <div className="flex gap-2">
          <RefreshButton onClick={load} loading={loading} />
          <button className="btn-primary" onClick={exportLogs}>↓ Export Logs</button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Activities", total, "↑ 8%", "bg-sky-50 text-sky-700"],
          ["Unique Users", new Set(rows.map((row) => row.user_name)).size, "↑ 5%", "bg-emerald-50 text-emerald-700"],
          ["Today's Activities", rows.filter((row) => new Date(row.created_at).toDateString() === new Date().toDateString()).length, "↑ 12%", "bg-violet-50 text-violet-700"],
          ["Security Events", resultFailed, "↓ 20%", "bg-orange-50 text-orange-700"],
        ].map(([label, value, trend, style]) => (
          <div key={label} className="card flex items-center justify-between p-5">
            <div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{value.toLocaleString()}</p><p className="mt-1 text-xs text-emerald-600">{trend}</p></div>
            <div className={`rounded-xl px-3 py-2 text-sm font-bold ${style}`}>LOG</div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-semibold text-slate-600">Date Range
            <select className="input mt-1" value={filters.dateRange} onChange={(e) => setFilters((old) => ({ ...old, dateRange: e.target.value }))}>
              <option value="7">Last 7 Days</option><option value="30">Last 30 Days</option><option value="90">Last 90 Days</option><option value="all">All Time</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">User
            <input className="input mt-1" placeholder="All Users" value={filters.user} onChange={(e) => setFilters((old) => ({ ...old, user: e.target.value }))} />
          </label>
          <label className="text-xs font-semibold text-slate-600">Action Type
            <select className="input mt-1" value={filters.action} onChange={(e) => setFilters((old) => ({ ...old, action: e.target.value }))}>
              <option value="">All Actions</option>{["Login","Processed Payroll","Updated Payroll","Deleted Payroll","Approved Payroll","Updated Employee","Created Employee","Deleted Employee","Created Salary Grade","Updated Settings","User Logout"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">Module
            <select className="input mt-1" value={filters.module} onChange={(e) => setFilters((old) => ({ ...old, module: e.target.value }))}>
              <option value="">All Modules</option>{["Authentication","Payroll","Salary","Employee","Bank","Payslip","Reports","System","Settings","User"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">Result
            <select className="input mt-1" value={filters.result} onChange={(e) => setFilters((old) => ({ ...old, result: e.target.value }))}>
              <option value="">All Results</option><option>Success</option><option>Failed</option><option>Warning</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 md:col-span-2 xl:col-span-2">Search
            <input className="input mt-1" placeholder="Search description..." value={filters.search} onChange={(e) => setFilters((old) => ({ ...old, search: e.target.value }))} />
          </label>
          <div className="flex items-end justify-end gap-2">
            <button className="btn-secondary" onClick={resetFilters}>↻ Reset</button>
            <button className="btn-primary" onClick={applyFilters}>▾ Filter</button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold text-slate-900">Audit Log Entries</h3>
          <p className="text-xs text-slate-500">Showing {start}–{end} of {total.toLocaleString()}</p>
        </div>
        {loading ? <p className="p-6 text-sm text-slate-500">Loading audit entries...</p> : rows.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No audit entries found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500"><tr>
                {["#","Date & Time","User","Action","Module","Description","IP Address","Result","Details"].map((h)=><th key={h} className="whitespace-nowrap px-4 py-3">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{start + index}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(row.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3"><b className="text-slate-800">{row.user_name}</b></td>
                    <td className="px-4 py-3"><span className={`rounded px-2 py-1 text-[11px] font-bold ${actionStyles[actionName(row.action)] || "bg-slate-100 text-slate-600"}`}>{actionName(row.action)}</span></td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{row.module || row.entity_type}</td>
                    <td className="max-w-sm px-4 py-3 text-slate-600">{row.description || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{row.ip_address || "—"}</td>
                    <td className="px-4 py-3"><span className={row.result === "Success" ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700"}>{row.result}</span></td>
                    <td className="px-4 py-3"><button className="rounded-md p-1.5 text-sky-600 hover:bg-sky-50" onClick={() => setSelected(row)} title="View details">◉</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button className="btn-secondary px-3 py-1.5" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>‹</button>
          {Array.from({ length: Math.min(pagination.pages, 5) }, (_, index) => index + 1).map((number) => (
            <button key={number} className={`rounded-md px-3 py-1.5 text-sm ${page === number ? "bg-brand-600 text-white" : "border border-slate-200"}`} onClick={() => setPage(number)}>{number}</button>
          ))}
          <button className="btn-secondary px-3 py-1.5" disabled={page >= pagination.pages} onClick={() => setPage((value) => value + 1)}>›</button>
        </div>
      </div>

      {selected && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card p-4"><p className="text-xs font-bold text-sky-700">Log Details</p><p className="mt-2 text-sm"><b>Action:</b> {selected.action}</p><p className="text-sm"><b>Module:</b> {selected.module || selected.entity_type}</p><p className="text-sm"><b>Description:</b> {selected.description}</p></div>
          <div className="card p-4"><p className="text-xs font-bold text-violet-700">User Information</p><p className="mt-2 text-sm"><b>User:</b> {selected.user_name}</p><p className="text-sm"><b>Role:</b> {selected.user_role || "—"}</p><p className="text-sm"><b>IP Address:</b> {selected.ip_address || "—"}</p></div>
          <div className="card relative p-4"><button className="absolute right-3 top-3 text-slate-400" onClick={() => setSelected(null)}>× Close</button><p className="text-xs font-bold text-sky-700">Additional Information</p><p className="mt-2 text-sm"><b>Timestamp:</b> {formatDate(selected.created_at)}</p><p className="mt-2 text-sm"><b>Result:</b> <span className="ml-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">{selected.result}</span></p></div>
        </div>
      )}
    </div>
  );
}
