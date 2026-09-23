import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export const EmptyState = ({ title, description, action }: EmptyStateProps) => (
  <div className="rounded border border-dashed border-bayora-border bg-black/15 p-6 text-center">
    <p className="text-base font-semibold text-white">{title}</p>
    <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
  </div>
);
