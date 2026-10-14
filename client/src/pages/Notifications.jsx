import { useCallback, useEffect, useState } from "react";
import api from "../api.js";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { FullPageSpinner } from "../components/Spinner.jsx";
import { useToast } from "../components/Toast.jsx";
import { CheckIcon, TrashIcon, RefreshIcon, BellIcon, ChevronLeft, ChevronRight } from "../components/Icons.jsx";
import { formatDateTime } from "../utils.js";

const FILTERS = ["All", "Unread", "Read"];
const PAGE_SIZE = 20;

const typeStyles = {
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  error: "bg-rose-100 text-rose-700",
  info: "bg-slate-100 text-slate-600",
};

export default function Notifications() {
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [unread, setUnread] = useState(0);

  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadUnread = useCallback(() => {
    api.getUnreadNotificationCount().then((res) => setUnread(res.count || 0)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: PAGE_SIZE };
    if (filter === "Unread") params.is_read = "false";
    if (filter === "Read") params.is_read = "true";
    api
      .listNotifications(params)
      .then((res) => {
        setRows(res.data);
        setPagination(res.pagination);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [filter, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadUnread();
  }, [loadUnread]);

  const markRead = async (n) => {
    try {
      await api.markNotificationRead(n.id);
      toast.success("Marked as read.");
      load();
      loadUnread();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const markAllRead = async () => {
    try {
      const res = await api.markAllNotificationsRead();
      toast.success(`Marked ${res.updated} as read.`);
      load();
      loadUnread();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      if (deleting === "read") {
        const res = await api.deleteReadNotifications();
        toast.success(`Deleted ${res.deleted} read notifications.`);
      } else {
        await api.deleteNotification(deleting.id);
        toast.success("Notification deleted.");
      }
      setDeleting(null);
      load();
      loadUnread();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmMessage =
    deleting === "read"
      ? "Delete all read notifications? This cannot be undone."
      : deleting
      ? `Delete notification "${deleting.title}"?`
      : "";

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Notifications</h2>
          <p className="mt-1 text-sm text-slate-500">
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-secondary" onClick={() => { load(); loadUnread(); }}>
            <RefreshIcon className="h-4 w-4" /> Refresh
          </button>
          <button className="btn-secondary" onClick={markAllRead} disabled={unread === 0}>
            <CheckIcon className="h-4 w-4" /> Mark all read
          </button>
          <button className="btn-secondary text-rose-600 hover:bg-rose-50" onClick={() => setDeleting("read")}>
            <TrashIcon className="h-4 w-4" /> Clear read
          </button>
        </div>
      </div>

      <div className="card flex flex-wrap gap-2 p-3">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filter === f ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card">
          <FullPageSpinner />
        </div>
      ) : rows.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <BellIcon className="h-10 w-10 text-slate-300" />
          <p className="mt-3 font-medium text-slate-600">No notifications</p>
          <p className="text-sm text-slate-400">You are all caught up.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((n) => (
            <div
              key={n.id}
              className={`card flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between ${
                n.is_read ? "" : "border-brand-200 bg-brand-50/40"
              }`}
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{n.title}</h3>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${typeStyles[n.type] || typeStyles.info}`}>
                    {n.type}
                  </span>
                  {!n.is_read && (
                    <span className="inline-flex rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
                      Unread
                    </span>
                  )}
                </div>
                {n.message && <p className="whitespace-pre-wrap text-sm text-slate-600">{n.message}</p>}
                <p className="text-xs text-slate-400">{formatDateTime(n.created_at)}</p>
                {n.link && (
                  <a
                    href={n.link}
                    className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View details →
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                {!n.is_read && (
                  <button className="btn-secondary px-2.5 py-1.5" onClick={() => markRead(n)}>
                    <CheckIcon className="h-4 w-4" /> Mark read
                  </button>
                )}
                <button
                  className="btn-secondary px-2.5 py-1.5 text-rose-600 hover:bg-rose-50"
                  onClick={() => setDeleting(n)}
                >
                  <TrashIcon className="h-4 w-4" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && rows.length > 0 && pagination.pages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.pages} · {pagination.total} total
          </p>
          <div className="flex items-center gap-2">
            <button className="btn-secondary px-2.5 py-1.5" disabled={pagination.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="btn-secondary px-2.5 py-1.5" disabled={pagination.page >= pagination.pages} onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={deleting === "read" ? "Clear Read Notifications" : "Delete Notification"}
        message={confirmMessage}
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
