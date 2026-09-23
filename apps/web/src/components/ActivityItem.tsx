import { Activity, AlertTriangle, CheckCircle2, ClipboardCheck, PlayCircle, ShieldAlert, Sparkles } from "lucide-react";
import type { ActivityItem as ActivityItemType } from "@bayora/shared";

interface ActivityItemProps {
  item: ActivityItemType;
}

const iconByType: Record<ActivityItemType["type"], typeof Activity> = {
  "test.created": Sparkles,
  "test.started": PlayCircle,
  "policy.evaluated": ClipboardCheck,
  "threat.detected": ShieldAlert,
  "test.completed": CheckCircle2,
  "audit.recorded": Activity
};

export const ActivityItem = ({ item }: ActivityItemProps) => {
  const Icon = iconByType[item.type];

  return (
    <div className="flex gap-3 rounded border border-bayora-border bg-[#0D1420] p-4">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded border border-bayora-border bg-black/20 text-bayora-signal">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-white">{item.title}</p>
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.type.replaceAll(".", " ")}</span>
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-400">{item.detail}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span>{new Date(item.timestamp).toLocaleString()}</span>
          <span>{item.actor}</span>
        </div>
      </div>
      <div className="shrink-0 text-right text-xs uppercase tracking-[0.2em] text-slate-500">{item.severity}</div>
    </div>
  );
};
