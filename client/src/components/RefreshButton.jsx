import { RefreshIcon } from "./Icons.jsx";

export default function RefreshButton({ onClick, loading = false, label = "Refresh" }) {
  return (
    <button
      type="button"
      className="btn-secondary"
      onClick={onClick}
      disabled={loading}
      title={label}
    >
      <RefreshIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      {label}
    </button>
  );
}
