import { useEffect, useState } from "react";
import api from "../api/api.js";

const emptyForm = {
  employee_id: "",
  full_name: "",
  relationship: "Father",
  phone: "",
  email: "",
  address: "",
  is_primary: false,
};

export default function EmergencyContacts() {
  const [contacts, setContacts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const base = import.meta.env.VITE_API_BASE_URL || "/api";

  const request = async (path, options = {}) => {
    const res = await fetch(`${base}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "Request failed");
    return body;
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (departmentId) params.set("department_id", departmentId);
      const [contactBody, employeeBody, departmentBody] = await Promise.all([
        request(`/emergency-contacts${params.toString() ? `?${params}` : ""}`),
        api.listEmployees({ limit: 200 }),
        api.listDepartments(),
      ]);
      setContacts(contactBody.data || []);
      setEmployees(employeeBody.data || []);
      setDepartments(departmentBody || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [departmentId]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (contact) => {
    setEditing(contact);
    setForm({
      employee_id: String(contact.employee_id),
      full_name: contact.full_name,
      relationship: contact.relationship || "Father",
      phone: contact.phone || "",
      email: contact.email || "",
      address: contact.address || "",
      is_primary: Boolean(contact.is_primary),
    });
    setModalOpen(true);
  };

  const saveContact = async (event) => {
    event.preventEvent?.();
    event.preventDefault();
    setError("");
    try {
      await request(editing ? `/emergency-contacts/${editing.id}` : "/emergency-contacts", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({ ...form, employee_id: Number(form.employee_id) }),
      });
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteContact = async (contact) => {
    if (!window.confirm(`Delete emergency contact ${contact.full_name}?`)) return;
    try {
      await request(`/emergency-contacts/${contact.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="-m-4 min-h-[calc(100%-0rem)] bg-[#edf1f7] p-4 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-slate-900">Emergency Contacts</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                className="w-48 rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-3 text-sm text-slate-700 placeholder:text-slate-400 sm:w-64"
                placeholder="Search contacts..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500" onClick={openCreate}>
              + Add New Contact
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600">Department:</label>
          <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
            <option value="">All</option>
            {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <p className="rounded-xl border border-slate-700/70 bg-[#1c2638] p-6 text-sm text-slate-300">Loading contacts...</p>
        ) : contacts.length === 0 ? (
          <p className="rounded-xl border border-slate-700/70 bg-[#1c2638] p-6 text-sm text-slate-300">No emergency contacts found.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {contacts.map((contact) => (
              <article key={contact.id} className="rounded-xl border border-slate-700/80 bg-[#1c2638] p-5 text-slate-100 shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-400 text-xl text-slate-600">♙</div>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{contact.full_name} - {contact.relationship || "Contact"}</h3>
                      {contact.is_primary && <span className="mt-1 inline-block rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] text-indigo-300">Primary</span>}
                      {contact.department_name && <p className="mt-1 text-xs text-slate-400">{contact.department_name}</p>}
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-300">
                  <p><span className="mr-2">♟</span>{contact.relationship || "Not specified"}</p>
                  <p><span className="mr-2">☎</span>{contact.phone}</p>
                  {contact.email && <p className="truncate"><span className="mr-2">✉</span>{contact.email}</p>}
                  {contact.address && <p className="truncate"><span className="mr-2">⌖</span>{contact.address}</p>}
                  {contact.first_name && <p className="text-xs text-slate-400">Employee: {contact.first_name} {contact.last_name}</p>}
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700" onClick={() => openEdit(contact)}>Edit</button>
                  <button className="rounded-md border border-red-400/50 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10" onClick={() => deleteContact(contact)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(event) => event.target === event.currentTarget && setModalOpen(false)}>
          <form onSubmit={saveContact} className="w-full max-w-xl rounded-xl border border-slate-700 bg-[#1c2638] p-5 text-slate-100 shadow-2xl">
            <h3 className="text-lg font-semibold">{editing ? "Edit Emergency Contact" : "Add Emergency Contact"}</h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-xs text-slate-300">Employee
                <select className="mt-1 w-full rounded-lg border border-slate-600 bg-[#111827] px-3 py-2 text-sm" required value={form.employee_id} onChange={(event) => setForm((old) => ({ ...old, employee_id: event.target.value }))}>
                  <option value="">Select employee</option>
                  {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name}</option>)}
                </select>
              </label>
              <label className="text-xs text-slate-300">Full Name
                <input className="mt-1 w-full rounded-lg border border-slate-600 bg-[#111827] px-3 py-2 text-sm" required value={form.full_name} onChange={(event) => setForm((old) => ({ ...old, full_name: event.target.value }))} />
              </label>
              <label className="text-xs text-slate-300">Relationship
                <select className="mt-1 w-full rounded-lg border border-slate-600 bg-[#111827] px-3 py-2 text-sm" value={form.relationship} onChange={(event) => setForm((old) => ({ ...old, relationship: event.target.value }))}>
                  {["Father","Mother","Spouse","Sibling","Friend","Other"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="text-xs text-slate-300">Phone
                <input className="mt-1 w-full rounded-lg border border-slate-600 bg-[#111827] px-3 py-2 text-sm" required value={form.phone} onChange={(event) => setForm((old) => ({ ...old, phone: event.target.value }))} />
              </label>
              <label className="text-xs text-slate-300">Email
                <input type="email" className="mt-1 w-full rounded-lg border border-slate-600 bg-[#111827] px-3 py-2 text-sm" value={form.email} onChange={(event) => setForm((old) => ({ ...old, email: event.target.value }))} />
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300 sm:pt-5">
                <input type="checkbox" checked={form.is_primary} onChange={(event) => setForm((old) => ({ ...old, is_primary: event.target.checked }))} />
                Primary contact
              </label>
              <label className="text-xs text-slate-300 sm:col-span-2">Address
                <textarea className="mt-1 w-full rounded-lg border border-slate-600 bg-[#111827] px-3 py-2 text-sm" rows="2" value={form.address} onChange={(event) => setForm((old) => ({ ...old, address: event.target.value }))} />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="rounded-lg border border-slate-600 px-4 py-2 text-sm" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium">Save Contact</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
