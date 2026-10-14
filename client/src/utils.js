export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

export const formatTime = (value) => {
  if (!value) return "—";
  const [hourStr, minute = "00"] = String(value).split(":");
  const hours = Number(hourStr);
  if (Number.isNaN(hours)) return "—";
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${minute} ${suffix}`;
};

export const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const toISODate = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const initials = (first = "", last = "") =>
  `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "?";

export const ROLE_TYPES = ["Faculty", "Staff", "Admin"];
export const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract"];
export const STATUSES = ["Active", "On Leave", "Resigned", "Retired"];
export const GENDERS = ["Male", "Female", "Other"];
export const ATTENDANCE_STATUSES = ["Present", "Late", "Absent", "On Leave", "Remote"];

export const statusStyles = {
  Active: "bg-emerald-100 text-emerald-700",
  "On Leave": "bg-amber-100 text-amber-700",
  Resigned: "bg-rose-100 text-rose-700",
  Retired: "bg-slate-200 text-slate-600",
};

export const attendanceStyles = {
  Present: "bg-emerald-100 text-emerald-700",
  Late: "bg-amber-100 text-amber-700",
  Absent: "bg-rose-100 text-rose-700",
  "On Leave": "bg-sky-100 text-sky-700",
  Remote: "bg-purple-100 text-purple-700",
};

export const roleStyles = {
  Faculty: "bg-brand-100 text-brand-700",
  Staff: "bg-sky-100 text-sky-700",
  Admin: "bg-purple-100 text-purple-700",
};

export const avatarPalette = [
  "bg-brand-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-sky-500",
  "bg-purple-500",
  "bg-teal-500",
];

export const colorForId = (id) => avatarPalette[Number(id) % avatarPalette.length];
