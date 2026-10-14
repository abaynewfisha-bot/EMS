import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import Spinner from "./Spinner.jsx";

const emptyForm = { name: "", code: "", head: "", location: "", description: "" };

export default function DepartmentForm({ open, initial, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...emptyForm, ...initial } : emptyForm);
      setError("");
    }
  }, [open, initial]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.code) {
      setError("Name and code are required.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={initial ? "Edit Department" : "Add New Department"}
      subtitle={initial ? initial.name : "Create a new department or unit"}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="department-form" className="btn-primary" disabled={saving}>
            {saving && <Spinner className="h-4 w-4 text-white" />}
            {initial ? "Save Changes" : "Create Department"}
          </button>
        </>
      }
    >
      <form id="department-form" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Department Name *</label>
            <input className="input" value={form.name} onChange={set("name")} placeholder="Computer Science" />
          </div>
          <div>
            <label className="label">Code *</label>
            <input className="input" value={form.code} onChange={set("code")} placeholder="CS" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Head of Department</label>
            <input className="input" value={form.head} onChange={set("head")} placeholder="Dr. Jane Doe" />
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" value={form.location} onChange={set("location")} placeholder="Block A, Floor 2" />
          </div>
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="input" rows="3" value={form.description} onChange={set("description")} placeholder="Brief description of the department" />
        </div>
      </form>
    </Modal>
  );
}
