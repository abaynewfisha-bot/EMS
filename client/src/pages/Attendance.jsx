import { useCallback, useEffect, useState } from "react";
import api from "../api/api.js";
import AttendanceForm from "../components/AttendanceForm.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import StatCard from "../components/StatCard.jsx";
import { AttendanceBadge } from "../components/Badge.jsx";
import { FullPageSpinner } from "../components/Spinner.jsx";
import { useToast } from "../components/Toast.jsx";
import {
  SearchIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  ChevronLeft,
  ChevronRight,
  CheckIcon,
  ClockIcon,
  CloseIcon,
  CalendarIcon,
} from "../components/Icons.jsx";
import { formatDate, formatTime, colorForId, toISODate, ATTENDANCE_STATUSES } from "../utils.js";
import RefreshButton from "../components/RefreshButton.jsx";

const PAGE_SIZE = 10;

const daysAgoISO = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toISODate(d);
};

export default function Attendance() {
  const toast = useToast();

  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [from, setFrom] = useState(daysAgoISO(6));
  const [to, setTo] = useState(daysAgoISO(0));
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ column: "date", order: "desc" });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    api.listDepartments().then(setDepartments).catch((e) => toast.error(e.message));
    api
      .listEmployees({ limit: 100 })
      .then((res) => setEmployees(res.data))
      .catch((e) => toast.error(e.message));
  }, [toast]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    api
      .getAttendanceSummary({ from, to, department_id: departmentId })
      .then(setSummary)
      .catch((e) => toast.error(e.message));
  }, [from, to, departmentId, toast]);

  const load = useCallback(() => {
    setLoading(true);
    api
      .listAttendance({
        search: debouncedSearch,
        from,
        to,
        department_id: departmentId,
        status,
        page,
        limit: PAGE_SIZE,
        sort: sort.column,
        order: sort.order,
      })
      .then((res) => {
        setRecords(res.data);
        setPagination(res.pagination);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [debouncedSearch, from, to, departmentId, status, page, sort, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSort = (column) => {
    setSort((s) =>
      s.column === column ? { column, order: s.order === "asc" ? "desc" : "asc" } : { column, order: "asc" }
    );
  };

  const handleSubmit = async (data) => {
    if (editing) {
      await api.updateAttendance(editing.id, data);
      toast.success("Attendance updated.");
    } else {
      await api.createAttendance(data);
      toast.success("Attendance recorded.");
    }
    setFormOpen(false);
    setEditing(null);
    load();
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.deleteAttendance(deleting.id);
      toast.success("Attendance record deleted.");
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const SortHeader = ({ column, children, className = "" }) => (
    <th className={`px-6 py-3 font-semibold ${className}`}>
      <button className="inline-flex items-center gap-1 hover:text-slate-700" onClick={() => toggleSort(column)}>
        {children}
        <span className="text-[10px] text-slate-400">
          {sort.column === column ? (sort.order === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );

  return (
    <div className="-m-4 min-h-[calc(100%-0rem)] bg-[#edf1f7] p-4 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Attendance Tracking</h2>
          <p className="mt-1 text-sm text-slate-500">Daily attendance records and status</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="text-xs font-medium text-slate-500">Date Picker</label>
          <input type="date" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700" value={to} onChange={(e) => { setTo(e.target.value); setFrom(e.target.value); setPage(1); }} />
          <button className="rounded-lg border border-slate-300 bg-white p-2 text-slate-500" onClick={() => setStatus((old) => old ? "" : "Present")} title="Filter">
            <CalendarIcon className="h-4 w-4" />
          </button>
          <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <span className="mr-1">+</span> Mark
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
        {[
          ["Present", summary?.present ?? 0, "+2", "emerald"],
          ["Absent", summary?.absent ?? 0, "-1", "rose"],
          ["Late", summary?.late ?? 0, "3 on grace", "amber"],
          ["On Leave", summary?.on_leave ?? 0, "Approved time off", "violet"],
        ].map(([label, value, note, tone]) => (
          <div key={label} className="relative overflow-hidden rounded-xl border border-slate-700/80 bg-[#1c2638] p-5 text-white">
            <div className="flex items-start justify-between">
              <div><p className="text-sm text-slate-300">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p><p className="mt-2 text-xs text-slate-400">{tone === "emerald" ? "↗ " : tone === "rose" ? "↓ " : ""}{note}</p></div>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                tone === "emerald" ? "bg-emerald-500/20 text-emerald-300" :
                tone === "rose" ? "bg-rose-500/20 text-rose-300" :
                tone === "amber" ? "bg-amber-500/20 text-amber-300" :
                "bg-violet-500/20 text-violet-300"
              }`}>{tone === "emerald" ? "✓" : tone === "rose" ? "⊘" : tone === "amber" ? "△" : "▣"}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700/70 bg-[#1c2638]">
        {loading ? (
          <FullPageSpinner />
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarIcon className="h-10 w-10 text-slate-300" />
            <p className="mt-3 font-medium text-slate-600">No attendance records</p>
            <p className="text-sm text-slate-400">Try a different date range or mark attendance.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/70 px-5 py-4">
              <h3 className="font-semibold text-white">Daily Attendance Tracking Table</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input className="w-52 rounded-lg border border-slate-600/70 bg-[#111827] py-2 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <button className="rounded-lg border border-slate-600 p-2 text-slate-400" onClick={() => setStatus((old) => old ? "" : "Present")} title="Filter">≡</button>
              </div>
            </div>
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-slate-700/70 text-xs text-slate-300">
                <tr>
                  <th className="px-5 py-3 font-medium"><input type="checkbox" aria-label="Select all" /></th>
                  <th className="px-5 py-3 font-medium">Employee Name</th>
                  <th className="px-5 py-3 font-medium">Department</th>
                  <th className="px-5 py-3 font-medium">Check-In</th>
                  <th className="px-5 py-3 font-medium">Check-Out</th>
                  <th className="px-5 py-3 font-medium">Work Hours</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {records.map((r) => (
                  <tr key={r.id} className="text-slate-200 hover:bg-slate-700/30">
                    <td className="px-5 py-3"><input type="checkbox" aria-label={`Select ${r.first_name} ${r.last_name}`} /></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-500 text-xs font-semibold text-white">
                          {r.first_name[0]}
                          {r.last_name[0]}
                        </div>
                        <p className="font-medium text-slate-100">{r.first_name} {r.last_name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-300">{r.department_name || "—"}</td>
                    <td className="px-5 py-3 text-slate-300">{formatTime(r.check_in)}</td>
                    <td className="px-5 py-3 text-slate-300">{formatTime(r.check_out)}</td>
                    <td className="px-5 py-3 text-slate-300">
                      {r.check_in && r.check_out
                        ? (() => {
                            const [inHour, inMinute] = r.check_in.split(":").map(Number);
                            const [outHour, outMinute] = r.check_out.split(":").map(Number);
                            const minutes = Math.max(0, (outHour * 60 + outMinute) - (inHour * 60 + inMinute));
                            return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
                          })()
                        : "--"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                        r.status === "Present" ? "bg-emerald-500/20 text-emerald-300"
                        : r.status === "Late" ? "bg-amber-500/20 text-amber-300"
                        : r.status === "Absent" ? "bg-rose-500/20 text-rose-300"
                        : "bg-sky-500/20 text-sky-300"
                      }`}>{r.status}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"
                          onClick={() => { setEditing(r); setFormOpen(true); }}
                          title="Edit"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          onClick={() => setDeleting(r)}
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && records.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-700/60 px-5 py-3">
            <p className="text-xs text-slate-400">
              Showing {((pagination.page - 1) * PAGE_SIZE) + 1}-{Math.min(pagination.page * PAGE_SIZE, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                className="btn-secondary px-2.5 py-1.5"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                className="btn-secondary px-2.5 py-1.5"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <AttendanceForm
        open={formOpen}
        initial={editing}
        employees={employees}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete Attendance"
        message={deleting ? `Delete the ${deleting.status} record for ${deleting.first_name} ${deleting.last_name} on ${formatDate(deleting.date)}?` : ""}
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
      </div>
    </div>
  );
}
