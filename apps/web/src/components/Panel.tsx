import type { ReactNode } from "react";

interface PanelProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export const Panel = ({ title, subtitle, children, className = "" }: PanelProps) => (
  <section className={`rounded border border-bayora-border bg-bayora-panel p-5 ${className}`.trim()}>
    {title || subtitle ? (
      <div className="mb-4">
        {subtitle ? <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{subtitle}</p> : null}
        {title ? <h2 className="mt-1 text-lg font-semibold text-white">{title}</h2> : null}
      </div>
    ) : null}
    {children}
  </section>
);
