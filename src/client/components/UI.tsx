import type { ReactNode } from "react";

export type StatusTone = "good" | "warn" | "bad" | "muted" | "signal";

export function StatusBadge({ label, tone = "muted" }: { label: string; tone?: StatusTone }) {
  return <span className={`status-badge status-${tone}`}>{label}</span>;
}

export function PageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-intro">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action ? <div className="page-intro-action">{action}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  kicker,
  action,
  children,
  className = "",
}: {
  title: string;
  kicker?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`.trim()}>
      <div className="panel-heading">
        <div>
          {kicker ? <p className="eyebrow panel-kicker">{kicker}</p> : null}
          <h2>{title}</h2>
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function ScopeNotice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" }) {
  return <div className={`scope-notice scope-${tone}`}>{children}</div>;
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-orbit" aria-hidden="true"><span /></span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  icon,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  type?: "button" | "submit";
}) {
  return (
    <button className="button button-primary" type={type} onClick={onClick} disabled={disabled}>
      {icon}{children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled = false,
  icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button className="button button-secondary" type="button" onClick={onClick} disabled={disabled}>
      {icon}{children}
    </button>
  );
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
