import { useEffect, useState } from "react";
import RefreshButton from "../components/RefreshButton.jsx";

const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const banks = [
  { name: "Commercial Bank of Ethiopia", shortName: "CBE" },
  { name: "Awash Bank", shortName: "Awash" },
  { name: "Dashen Bank", shortName: "Dashen" },
  { name: "Bank of Abyssinia", shortName: "Abyssinia" },
  { name: "Nib International Bank", shortName: "Nib" },
  { name: "Hibret Bank", shortName: "Hibret" },
  { name: "Wegagen Bank", shortName: "Wegagen" },
  { name: "Other Ethiopian Banks", shortName: "Other" },
];

export default function PayrollDashboard() {
  const [data, setData] = useState(null);
  const [selectedBank, setSelectedBank] = useState("Commercial Bank of Ethiopia");
  const [error, setError] = useState("");
  const base = import.meta.env.VITE_API_BASE_URL || "/api";

  const load = async () => {
    setError("");
    try {
      const res = await fetch(`${base}/payroll/dashboard/summary`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Unable to load payroll");
      setData(body);
    } catch (err) { setError(err.message); }
  };

  useEffect(() => { load(); }, []);

  const processPayroll = async () => {
    try {
      const res = await fetch(`${base}/payroll/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) throw new Error("Payroll processing failed");
      await load();
    } catch (err) { setError(err.message); }
  };

  const disbursePayroll = async () => {
    try {
      const res = await fetch(`${base}/payroll/disburse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bank_name: selectedBank }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Payroll disbursement failed");
      setError("");
      await load();
      alert(`${body.transferred} employee transfers sent. ${body.notifications} notifications created.`);
    } catch (err) { setError(err.message); }
  };

  if (!data) return <div className="p-6 text-sm text-slate-500">{error || "Loading payroll..."}</div>;

  const format = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Payroll Management</h2>
          <p className="text-sm text-slate-500">Human Resources / Payroll Dashboard</p>
        </div>
        <div className="flex gap-2">
          <RefreshButton onClick={load} loading={!data} />
          <button className="btn-primary" onClick={processPayroll}>Process Current Payroll</button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Gross Salary", data.gross_salary, "bg-sky-50 text-sky-700"],
          ["Net Payroll", data.net_pay, "bg-emerald-50 text-emerald-700"],
          ["Employees", data.employees, "bg-violet-50 text-violet-700"],
          ["Pending Payments", data.pending, "bg-orange-50 text-orange-700"],
        ].map(([label, value, style]) => (
          <div key={label} className="card flex items-center justify-between p-5">
            <div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{format(value)}</p></div>
            <div className={`rounded-xl px-3 py-2 text-sm font-bold ${style}`}>ETB</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div><h3 className="font-semibold text-slate-900">Payroll Processing Progress</h3><p className="text-sm text-slate-500">Current payroll completion</p></div>
            <b className="text-xl text-slate-900">{data.progress}%</b>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${data.progress}%` }} />
          </div>
          <p className="mt-3 text-sm text-slate-600">{data.approved} employees paid · {data.pending} remaining</p>

          <h3 className="mt-6 font-semibold text-slate-900">Recent Payroll Runs</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500"><tr>{["Month","Employees","Gross Salary","Net Salary","Status"].map(h=><th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.recent.slice(0, 6).map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-3">{months[(row.period_month || 1) - 1]} {row.period_year}</td>
                    <td className="px-3 py-3">1</td>
                    <td className="px-3 py-3">{format(row.base_salary)} ETB</td>
                    <td className="px-3 py-3">{format(row.net_pay)} ETB</td>
                    <td className="px-3 py-3"><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">{row.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-900">Bank Disbursement</h3>
          <p className="mt-1 text-sm text-slate-500">Select disbursement bank</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {banks.map((bank) => (
              <button
                key={bank.name}
                onClick={() => setSelectedBank(bank.name)}
                aria-pressed={selectedBank === bank.name}
                className={`rounded-lg border px-3 py-3 text-xs font-semibold ${
                  selectedBank === bank.name
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {bank.shortName === "CBE" ? "🇪🇹 CBE" : bank.shortName}
                <span className="mt-1 block text-[10px] font-normal">{bank.name}</span>
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Selected bank</p><p className="mt-1 font-semibold text-slate-800">{selectedBank}</p>
            <p className="mt-3 text-xs text-slate-500">Total transfer</p><p className="mt-1 text-xl font-bold text-slate-900">{format(data.net_pay)} ETB</p>
          </div>
          <button className="btn-primary mt-4 w-full" onClick={disbursePayroll}>Send Salary via {selectedBank}</button>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-slate-900">Payroll Calculation Summary</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Base Salary", data.gross_salary],
            ["Allowances", data.allowances],
            ["Gross Salary", Number(data.gross_salary)+Number(data.allowances)],
            ["Deductions", data.deductions],
            ["Net Salary", data.net_pay],
          ].map(([label,value]) => (
            <div key={label} className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-bold text-slate-900">{format(value)} ETB</p></div>
          ))}
        </div>
      </div>
    </div>
  );
}
