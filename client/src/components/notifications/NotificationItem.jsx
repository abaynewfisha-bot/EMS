import { Check, Bell, Calendar, Wallet, ClipboardList } from "lucide-react";
import NotificationsBell from "../notifications/NotificationBell";
const icons = {
  general: Bell,
  leave: Calendar,
  attendance: ClipboardList,
  payroll: Wallet,
};

export default function NotificationItem({ notification, onRead }) {
  const Icon = icons[notification.type] || Bell;

  return (
    <article
      className={`flex gap-4 rounded-xl border p-4 transition ${
        notification.isRead
          ? "border-slate-200 bg-white"
          : "border-indigo-200 bg-indigo-50/70"
      }`}
      >
    <NotificationsBell />
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
        <Icon size={21} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-slate-900">
            {notification.title}
          </h3>

          {!notification.isRead && (
            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs text-white">
              Unread
            </span>
          )}
        </div>

        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
          {notification.message}
        </p>

        <p className="mt-2 text-xs text-slate-500">
          {new Date(notification.createdAt).toLocaleString()}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          {notification.link && (
            <a
              href={notification.link}
              className="text-sm font-medium text-indigo-700 underline"
            >
              View details
            </a>
          )}

          {!notification.isRead && (
            <button
              type="button"
              onClick={() => onRead(notification.id)}
              className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-900"
            >
              <Check size={16} />
              Mark as read
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
