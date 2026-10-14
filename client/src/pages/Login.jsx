import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { GraduationIcon } from "../components/Icons.jsx";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }

    setSubmitting(true);
    const result = login(username.trim(), password);
    setSubmitting(false);

    if (result.ok) navigate("/", { replace: true });
    else setError(result.error);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
            <GraduationIcon className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">UniStaff</h1>
            <p className="text-sm text-slate-400">Employee Management System</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Sign in</h2>
            <p className="mt-0.5 text-sm text-slate-500">Enter your credentials to continue</p>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className="input"
              autoComplete="username"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                className="input pr-16"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-2 my-auto h-7 rounded-md px-2 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>

          <p className="rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
            Demo credentials — <span className="font-semibold text-slate-700">admin</span> /{" "}
            <span className="font-semibold text-slate-700">admin123</span>
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} University EMS. All rights reserved.
        </p>
      </div>
    </div>
  );
}
