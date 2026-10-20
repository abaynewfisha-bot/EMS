import { useCallback, useEffect, useState } from "react";
import api from "../api/api.js";
import EmployeeForm from "../components/EmployeeForm.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { StatusBadge, RoleBadge } from "../components/Badge.jsx";
import { FullPageSpinner } from "../components/Spinner.jsx";
import { useToast } from "../components/Toast.jsx";
import { SearchIcon, PlusIcon, EditIcon, TrashIcon, ChevronLeft, ChevronRight } from "../components/Icons.jsx";
import { formatCurrency, formatDate, colorForId, ROLE_TYPES, STATUSES } from "../utils.js";

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
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Employees</h2>
          <p className="mt-1 text-sm text-slate-500">{pagination.total} staff and faculty records</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <PlusIcon className="h-4 w-4" /> Add Employee
        </button>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search by name, email, staff no or position..."
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
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Role:</span>
          <button
            className={`rounded-full px-3 py-1 text-xs font-medium ${roleType === "" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            onClick={() => { setRoleType(""); setPage(1); }}
          >
            All
          </button>
          {ROLE_TYPES.map((r) => (
            <button
              key={r}
              className={`rounded-full px-3 py-1 text-xs font-medium ${roleType === r ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              onClick={() => { setRoleType(r); setPage(1); }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
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
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <SortHeader column="first_name">Employee</SortHeader>
                  <th className="px-6 py-3 font-semibold">Staff No.</th>
                  <SortHeader column="position">Position</SortHeader>
                  <th className="px-6 py-3 font-semibold">Department</th>
                  <th className="px-6 py-3 font-semibold">Role</th>
                  <SortHeader column="salary">Salary</SortHeader>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white ${colorForId(e.id)}`}>
                          {e.first_name[0]}
                          {e.last_name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">
                            {e.first_name} {e.last_name}
                          </p>
                          <p className="text-xs text-slate-400">{e.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-500">{e.staff_no}</td>
                    <td className="px-6 py-3 text-slate-600">
                      <p>{e.position}</p>
                      <p className="text-xs text-slate-400">{e.employment_type}</p>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{e.department_name || "—"}</td>
                    <td className="px-6 py-3">
                      <RoleBadge role={e.role_type} />
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-700">{formatCurrency(e.salary)}</td>
                    <td className="px-6 py-3">
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                          onClick={() => openEdit(e)}
                          title="Edit"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
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
  );
}
