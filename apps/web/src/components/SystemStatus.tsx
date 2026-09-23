import { Wifi, WifiOff } from "lucide-react";
import { useSystemHealth } from "../hooks/useSystemHealth";

export const SystemStatus = () => {
  const health = useSystemHealth();
  const isOnline = health.status === "online";
  const statusText = isOnline ? "Operational" : health.status === "checking" ? "Checking" : "Service Unavailable";

  return (
    <section className="rounded border border-bayora-border bg-bayora-panel p-5" aria-label="System status">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">API Status</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold text-white">{statusText}</h2>
            <span
              className={`inline-flex items-center gap-2 rounded border px-2.5 py-1 text-xs uppercase tracking-wide ${
                isOnline
                  ? "border-bayora-signal/30 bg-bayora-signal/10 text-bayora-signal"
                  : "border-bayora-alert/30 bg-bayora-alert/10 text-bayora-alert"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-bayora-signal" : "bg-bayora-alert"}`} />
              API {isOnline ? "online" : health.status}
            </span>
          </div>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded border ${
            isOnline
              ? "border-bayora-signal/40 bg-bayora-signal/10 text-bayora-signal"
              : "border-bayora-alert/40 bg-bayora-alert/10 text-bayora-alert"
          }`}
        >
          {isOnline ? <Wifi className="h-5 w-5" aria-hidden="true" /> : <WifiOff className="h-5 w-5" aria-hidden="true" />}
        </div>
      </div>
      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded border border-bayora-border bg-black/15 p-3">
          <p className="text-slate-500">API Service</p>
          <p className="mt-1 font-medium text-slate-100">{health.data?.service ?? "bayora-api"}</p>
        </div>
        <div className="rounded border border-bayora-border bg-black/15 p-3">
          <p className="text-slate-500">Mode</p>
          <p className="mt-1 font-medium text-slate-100">Security Operations</p>
        </div>
        <div className="rounded border border-bayora-border bg-black/15 p-3">
          <p className="text-slate-500">Live Events</p>
          <p className="mt-1 font-medium text-slate-100">Ready</p>
        </div>
      </div>
    </section>
  );
};
