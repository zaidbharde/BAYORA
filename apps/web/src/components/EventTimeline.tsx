import type { ActivityItem as ActivityItemType } from "@bayora/shared";
import { ActivityItem } from "./ActivityItem";

interface EventTimelineProps {
  items: ActivityItemType[];
}

export const EventTimeline = ({ items }: EventTimelineProps) => {
  if (!items.length) {
    return <p className="text-sm text-slate-400">No recent activity is available yet.</p>;
  }

  return <div className="space-y-3">{items.map((item) => <ActivityItem key={item.id} item={item} />)}</div>;
};
