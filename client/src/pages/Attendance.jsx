import { useCallback, useEffect, useState } from "react";
import api from "../api.js";
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
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Attendance</h2>
          <p className="mt-1 text-sm text-slate-500">
            {pagination.total} records from {formatDate(from)} to {formatDate(to)}
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <PlusIcon className="h-4 w-4" /> Mark Attendance
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Present"
          value={summary?.present ?? 0}
          icon={CheckIcon}
          accent="bg-emerald-50 text-emerald-600"
          hint={`${summary?.remote ?? 0} working remotely`}
        />
        <StatCard
          label="Late"
          value={summary?.late ?? 0}
          icon={ClockIcon}
          accent="bg-amber-50 text-amber-600"
          hint="Arrived after check-in time"
        />
        <StatCard
          label="Absent"
          value={summary?.absent ?? 0}
          icon={CloseIcon}
          accent="bg-rose-50 text-rose-600"
          hint="Unexcused in selected period"
        />
        <StatCard
          label="On Leave"
          value={summary?.on_leave ?? 0}
          icon={CalendarIcon}
          accent="bg-sky-50 text-sky-600"
          hint={`${summary?.total ?? 0} total records`}
        />
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search by name or staff number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input" value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}>
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {ATTENDANCE_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:max-w-md">
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
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
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <SortHeader column="first_name">Employee</SortHeader>
                  <th className="px-6 py-3 font-semibold">Staff No.</th>
                  <th className="px-6 py-3 font-semibold">Department</th>
                  <SortHeader column="date">Date</SortHeader>
                  <SortHeader column="status">Status</SortHeader>
                  <th className="px-6 py-3 font-semibold">Check In</th>
                  <th className="px-6 py-3 font-semibold">Check Out</th>
                  <th className="px-6 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white ${colorForId(r.employee_id)}`}>
                          {r.first_name[0]}
                          {r.last_name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">
                            {r.first_name} {r.last_name}
                          </p>
                          <p className="text-xs text-slate-400">{r.position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-500">{r.staff_no}</td>
                    <td className="px-6 py-3 text-slate-600">{r.department_name || "—"}</td>
                    <td className="px-6 py-3 text-slate-600">{formatDate(r.date)}</td>
                    <td className="px-6 py-3">
                      <AttendanceBadge status={r.status} />
                    </td>
                    <td className="px-6 py-3 text-slate-600">{formatTime(r.check_in)}</td>
                    <td className="px-6 py-3 text-slate-600">{formatTime(r.check_out)}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
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
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
            <p className="text-sm text-slate-500">
              Page {pagination.page} of {pagination.pages} · {pagination.total} total
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
  );
}
