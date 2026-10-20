import { useEffect, useState } from "react";
import api from "../api/api.js";
import { FullPageSpinner } from "../components/Spinner.jsx";
import { useToast } from "../components/Toast.jsx";

const DEFAULTS = {
  org_name: "University EMS",
  org_short_name: "UniStaff",
  currency: "USD",
  timezone: "UTC",
  payroll_auto_compute: "true",
  enable_notifications: "true",
  theme: "light",
  support_email: "",
  address: "",
};

export default function Settings() {
  const toast = useToast();
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getSettings()
      .then((data) => setSettings((s) => ({ ...s, ...data })))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [toast]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((s) => ({
      ...s,
      [name]: type === "checkbox" ? (checked ? "true" : "false") : value,
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api.updateSettings(settings);
      setSettings((s) => ({ ...s, ...data }));
      toast.success("Settings saved.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <FullPageSpinner />;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="mt-1 text-sm text-slate-500">Configure system preferences</p>
      </div>

      <form onSubmit={save} className="space-y-5">
        <section className="card">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">Organization</h3>
            <p className="text-sm text-slate-500">Basic organization details</p>
          </div>
          <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
            <div>
              <label className="label">Organization Name</label>
              <input className="input" name="org_name" value={settings.org_name || ""} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Short Name</label>
              <input className="input" name="org_short_name" value={settings.org_short_name || ""} onChange={handleChange} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Address</label>
              <textarea className="input" name="address" rows={2} value={settings.address || ""} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Support Email</label>
              <input type="email" className="input" name="support_email" value={settings.support_email || ""} onChange={handleChange} />
            </div>
          </div>
        </section>

        <section className="card">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">System</h3>
            <p className="text-sm text-slate-500">Localization & preferences</p>
          </div>
          <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-3">
            <div>
              <label className="label">Currency</label>
              <input className="input" name="currency" value={settings.currency || ""} onChange={handleChange} placeholder="USD, PKR, EUR..." />
            </div>
            <div>
              <label className="label">Timezone</label>
              <input className="input" name="timezone" value={settings.timezone || ""} onChange={handleChange} placeholder="UTC, Asia/Karachi..." />
            </div>
            <div>
              <label className="label">Theme</label>
              <select className="input" name="theme" value={settings.theme || "light"} onChange={handleChange}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">Features</h3>
            <p className="text-sm text-slate-500">Toggle application behavior</p>
          </div>
          <div className="space-y-4 px-6 py-5">
            <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
              <div>
                <p className="text-sm font-medium text-slate-900">Auto-compute Payroll Net</p>
                <p className="text-xs text-slate-500">Automatically calculate Net = Base + Allowances − Deductions</p>
              </div>
              <input
                type="checkbox"
                name="payroll_auto_compute"
                checked={(settings.payroll_auto_compute || "true") === "true"}
                onChange={handleChange}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
            </label>

            <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
              <div>
                <p className="text-sm font-medium text-slate-900">Enable Notifications</p>
                <p className="text-xs text-slate-500">Allow system notifications across the app</p>
              </div>
              <input
                type="checkbox"
                name="enable_notifications"
                checked={(settings.enable_notifications || "true") === "true"}
                onChange={handleChange}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
            </label>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => { if (confirm("Reset to default settings?")) setSettings(DEFAULTS); }}>
            Reset Defaults
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
