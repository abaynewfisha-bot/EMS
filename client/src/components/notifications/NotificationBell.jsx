
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function NotificationsBell() {
  const [count, setCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    async function loadCount() {
      try {
        const response = await fetch(`${API}/notifications/unread-count`);
        if (!response.ok) throw new Error("Could not load unread count");

        const result = await response.json();
        if (active) {
          setCount(Number(result.unreadCount ?? result.count ?? 0));
        }
      } catch (error) {
        console.error("Notifications badge:", error.message);
      }
    }

    loadCount();
    const timer = setInterval(loadCount, 30000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => navigate("/notifications")}
      aria-label={`Notifications, ${count} unread`}
      className="relative rounded-full p-2 hover:bg-gray-100"
    >
      <Bell size={22} />

      {count > 0 && (
        <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-xs text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
