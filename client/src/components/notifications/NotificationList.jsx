import NotificationItem from "./NotificationItem";

export default function NotificationList({ notifications, onRead }) {
  if (notifications.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <h3 className="text-lg font-semibold text-slate-800">
          No notifications
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          There are no notifications in this category yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRead={onRead}
        />
      ))}
    </div>
  );
}
