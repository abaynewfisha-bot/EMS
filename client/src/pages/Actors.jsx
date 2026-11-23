import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import RefreshButton from "../components/RefreshButton.jsx";

const titles = {
  users: "Users",
  "refresh-tokens": "Refresh Tokens",
  positions: "Positions",
  jobgrades: "Job Grades",
  faculty: "Faculty",
  contracts: "Contracts",
  "employment-history": "Employment History",
  education: "Education",
  "emergency-contacts": "Emergency Contacts",
  documents: "Documents",
  "leave-types": "Leave Types",
  "leave-balances": "Leave Balances",
  "leave-requests": "Leave Requests",
  "salary-scales": "Salary Scales",
  "performance-reviews": "Performance Reviews",
  publications: "Publications",
  "teaching-assignments": "Teaching Assignments",
  "audit-log": "Audit Log",
};

export default function Actors() {
  const params = useParams();
  const actor = params.actor || window.location.pathname.replace(/^\//, "").replace(/\/$/, "");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`${import.meta.env.VITE_API_BASE_URL || "/api"}/actors/${actor}?limit=100`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Unable to load records");
        return body;
      })
      .then((body) => setRows(body.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [actor]);

  const columns = rows.length
    ? Object.keys(rows[0]).filter((key) => !["password_hash", "token_hash"].includes(key))
    : [];

  const formatValue = (value) => {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{titles[actor] || actor}</h2>
          <p className="mt-1 text-sm text-slate-500">Database records for {titles[actor] || actor}</p>
        </div>
        <RefreshButton onClick={() => window.location.reload()} loading={loading} />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Loading records...</p>
        ) : error ? (
          <p className="p-6 text-sm text-red-600">{error}</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {columns.map((column) => (
                    <th key={column} className="whitespace-nowrap px-4 py-3 font-semibold">
                      {column.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    {columns.map((column) => (
                      <td key={column} className="max-w-xs whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatValue(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
