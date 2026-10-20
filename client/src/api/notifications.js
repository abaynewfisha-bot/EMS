const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_BASE}/notifications${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || `Request failed: ${response.status}`);
  }

  return result;
}

export function fetchNotifications({ page = 1, limit = 20, filter = "all" } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    filter,
  });

  return request(`?${params}`);
}

export function fetchUnreadCount() {
  return request("/unread-count");
}

export function markNotificationRead(id) {
  return request(`/${encodeURIComponent(id)}/read`, {
    method: "PATCH",
  });
}

export function markAllNotificationsRead() {
  return request("/read-all", { method: "PATCH" });
}

export function clearReadNotifications() {
  return request("/read", { method: "DELETE" });
}
