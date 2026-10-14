import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import Spinner from "./Spinner.jsx";
import { ATTENDANCE_STATUSES, toISODate } from "../utils.js";

const emptyForm = {
  employee_id: "",
  date: new Date().toISOString().slice(0, 10),
  status: "Present",
  check_in: "08:00",
  check_out: "17:00",
  notes: "",
};

export default function AttendanceForm({ open, initial, employees, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              ...emptyForm,
              ...initial,
              employee_id: initial.employee_id ?? "",
              date: initial.date ? toISODate(initial.date) : emptyForm.date,
              check_in: initial.check_in ? String(initial.check_in).slice(0, 5) : "",
              check_out: initial.check_out ? String(initial.check_out).slice(0, 5) : "",
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

    if (!form.employee_id || !form.date) {
      setError("Please select an employee and a date.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        ...form,
        employee_id: Number(form.employee_id),
        check_in: form.check_in || null,
        check_out: form.check_out || null,
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
      title={initial ? "Edit Attendance" : "Mark Attendance"}
      subtitle={
        initial
          ? `${initial.first_name} ${initial.last_name} · ${toISODate(initial.date)}`
          : "Record attendance for a staff or faculty member"
      }
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="attendance-form" className="btn-primary" disabled={saving}>
            {saving && <Spinner className="h-4 w-4 text-white" />}
            {initial ? "Save Changes" : "Save Record"}
          </button>
        </>
      }
    >
      <form id="attendance-form" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Employee *</label>
            <select className="input" value={form.employee_id} onChange={set("employee_id")}>
              <option value="">Select employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.staff_no})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date *</label>
            <input type="date" className="input" value={form.date} onChange={set("date")} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={set("status")}>
              {ATTENDANCE_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Check In</label>
            <input type="time" className="input" value={form.check_in} onChange={set("check_in")} />
          </div>
          <div>
            <label className="label">Check Out</label>
            <input type="time" className="input" value={form.check_out} onChange={set("check_out")} />
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
