import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal.jsx";
import Spinner from "./Spinner.jsx";

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1).padStart(2, "0"),
  label: new Date(2000, i, 1).toLocaleString("default", { month: "long" }),
}));

const PAYROLL_STATUSES = ["Pending", "Processing", "Paid"];

const emptyForm = {
  employee_id: "",
  period_month: String(new Date().getMonth() + 1).padStart(2, "0"),
  period_year: String(new Date().getFullYear()),
  base_salary: "",
  allowances: "0",
  deductions: "0",
  status: "Pending",
  paid_date: "",
  notes: "",
};

export default function PayrollForm({ open, initial, employees, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const netCalc = useMemo(() => {
    const b = Number(form.base_salary) || 0;
    const a = Number(form.allowances) || 0;
    const d = Number(form.deductions) || 0;
    return Math.max(0, b + a - d).toFixed(2);
  }, [form.base_salary, form.allowances, form.deductions]);

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              ...emptyForm,
              employee_id: String(initial.employee_id ?? ""),
              period_month: String(initial.period_month ?? emptyForm.period_month).padStart(2, "0"),
              period_year: String(initial.period_year ?? emptyForm.period_year),
              base_salary: String(initial.base_salary ?? ""),
              allowances: String(initial.allowances ?? "0"),
              deductions: String(initial.deductions ?? "0"),
              status: initial.status ?? "Pending",
              paid_date: initial.paid_date ? String(initial.paid_date).slice(0, 10) : "",
              notes: initial.notes ?? "",
            }
          : emptyForm
      );
      setError("");
    }
  }, [open, initial]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.employee_id) {
      setError("Please select an employee.");
      return;
    }
    if (!form.period_month || !form.period_year) {
      setError("Please select a payroll period.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        employee_id: Number(form.employee_id),
        period_month: Number(form.period_month),
        period_year: Number(form.period_year),
        base_salary: Number(form.base_salary) || 0,
        allowances: Number(form.allowances) || 0,
        deductions: Number(form.deductions) || 0,
        net_pay: Number(netCalc),
        status: form.status,
        paid_date: form.paid_date || null,
        notes: form.notes,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={initial ? "Edit Payroll" : "Add Payroll"}
      subtitle={
        initial
          ? `${initial.first_name} ${initial.last_name} · ${String(initial.period_month).padStart(2, "0")}/${initial.period_year}`
          : "Record a payroll period for a staff or faculty member"
      }
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="payroll-form" className="btn-primary" disabled={saving}>
            {saving && <Spinner className="h-4 w-4 text-white" />}
            {initial ? "Save Changes" : "Create Payroll"}
          </button>
        </>
      }
    >
      <form id="payroll-form" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div>
          <label className="label">Employee *</label>
          <select className="input" value={form.employee_id} onChange={set("employee_id")}>
            <option value="">Select employee</option>
            {employees.map((em) => (
              <option key={em.id} value={em.id}>
                {em.staff_no} — {em.first_name} {em.last_name} ({em.position})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Period Month *</label>
            <select className="input" value={form.period_month} onChange={set("period_month")}>
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.value} — {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Period Year *</label>
            <input
              type="number"
              min="2000"
              max="2100"
              className="input"
              value={form.period_year}
              onChange={set("period_year")}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Base Salary</label>
            <input type="number" step="0.01" min="0" className="input" value={form.base_salary} onChange={set("base_salary")} placeholder="0" />
          </div>
          <div>
            <label className="label">Allowances</label>
            <input type="number" step="0.01" min="0" className="input" value={form.allowances} onChange={set("allowances")} placeholder="0" />
          </div>
          <div>
            <label className="label">Deductions</label>
            <input type="number" step="0.01" min="0" className="input" value={form.deductions} onChange={set("deductions")} placeholder="0" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Net Pay (auto)</label>
            <input readOnly type="number" step="0.01" className="input bg-slate-50 text-slate-600" value={netCalc} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={set("status")}>
              {PAYROLL_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Paid Date</label>
            <input type="date" className="input" value={form.paid_date} onChange={set("paid_date")} />
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows="2" value={form.notes} onChange={set("notes")} placeholder="Optional notes" />
        </div>
      </form>
    </Modal>
  );
}
