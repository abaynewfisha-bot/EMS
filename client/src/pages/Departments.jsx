import { useEffect, useState } from "react";
import api from "../api.js";
import DepartmentForm from "../components/DepartmentForm.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { FullPageSpinner } from "../components/Spinner.jsx";
import { useToast } from "../components/Toast.jsx";
import { PlusIcon, EditIcon, TrashIcon, UsersIcon, BuildingIcon } from "../components/Icons.jsx";
import { colorForId } from "../utils.js";

export default function Departments() {
  const toast = useToast();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .listDepartments()
      .then(setDepartments)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (data) => {
    if (editing) {
      await api.updateDepartment(editing.id, data);
      toast.success("Department updated.");
    } else {
      await api.createDepartment(data);
      toast.success("Department created.");
    }
    setFormOpen(false);
    setEditing(null);
    load();
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.deleteDepartment(deleting.id);
      toast.success("Department deleted.");
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const totalEmployees = departments.reduce((sum, d) => sum + d.employee_count, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Departments</h2>
          <p className="mt-1 text-sm text-slate-500">
            {departments.length} departments · {totalEmployees} employees assigned
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <PlusIcon className="h-4 w-4" /> Add Department
        </button>
      </div>

      {loading ? (
        <FullPageSpinner />
      ) : departments.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <BuildingIcon className="h-10 w-10 text-slate-300" />
          <p className="mt-3 font-medium text-slate-600">No departments yet</p>
          <p className="text-sm text-slate-400">Create your first department to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {departments.map((d) => (
            <div key={d.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold text-white ${colorForId(d.id)}`}>
                    {d.code}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{d.name}</h3>
                    <p className="text-xs text-slate-400">{d.location || "No location set"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                    onClick={() => { setEditing(d); setFormOpen(true); }}
                    title="Edit"
                  >
                    <EditIcon className="h-4 w-4" />
                  </button>
                  <button
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => setDeleting(d)}
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="mt-3 line-clamp-2 flex-1 text-sm text-slate-500">
                {d.description || "No description provided."}
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                <span className="inline-flex items-center gap-1.5 text-slate-500">
                  <UsersIcon className="h-4 w-4" /> {d.employee_count} employees
                </span>
                <span className="text-slate-400">{d.head || "—"}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <DepartmentForm
        open={formOpen}
        initial={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete Department"
        message={deleting ? `Delete "${deleting.name}"? Employees in this department will be unassigned.` : ""}
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
