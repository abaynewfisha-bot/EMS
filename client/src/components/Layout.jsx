import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { DashboardIcon, UsersIcon, BuildingIcon, GraduationIcon, CalendarIcon, MenuIcon, CloseIcon, BellIcon, CogIcon, BankIcon, LogoutIcon } from "./Icons.jsx";

const nav = [
  { to: "/", label: "Dashboard", icon: DashboardIcon, end: true },
  { to: "/employees", label: "Employees", icon: UsersIcon },
  { to: "/departments", label: "Departments", icon: BuildingIcon },
  { to: "/attendance", label: "Attendance", icon: CalendarIcon },
  { to: "/payroll", label: "Payroll", icon: BankIcon },
  { to: "/notifications", label: "Notifications", icon: BellIcon },
  { to: "/settings", label: "Settings", icon: CogIcon },
];

function SidebarContent({ onNavigate }) {
  return (
    <>
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
          <GraduationIcon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">UniStaff</p>
          <p className="text-xs text-slate-400">Employee Management</p>
        </div>
      </div>

      <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-brand-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-5 text-xs text-slate-500">
        <p className="font-semibold text-slate-400">University EMS</p>
        <p>&copy; {new Date().getFullYear()} All rights reserved.</p>
      </div>
    </>
  );
}

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.name || "Administrator";
  const displayRole = user?.role || "HR Manager";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <aside className="hidden w-64 shrink-0 flex-col bg-slate-900 lg:flex">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-slate-900">
            <button
              className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <CloseIcon />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
          <button
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>
          <div className="hidden lg:block">
            <h1 className="text-sm font-semibold text-slate-500">Welcome back, {displayName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-700">{displayName}</p>
              <p className="text-xs text-slate-400">{displayRole}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
              {initials}
            </div>
            <button
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
            >
              <LogoutIcon />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
