import type { Severity } from "@bayora/shared";

interface SeverityBadgeProps {
  severity: Severity;
}

const classes: Record<Severity, string> = {
  low: "border-slate-600 bg-slate-900/60 text-slate-300",
  medium: "border-bayora-warn/30 bg-bayora-warn/10 text-bayora-warn",
  high: "border-bayora-alert/30 bg-bayora-alert/10 text-bayora-alert",
  critical: "border-bayora-alert/50 bg-bayora-alert/15 text-bayora-alert"
};

export const SeverityBadge = ({ severity }: SeverityBadgeProps) => (
  <span className={`inline-flex items-center rounded border px-2.5 py-1 text-xs uppercase tracking-wide ${classes[severity]}`}>
    {severity}
  </span>
);
