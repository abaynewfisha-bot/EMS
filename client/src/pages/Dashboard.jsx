import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";
import StatCard from "../components/StatCard.jsx";
import { FullPageSpinner } from "../components/Spinner.jsx";
import { useToast } from "../components/Toast.jsx";
import {
  UsersIcon,
  GraduationIcon,
  BuildingIcon,
  MoneyIcon,
  ChevronRight,
} from "../components/Icons.jsx";
import { formatCurrency, formatDate, colorForId, roleStyles } from "../utils.js";

export default function Dashboard() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getStats()
      .then(setStats)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading) return <FullPageSpinner />;
  if (!stats) return null;

  const maxDept = Math.max(1, ...stats.by_department.map((d) => d.employee_count));
  const totalRoles = Math.max(1, stats.by_role.reduce((sum, r) => sum + r.count, 0));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-500">
          Overview of university staff, departments and payroll.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Employees" value={stats.total_employees} icon={UsersIcon} hint={`${stats.active} active`} />
        <StatCard label="Faculty" value={stats.faculty} icon={GraduationIcon} accent="bg-amber-50 text-amber-600" hint={`${stats.staff} staff · ${stats.admin} admin`} />
        <StatCard label="Departments" value={stats.department_count} icon={BuildingIcon} accent="bg-sky-50 text-sky-600" hint="Across the university" />
        <StatCard label="Monthly Payroll" value={formatCurrency(stats.total_salary)} icon={MoneyIcon} accent="bg-emerald-50 text-emerald-600" hint={`Avg ${formatCurrency(stats.avg_salary)}`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Employees by Department</h3>
            <Link to="/departments" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
              Manage <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {stats.by_department.map((d) => (
              <div key={d.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{d.name}</span>
                  <span className="text-slate-500">{d.employee_count} employees</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${colorForId(d.id)}`}
                    style={{ width: `${(d.employee_count / maxDept) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Workforce by Role</h3>
          <div className="space-y-4">
            {stats.by_role.map((r) => (
              <div key={r.role}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleStyles[r.role] || "bg-slate-100 text-slate-600"}`}>
                    {r.role}
                  </span>
                  <span className="font-semibold text-slate-700">{r.count}</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${(r.count / totalRoles) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-xs font-medium text-amber-600">On Leave</p>
              <p className="text-lg font-bold text-amber-700">{stats.on_leave}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">Avg. Salary</p>
              <p className="text-lg font-bold text-slate-700">{formatCurrency(stats.avg_salary)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">Recent Hires</h3>
          <Link to="/employees" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-3 font-semibold">Employee</th>
                <th className="px-6 py-3 font-semibold">Position</th>
                <th className="px-6 py-3 font-semibold">Department</th>
                <th className="px-6 py-3 font-semibold">Hire Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recent_hires.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white ${colorForId(e.id)}`}>
                        {e.first_name[0]}
                        {e.last_name[0]}
                      </div>
                      <span className="font-medium text-slate-700">
                        {e.first_name} {e.last_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-slate-600">{e.position}</td>
                  <td className="px-6 py-3 text-slate-600">{e.department_name || "—"}</td>
                  <td className="px-6 py-3 text-slate-600">{formatDate(e.hire_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
