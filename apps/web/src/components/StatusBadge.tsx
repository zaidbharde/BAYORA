interface StatusBadgeProps {
  status: string;
}

const toneClasses: Record<string, string> = {
  online: "border-bayora-signal/30 bg-bayora-signal/10 text-bayora-signal",
  local: "border-bayora-signal/30 bg-bayora-signal/10 text-bayora-signal",
  ready: "border-bayora-signal/30 bg-bayora-signal/10 text-bayora-signal",
  operational: "border-bayora-signal/30 bg-bayora-signal/10 text-bayora-signal",
  allow: "border-bayora-signal/30 bg-bayora-signal/10 text-bayora-signal",
  monitor: "border-bayora-warn/30 bg-bayora-warn/10 text-bayora-warn",
  block: "border-bayora-alert/30 bg-bayora-alert/10 text-bayora-alert",
  running: "border-bayora-warn/30 bg-bayora-warn/10 text-bayora-warn",
  pending: "border-slate-600 bg-slate-900/60 text-slate-300",
  completed: "border-bayora-signal/30 bg-bayora-signal/10 text-bayora-signal",
  blocked: "border-bayora-alert/30 bg-bayora-alert/10 text-bayora-alert",
  failed: "border-bayora-alert/30 bg-bayora-alert/10 text-bayora-alert",
  monitoring: "border-bayora-warn/30 bg-bayora-warn/10 text-bayora-warn",
  disconnected: "border-bayora-alert/30 bg-bayora-alert/10 text-bayora-alert",
  degraded: "border-bayora-warn/30 bg-bayora-warn/10 text-bayora-warn",
  idle: "border-slate-600 bg-slate-900/60 text-slate-300"
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const className = toneClasses[status.toLowerCase()] ?? toneClasses.idle;

  return <span className={`inline-flex items-center rounded border px-2.5 py-1 text-xs uppercase tracking-wide ${className}`}>{status}</span>;
};
