const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

function buildQuery(params = {}) {
  return new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== "" && v != null)
  ).toString();
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (res.status === 204) return null;

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || `Request failed (${res.status})`);
    err.response = { data: body, status: res.status };
    throw err;
  }
  return body;
}

export const api = {
  // Dashboard
  getStats: () => request("/dashboard/stats"),

  // Employees
  listEmployees: (params = {}) => {
    const qs = buildQuery(params);
    return request(`/employees${qs ? `?${qs}` : ""}`);
  },
  getEmployee: (id) => request(`/employees/${id}`),
  createEmployee: (data) => request("/employees", { method: "POST", body: JSON.stringify(data) }),
  updateEmployee: (id, data) =>
    request(`/employees/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteEmployee: (id) => request(`/employees/${id}`, { method: "DELETE" }),

  // Departments
  listDepartments: () => request("/departments"),
  createDepartment: (data) => request("/departments", { method: "POST", body: JSON.stringify(data) }),
  updateDepartment: (id, data) =>
    request(`/departments/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteDepartment: (id) => request(`/departments/${id}`, { method: "DELETE" }),

  // Attendance
  listAttendance: (params = {}) => {
    const qs = buildQuery(params);
    return request(`/attendance${qs ? `?${qs}` : ""}`);
  },
  getAttendanceSummary: (params = {}) => {
    const qs = buildQuery(params);
    return request(`/attendance/summary${qs ? `?${qs}` : ""}`);
  },
  createAttendance: (data) => request("/attendance", { method: "POST", body: JSON.stringify(data) }),
  updateAttendance: (id, data) =>
    request(`/attendance/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteAttendance: (id) => request(`/attendance/${id}`, { method: "DELETE" }),

  // Payroll
  listPayroll: (params = {}) => {
    const qs = buildQuery(params);
    return request(`/payroll${qs ? `?${qs}` : ""}`);
  },
  createPayroll: (data) => request("/payroll", { method: "POST", body: JSON.stringify(data) }),
  updatePayroll: (id, data) =>
    request(`/payroll/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePayroll: (id) => request(`/payroll/${id}`, { method: "DELETE" }),

  // Notifications
  listNotifications: (params = {}) => {
    const qs = buildQuery(params);
    return request(`/notifications${qs ? `?${qs}` : ""}`);
  },
  getUnreadNotificationCount: () => request("/notifications/unread-count"),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () => request("/notifications/read-all", { method: "PATCH" }),
  deleteNotification: (id) => request(`/notifications/${id}`, { method: "DELETE" }),
  deleteReadNotifications: () => request("/notifications/read", { method: "DELETE" }),

  // Settings
  getSettings: () => request("/settings"),
  updateSettings: (data) => request("/settings", { method: "PUT", body: JSON.stringify(data) }),
};

export default api;
