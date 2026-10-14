import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import Spinner from "./Spinner.jsx";
import { ROLE_TYPES, EMPLOYMENT_TYPES, STATUSES, GENDERS } from "../utils.js";

const emptyForm = {
  staff_no: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  gender: "Male",
  position: "",
  role_type: "Staff",
  employment_type: "Full-time",
  status: "Active",
  salary: "",
  hire_date: new Date().toISOString().slice(0, 10),
  address: "",
  department_id: "",
};

export default function EmployeeForm({ open, initial, departments, onClose, onSubmit }) {
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
              salary: initial.salary ?? "",
              department_id: initial.department_id ?? "",
              hire_date: initial.hire_date ? String(initial.hire_date).slice(0, 10) : emptyForm.hire_date,
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

    if (!form.first_name || !form.last_name || !form.email || !form.position || !form.staff_no) {
      setError("Please fill in staff number, name, email and position.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        ...form,
        salary: form.salary === "" ? 0 : Number(form.salary),
        department_id: form.department_id === "" ? null : Number(form.department_id),
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
      title={initial ? "Edit Employee" : "Add New Employee"}
      subtitle={initial ? `${initial.first_name} ${initial.last_name} · ${initial.staff_no}` : "Create a new staff or faculty record"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="employee-form" className="btn-primary" disabled={saving}>
            {saving && <Spinner className="h-4 w-4 text-white" />}
            {initial ? "Save Changes" : "Create Employee"}
          </button>
        </>
      }
    >
      <form id="employee-form" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Staff No. *</label>
            <input className="input" value={form.staff_no} onChange={set("staff_no")} placeholder="UNI-0001" />
          </div>
          <div>
            <label className="label">First Name *</label>
            <input className="input" value={form.first_name} onChange={set("first_name")} placeholder="John" />
          </div>
          <div>
            <label className="label">Last Name *</label>
            <input className="input" value={form.last_name} onChange={set("last_name")} placeholder="Doe" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input" value={form.email} onChange={set("email")} placeholder="john.doe@uni.edu" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={set("phone")} placeholder="+234 800 000 0000" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Position *</label>
            <input className="input" value={form.position} onChange={set("position")} placeholder="Lecturer I" />
          </div>
          <div>
            <label className="label">Department</label>
            <select className="input" value={form.department_id} onChange={set("department_id")}>
              <option value="">Unassigned</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Role Type</label>
            <select className="input" value={form.role_type} onChange={set("role_type")}>
              {ROLE_TYPES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Employment</label>
            <select className="input" value={form.employment_type} onChange={set("employment_type")}>
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={set("status")}>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Salary (USD)</label>
            <input type="number" min="0" step="100" className="input" value={form.salary} onChange={set("salary")} placeholder="0" />
          </div>
          <div>
            <label className="label">Hire Date</label>
            <input type="date" className="input" value={form.hire_date} onChange={set("hire_date")} />
          </div>
          <div>
            <label className="label">Gender</label>
            <select className="input" value={form.gender} onChange={set("gender")}>
              {GENDERS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Address</label>
          <textarea className="input" rows="2" value={form.address} onChange={set("address")} placeholder="Home address" />
        </div>
      </form>
    </Modal>
  );
}
