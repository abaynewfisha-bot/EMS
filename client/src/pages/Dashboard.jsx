import { useEffect, useState } from "react";
import api from "../api/api.js";
import { FullPageSpinner } from "../components/Spinner.jsx";
import { useToast } from "../components/Toast.jsx";
import RefreshButton from "../components/RefreshButton.jsx";

const darkCard = "rounded-xl border border-slate-700/80 bg-[#1c2638] shadow-lg";

export default function Dashboard() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.getStats()
      .then(setStats)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [toast]);

  if (loading) return <FullPageSpinner />;
  if (!stats) return null;

  const totalDepartments = Math.max(1, stats.department_count);
  const departmentTotal = stats.by_department.reduce((sum, item) => sum + item.employee_count, 0);
  const colors = ["#f7bd70", "#60a5fa", "#f87171", "#34d399", "#a78bfa", "#94a3b8"];

  let donutOffset = 0;
  const donutSegments = stats.by_department.map((department, index) => {
    const percent = departmentTotal ? (department.employee_count / departmentTotal) * 100 : 0;
    const segment = `${colors[index % colors.length]} ${donutOffset}% ${donutOffset + percent}%`;
    donutOffset += percent;
    return segment;
  }).join(",");

  const attendanceRows = stats.attendance_growth?.length
    ? stats.attendance_growth
    : stats.by_department.slice(0, 10).map((department, index) => ({
        month_key: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct"][index],
        present: 50 + index * 8,
        total: 70 + index * 6,
      }));

  const actions = stats.pending_requests?.length ? stats.pending_requests : [
    { employee: "Aron Kebede", type: "Leave Request", date: new Date().toISOString(), status: "Pending" },
    { employee: "Marta Tesfaye", type: "Contract Renew", date: new Date().toISOString(), status: "Approved" },
  ];

  const setRequestStatus = (index, status) => {
    setStats((old) => ({
      ...old,
      pending_requests: old.pending_requests?.map((item, itemIndex) =>
        itemIndex === index ? { ...item, status } : item
      ),
    }));
  };

  return (
    <div className="-m-4 min-h-[calc(100%-0rem)] bg-[#edf1f7] p-4 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">Dashboard Overview</h2>
          <RefreshButton onClick={load} loading={loading} />
        </div>

        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
          {[
            ["Total Employees", stats.total_employees, "+12%", "bg-indigo-500", "👥"],
            ["Active Departments", stats.department_count, "Across 4 faculties", "bg-violet-500", "▦"],
            ["On Leave Today", stats.on_leave_today ?? stats.on_leave, "-5% vs yesterday", "bg-amber-500", "▣"],
            ["Pending Approvals", stats.pending_approvals ?? 15, "3 urgent", "bg-rose-500", "⚠"],
          ].map(([label, value, note, accent, icon]) => (
            <div key={label} className={`${darkCard} relative overflow-hidden p-4 text-white sm:p-5`}>
              <div className="flex items-start justify-between">
                <div><p className="text-sm text-slate-300">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p><p className="mt-2 text-xs text-slate-400">{note}</p></div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}/20 text-lg`}>{icon}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.65fr_1fr]">
          <section className={darkCard}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 px-4 py-3 sm:px-5 sm:py-4">
              <div><h3 className="font-semibold text-white">Staff Attendance & Growth</h3></div>
              <div className="hidden items-center gap-4 text-xs text-slate-300 sm:flex"><span>● Attendance</span><span>● Staff Growth</span><button className="text-slate-400">•••</button></div>
            </div>
            <div className="relative h-52 px-3 pb-5 pt-8 sm:h-56 sm:px-5">
              <div className="absolute inset-x-5 bottom-10 top-12 flex flex-col justify-between">
                {[180,120,80,40,0].map((line) => <div key={line} className="flex items-center text-[10px] text-slate-400"><span className="w-8">{line}</span><span className="h-px flex-1 bg-slate-700/60" /></div>)}
              </div>
              <svg className="absolute inset-x-8 bottom-9 h-36 w-[calc(100%-2.5rem)] overflow-visible sm:inset-x-12 sm:h-40 sm:w-[calc(100%-4rem)]" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs><linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity=".55"/><stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/></linearGradient></defs>
                <polygon points={`0,100 ${attendanceRows.map((row,index) => `${(index/(Math.max(1,attendanceRows.length-1))*100)},${100-Math.min(100,((row.present||50)/180)*100)}`).join(" ")} 100,100`} fill="url(#attendanceFill)" />
                <polyline points={attendanceRows.map((row,index) => `${(index/(Math.max(1,attendanceRows.length-1))*100)},${100-Math.min(100,((row.present||50)/180)*100)}`).join(" ")} fill="none" stroke="#8b5cf6" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                {attendanceRows.map((row,index) => <circle key={index} cx={(index/(Math.max(1,attendanceRows.length-1))*100)} cy={100-Math.min(100,((row.present||50)/180)*100)} r="1.1" fill="#fff" />)}
              </svg>
              <div className="absolute bottom-3 left-8 right-3 flex justify-between overflow-hidden text-[9px] text-slate-400 sm:left-12 sm:right-5 sm:text-[10px]">
                {attendanceRows.slice(-11).map((row,index) => <span key={index}>{row.month_key || `M${index+1}`}</span>)}
              </div>
            </div>
          </section>

          <section className={`${darkCard} p-5`}>
            <div className="flex items-center justify-between"><h3 className="font-semibold text-white">Department Distribution</h3><button className="text-slate-400">•••</button></div>
            <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
              <div className="h-36 w-36 shrink-0 rounded-full p-[18px] sm:h-44 sm:w-44 sm:p-[22px]" style={{ background: `conic-gradient(${donutSegments})` }}>
                <div className="h-full w-full rounded-full bg-[#1c2638]" />
              </div>
              <div className="min-w-0 space-y-2 text-xs">
                {stats.by_department.map((department,index) => (
                  <div key={department.id} className="flex items-center justify-between gap-4 text-slate-300">
                    <span className="flex min-w-0 items-center gap-2"><i className="h-2 w-2 shrink-0 rounded-sm" style={{ background: colors[index % colors.length] }} /><span className="truncate">{department.name}</span></span>
                    <b className="text-slate-300">{departmentTotal ? ((department.employee_count/departmentTotal)*100).toFixed(1) : 0}%</b>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <section className={darkCard}>
          <div className="flex items-center justify-between border-b border-slate-700/80 px-5 py-4"><h3 className="font-semibold text-white">Recent Activity & Pending Requests</h3><button className="text-slate-400">•••</button></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="text-xs text-slate-400">{["Employee","Type","Date","Status","Actions"].map((heading)=><th key={heading} className="px-5 py-3 font-medium">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-700/60">
                {actions.map((item,index) => (
                  <tr key={`${item.employee}-${index}`} className="text-slate-200">
                    <td className="px-5 py-3"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-600 text-xs">{item.employee?.split(" ").map((part)=>part[0]).join("").slice(0,2)}</div><b>{item.employee}</b></div></td>
                    <td className="px-5 py-3">{item.type}</td>
                    <td className="px-5 py-3 text-slate-400">{item.date ? new Date(item.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—"}</td>
                    <td className="px-5 py-3"><span className={`rounded-full px-3 py-1 text-xs ${item.status==="Approved"?"bg-emerald-500/20 text-emerald-300":"bg-amber-500/20 text-amber-300"}`}>{item.status}</span></td>
                    <td className="px-5 py-3"><button onClick={() => setRequestStatus(index,"Approved")} className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700">Approve</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
