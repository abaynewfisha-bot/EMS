import { useEffect, useState } from "react";
import RefreshButton from "../components/RefreshButton.jsx";

const emptyGrade = { name: "", code: "", grade_level: "", min_salary: "", midpoint_salary: "", max_salary: "", currency: "USD" };

export default function SalaryScales() {
  const [grades, setGrades] = useState([]);
  const [report, setReport] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [increments, setIncrements] = useState([]);
  const [form, setForm] = useState(emptyGrade);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
    try {
      const [gradeRows, reportRows, assignmentRows, incrementRows] = await Promise.all([
        request("/salary/grades"),
        request("/salary/report"),
        request("/salary/assignments"),
        request("/salary/increments"),
      ]);
      setGrades(gradeRows);
      setReport(reportRows);
      setAssignments(assignmentRows);
      setIncrements(incrementRows);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { load(); }, []);

  const saveGrade = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await request(editing ? `/salary/grades/${editing.id}` : "/salary/grades", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({
          ...form,
          grade_level: Number(form.grade_level),
          min_salary: Number(form.min_salary),
          midpoint_salary: Number(form.midpoint_salary),
          max_salary: Number(form.max_salary),
        }),
      });
      setForm(emptyGrade);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const editGrade = (grade) => {
    setEditing(grade);
    setForm({
      name: grade.name,
      code: grade.code,
      grade_level: grade.grade_level,
      min_salary: grade.min_salary,
      midpoint_salary: grade.midpoint_salary,
      max_salary: grade.max_salary,
      currency: grade.currency,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Salary Scales</h2>
          <p className="mt-1 text-sm text-slate-500">Grades, progression steps, assignments, allowances, deductions, and increments</p>
        </div>
        <RefreshButton onClick={load} />
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="card p-5">
        <h3 className="mb-4 font-semibold text-slate-900">{editing ? "Update Salary Grade" : "Create Salary Grade"}</h3>
        <form onSubmit={saveGrade} className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-7">
          {[
            ["name", "Grade name"],
            ["code", "Code"],
            ["grade_level", "Level"],
            ["min_salary", "Minimum"],
            ["midpoint_salary", "Midpoint"],
            ["max_salary", "Maximum"],
            ["currency", "Currency"],
          ].map(([key, label]) => (
            <label key={key} className="text-xs font-medium text-slate-600">
              {label}
              <input
                className="input mt-1"
                type={["grade_level", "min_salary", "midpoint_salary", "max_salary"].includes(key) ? "number" : "text"}
                value={form[key]}
                onChange={(e) => setForm((old) => ({ ...old, [key]: e.target.value }))}
                required
              />
            </label>
          ))}
          <button className="btn-primary mt-auto" disabled={saving}>{editing ? "Update Grade" : "Create Grade"}</button>
        </form>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4"><h3 className="font-semibold text-slate-900">Grade Report</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>{["Grade","Version","Minimum","Midpoint","Maximum","Employees","Average"].map((h)=><th key={h} className="px-5 py-3">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.map((row) => <tr key={row.code}>
                <td className="px-5 py-3 font-medium text-slate-800">{row.grade} ({row.code})</td>
                <td className="px-5 py-3">{row.version}</td>
                <td className="px-5 py-3">{row.currency} {Number(row.min_salary).toLocaleString()}</td>
                <td className="px-5 py-3">{row.currency} {Number(row.midpoint_salary).toLocaleString()}</td>
                <td className="px-5 py-3">{row.currency} {Number(row.max_salary).toLocaleString()}</td>
                <td className="px-5 py-3">{row.assigned_employees}</td>
                <td className="px-5 py-3">{row.currency} {Number(row.average_salary).toLocaleString(undefined,{maximumFractionDigits:2})}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 font-semibold text-slate-900">Salary Grades</h3>
          <div className="space-y-2">
            {grades.map((grade) => (
              <button key={grade.id} onClick={() => editGrade(grade)} className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-left hover:bg-slate-50">
                <span><b>{grade.name}</b> · {grade.code}<br/><span className="text-xs text-slate-500">{grade.steps?.length || 0} progression steps</span></span>
                <span className="text-xs text-brand-600">Edit</span>
              </button>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h3 className="mb-3 font-semibold text-slate-900">Employee Assignments</h3>
          <div className="space-y-2">
            {assignments.filter((a) => a.is_active).map((assignment) => (
              <div key={assignment.id} className="flex justify-between rounded-lg border border-slate-200 px-4 py-3">
                <span>{assignment.staff_no} — {assignment.first_name} {assignment.last_name}<br/><span className="text-xs text-slate-500">{assignment.grade_name} · Step {assignment.step_number}</span></span>
                <b className="text-sm">{Number(assignment.base_salary).toLocaleString()}</b>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Increment History</h3>
        {increments.length === 0 ? <p className="text-sm text-slate-500">No salary increments recorded.</p> : (
          <div className="space-y-2">{increments.map((row) => (
            <div key={row.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
              <span>{row.staff_no} — {row.first_name} {row.last_name}<br/><span className="text-xs text-slate-500">{row.previous_grade || "New"} → {row.new_grade} · {row.status}</span></span>
              <b>{Number(row.previous_salary).toLocaleString()} → {Number(row.new_salary).toLocaleString()}</b>
            </div>
          ))}</div>
        )}
      </section>
    </div>
  );
}
