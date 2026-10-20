import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  CheckCheck,
  RefreshCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import NotificationList from "../components/notifications/NotificationList";

import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  clearReadNotifications,
} from "../api/notifications";

const filters = ["all", "unread", "read"];

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    limit: 20,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [listResult, countResult] = await Promise.all([
        fetchNotifications({ page, limit: 20, filter }),
        fetchUnreadCount(),
      ]);

      setNotifications(listResult.data || []);
      setPagination(
        listResult.pagination || {
          total: 0,
          totalPages: 0,
          limit: 20,
        }
      );
      setUnreadCount(countResult.count || 0);
    } catch (err) {
      setError(err.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function runAction(action) {
    setActionLoading(true);
    setError("");

    try {
      await action();
      await loadData();
    } catch (err) {
      setError(err.message || "The action could not be completed.");
    } finally {
      setActionLoading(false);
    }
  }

  function changeFilter(nextFilter) {
    setFilter(nextFilter);
    setPage(1);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-100 p-3 text-indigo-700">
                <Bell size={25} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  Notifications
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Stay updated on your university activities.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading || actionLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Unread notifications</p>
            <p className="mt-2 text-3xl font-bold text-indigo-700">
              {unreadCount}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Notifications in this filter</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {pagination.total}
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter notifications">
              {filters.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => changeFilter(item)}
                  aria-pressed={filter === item}
                  className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
                    filter === item
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {item}
                  {item === "unread" && unreadCount > 0
                    ? ` (${unreadCount})`
                    : ""}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => runAction(markAllNotificationsRead)}
                disabled={loading || actionLoading || unreadCount === 0}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <CheckCheck size={16} />
                Mark all read
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Delete all read notifications?")) {
                    runAction(clearReadNotifications);
                  }
                }}
                disabled={loading || actionLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={16} />
                Clear read
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-slate-500">
              Loading notifications...
            </div>
          ) : (
            <NotificationList
              notifications={notifications}
              onRead={(id) =>
                runAction(() => markNotificationRead(id))
              }
            />
          )}

          <footer className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Page {page} of {Math.max(1, pagination.totalPages)}
              {" · "}
              {pagination.total} notifications
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={loading || page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <button
                type="button"
                onClick={() =>
                  setPage((current) =>
                    Math.min(
                      Math.max(1, pagination.totalPages),
                      current + 1
                    )
                  )
                }
                disabled={
                  loading ||
                  pagination.totalPages === 0 ||
                  page >= pagination.totalPages
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}
