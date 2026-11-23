import { useCallback, useEffect, useState } from "react";
import api from "../api/api.js";
import PayrollForm from "../components/PayrollForm.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { FullPageSpinner } from "../components/Spinner.jsx";
import { useToast } from "../components/Toast.jsx";
import { SearchIcon, PlusIcon, EditIcon, TrashIcon, ChevronLeft, ChevronRight, BankIcon } from "../components/Icons.jsx";
import { formatCurrency, formatDate, colorForId } from "../utils.js";
import RefreshButton from "../components/RefreshButton.jsx";

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
    <div className="-m-4 min-h-[calc(100%-0rem)] bg-[#edf1f7] p-4 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">Payroll Processing</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700" value={periodMonth} onChange={(e) => { setPeriodMonth(e.target.value); setPage(1); }}>
              <option value="">All Months</option>
              {MONTHS.map((month) => <option key={month.value} value={month.value}>{month.label} {periodYear}</option>)}
            </select>
            <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white" onClick={async () => {
              try {
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "/api"}/payroll/process`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ period_month: periodMonth ? Number(periodMonth) : undefined, period_year: Number(periodYear) }),
                });
                if (!response.ok) throw new Error("Unable to run payroll");
                toast.success("Payroll batch processed.");
                load();
              } catch (error) {
                toast.error(error.message);
              }
            }}>Run Payroll</button>
            <RefreshButton onClick={load} loading={loading} />
          </div>
        </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          ["Total Gross", rows.reduce((sum, row) => sum + Number(row.base_salary || 0), 0)],
          ["Total Deductions", rows.reduce((sum, row) => sum + Number(row.deductions || 0), 0)],
          ["Net Payable", rows.reduce((sum, row) => sum + Number(row.net_pay || 0), 0)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-700/80 bg-[#1c2638] p-5 text-white">
            <p className="text-sm text-slate-300">{label}</p>
            <p className="mt-2 text-2xl font-bold">{formatCurrency(value)}</p>
          </div>
        ))}
      </div>

      <div className="hidden">
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

      <div className="overflow-hidden rounded-xl border border-slate-700/70 bg-[#1c2638]">
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
            <div className="border-b border-slate-700/70 px-5 py-4">
              <h3 className="font-semibold text-white">Payroll Batch - {periodMonth ? `${MONTHS.find((month) => month.value === periodMonth)?.label} ` : ""}{periodYear}</h3>
            </div>
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="border-b border-slate-700/70 text-xs text-slate-300">
                <tr>
                  <th className="px-5 py-3 font-medium">Employee Name</th>
                  <th className="px-5 py-3 font-medium">Job Grade</th>
                  <th className="px-5 py-3 text-right font-medium">Basic Salary</th>
                  <th className="px-5 py-3 text-right font-medium">Allowances</th>
                  <th className="px-5 py-3 text-right font-medium">Deductions</th>
                  <th className="px-5 py-3 text-right font-medium">Net Pay</th>
                  <th className="px-5 py-3 font-medium">Approval Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {rows.map((r) => (
                  <tr key={r.id} className="text-slate-200 hover:bg-slate-700/30">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-500 text-xs font-semibold text-white">
                          {r.first_name?.[0]}
                          {r.last_name?.[0]}
                        </div>
                        <p className="font-medium text-slate-100">{r.first_name} {r.last_name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-300">Grade {((r.employee_id % 5) + 3)}</td>
                    <td className="px-5 py-3 text-right text-slate-300">{formatCurrency(r.base_salary)}</td>
                    <td className="px-5 py-3 text-right text-slate-300">{formatCurrency(r.allowances)}</td>
                    <td className="px-5 py-3 text-right text-slate-300">{formatCurrency(r.deductions)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-100">{formatCurrency(r.net_pay)}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                        r.status === "Paid" ? "bg-emerald-500/20 text-emerald-300"
                        : r.status === "Processing" ? "bg-sky-500/20 text-sky-300"
                        : "bg-amber-500/20 text-amber-300"
                      }`}>
                        {r.approval_status || r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
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
    </div>
  );
}
