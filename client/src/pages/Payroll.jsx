import { useCallback, useEffect, useState } from "react";
import api from "../api.js";
import PayrollForm from "../components/PayrollForm.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { FullPageSpinner } from "../components/Spinner.jsx";
import { useToast } from "../components/Toast.jsx";
import { SearchIcon, PlusIcon, EditIcon, TrashIcon, ChevronLeft, ChevronRight, BankIcon } from "../components/Icons.jsx";
import { formatCurrency, formatDate, colorForId } from "../utils.js";

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1).padStart(2, "0"),
  label: new Date(2000, i, 1).toLocaleString("default", { month: "long" }),
}));

const STATUSES = ["Pending", "Processing", "Paid"];

const statusStyles2 = {
  Paid: "bg-emerald-100 text-emerald-700",
  Processing: "bg-sky-100 text-sky-700",
  Pending: "bg-amber-100 text-amber-700",
};

const PAGE_SIZE = 10;

export default function Payroll() {
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [periodMonth, setPeriodMonth] = useState("");
  const [periodYear, setPeriodYear] = useState(String(new Date().getFullYear()));
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    api
      .listEmployees({ limit: 200, sort: "first_name", order: "asc" })
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

  const load = useCallback(() => {
    setLoading(true);
    api
      .listPayroll({
        search: debouncedSearch,
        employee_id: employeeId,
        period_month: periodMonth,
        period_year: periodYear,
        status,
        page,
        limit: PAGE_SIZE,
      })
      .then((res) => {
        setRows(res.data);
        setPagination(res.pagination);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [debouncedSearch, employeeId, periodMonth, periodYear, status, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (payload) => {
    if (editing) {
      await api.updatePayroll(editing.id, payload);
      toast.success("Payroll updated.");
    } else {
      await api.createPayroll(payload);
      toast.success("Payroll created.");
    }
    setFormOpen(false);
    setEditing(null);
    load();
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.deletePayroll(deleting.id);
      toast.success("Payroll deleted.");
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Payroll</h2>
          <p className="mt-1 text-sm text-slate-500">{pagination.total} payroll records</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <PlusIcon className="h-4 w-4" /> Add Payroll
        </button>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search by name, staff no, position or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input" value={employeeId} onChange={(e) => { setEmployeeId(e.target.value); setPage(1); }}>
            <option value="">All Employees</option>
            {employees.map((em) => (
              <option key={em.id} value={em.id}>
                {em.staff_no} — {em.first_name} {em.last_name}
              </option>
            ))}
          </select>
          <select className="input" value={periodMonth} onChange={(e) => { setPeriodMonth(e.target.value); setPage(1); }}>
            <option value="">All Months</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min="2000"
              max="2100"
              className="input"
              placeholder="Year"
              value={periodYear}
              onChange={(e) => { setPeriodYear(e.target.value); setPage(1); }}
            />
            <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <FullPageSpinner />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BankIcon className="h-10 w-10 text-slate-300" />
            <p className="mt-3 font-medium text-slate-600">No payroll records</p>
            <p className="text-sm text-slate-400">Add a payroll period to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Employee</th>
                  <th className="px-6 py-3 font-semibold">Period</th>
                  <th className="px-6 py-3 text-right font-semibold">Base</th>
                  <th className="px-6 py-3 text-right font-semibold">Allowances</th>
                  <th className="px-6 py-3 text-right font-semibold">Deductions</th>
                  <th className="px-6 py-3 text-right font-semibold">Net Pay</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Paid Date</th>
                  <th className="px-6 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white ${colorForId(r.employee_id)}`}>
                          {r.first_name?.[0]}
                          {r.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">
                            {r.first_name} {r.last_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {r.staff_no} · {r.department_name || "Unassigned"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {String(r.period_month).padStart(2, "0")}/{r.period_year}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-600">{formatCurrency(r.base_salary)}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{formatCurrency(r.allowances)}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{formatCurrency(r.deductions)}</td>
                    <td className="px-6 py-3 text-right font-semibold text-slate-900">{formatCurrency(r.net_pay)}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyles2[r.status] || "bg-slate-100 text-slate-600"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{r.paid_date ? formatDate(r.paid_date) : "—"}</td>
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

        {!loading && rows.length > 0 && (
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

      <PayrollForm
        open={formOpen}
        initial={editing}
        employees={employees}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete Payroll"
        message={deleting ? `Delete payroll for ${deleting.first_name} ${deleting.last_name} (${String(deleting.period_month).padStart(2, "0")}/${deleting.period_year})?` : ""}
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
