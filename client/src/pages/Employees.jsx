import { useCallback, useEffect, useState } from "react";
import api from "../api/api.js";
import EmployeeForm from "../components/EmployeeForm.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { StatusBadge, RoleBadge } from "../components/Badge.jsx";
import { FullPageSpinner } from "../components/Spinner.jsx";
import { useToast } from "../components/Toast.jsx";
import { SearchIcon, PlusIcon, EditIcon, TrashIcon, ChevronLeft, ChevronRight } from "../components/Icons.jsx";
import { formatCurrency, formatDate, colorForId, ROLE_TYPES, STATUSES } from "../utils.js";
import RefreshButton from "../components/RefreshButton.jsx";

const PAGE_SIZE = 8;

export default function Employees() {
  const toast = useToast();

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [roleType, setRoleType] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ column: "created_at", order: "desc" });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    api.listDepartments().then(setDepartments).catch((e) => toast.error(e.message));
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
      .listEmployees({
        search: debouncedSearch,
        department_id: departmentId,
        status,
        role_type: roleType,
        page,
        limit: PAGE_SIZE,
        sort: sort.column,
        order: sort.order,
      })
      .then((res) => {
        setEmployees(res.data);
        setPagination(res.pagination);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [debouncedSearch, departmentId, status, roleType, page, sort, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSort = (column) => {
    setSort((s) =>
      s.column === column ? { column, order: s.order === "asc" ? "desc" : "asc" } : { column, order: "asc" }
    );
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (emp) => {
    setEditing(emp);
    setFormOpen(true);
  };

  const handleSubmit = async (data) => {
    if (editing) {
      await api.updateEmployee(editing.id, data);
      toast.success("Employee updated successfully.");
    } else {
      await api.createEmployee(data);
      toast.success("Employee created successfully.");
    }
    setFormOpen(false);
    setEditing(null);
    load();
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.deleteEmployee(deleting.id);
      toast.success("Employee deleted.");
      setDeleting(null);
      setPage(1);
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
    <div className="-m-4 min-h-[calc(100%-0rem)] bg-[#edf1f7] p-4 text-slate-900 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Employees</h2>
        </div>
        <div className="flex gap-2">
          <RefreshButton onClick={load} loading={loading} />
          <button className="btn-primary" onClick={openCreate}>
            <PlusIcon className="h-4 w-4" /> Add Employee
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/70 bg-[#1c2638] p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.55fr_1fr_1fr_auto]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-600/60 bg-[#111827] py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              placeholder="Search Employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Department</label>
            <select className="w-full rounded-lg border border-slate-600/60 bg-[#111827] px-3 py-2 text-sm text-slate-100" value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}>
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Status</label>
            <select className="w-full rounded-lg border border-slate-600/60 bg-[#111827] px-3 py-2 text-sm text-slate-100" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500" onClick={openCreate}>
              <span className="mr-1 text-lg">+</span> Add Employee
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700/70 bg-[#1c2638]">
        {loading ? (
          <FullPageSpinner />
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <SearchIcon className="h-10 w-10 text-slate-300" />
            <p className="mt-3 font-medium text-slate-600">No employees found</p>
            <p className="text-sm text-slate-400">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-slate-700/70 text-xs text-slate-300">
                <tr>
                  <th className="px-5 py-3 font-medium">Employee ID</th>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Department</th>
                  <th className="px-5 py-3 font-medium">Faculty</th>
                  <th className="px-5 py-3 font-medium">Position</th>
                  <th className="px-5 py-3 font-medium">Job Grade</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {employees.map((e) => (
                  <tr key={e.id} className="text-slate-200 hover:bg-slate-700/30">
                    <td className="px-5 py-3 text-xs text-slate-300">{e.staff_no}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-500 text-xs font-semibold text-white">
                          {e.first_name[0]}
                          {e.last_name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-slate-100">{e.first_name} {e.last_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-300">{e.department_name || "—"}</td>
                    <td className="px-5 py-3 text-slate-300">{e.role_type}</td>
                    <td className="px-5 py-3 text-slate-300">{e.position}</td>
                    <td className="px-5 py-3 text-slate-300">Grade VII</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                        e.status === "Active" ? "bg-emerald-500/20 text-emerald-300"
                        : e.status === "On Leave" ? "bg-amber-500/20 text-amber-300"
                        : "bg-red-500/20 text-red-300"
                      }`}>{e.status}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"
                          onClick={() => openEdit(e)}
                          title="Edit"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"
                          onClick={() => setDeleting(e)}
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

        {!loading && employees.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-700/60 px-5 py-3">
            <p className="text-xs text-slate-400">
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

      <EmployeeForm
        open={formOpen}
        initial={editing}
        departments={departments}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete Employee"
        message={deleting ? `Are you sure you want to delete ${deleting.first_name} ${deleting.last_name}? This action cannot be undone.` : ""}
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
      </div>
    </div>
  );
}
