import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export const PageHeader = ({ eyebrow, title, description, actions }: PageHeaderProps) => (
  <div className="flex flex-col gap-4 rounded border border-bayora-border bg-[#0D1420] p-5 lg:flex-row lg:items-end lg:justify-between">
    <div>
      <p className="text-xs uppercase tracking-[0.26em] text-slate-500">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{description}</p>
    </div>
    {actions ? <div>{actions}</div> : null}
  </div>
);
