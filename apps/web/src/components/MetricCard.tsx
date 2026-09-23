interface MetricCardProps {
  label: string;
  value: string;
  detail?: string;
}

export const MetricCard = ({ label, value, detail }: MetricCardProps) => (
  <div className="rounded border border-bayora-border bg-[#0D1420] p-4">
    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
    <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    {detail ? <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p> : null}
  </div>
);
