import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { SyntheticRun } from "../../shared/types.js";
import { EmptyState, StatusBadge, formatDate } from "./UI.js";

export function RunTable({ runs, compact = false }: { runs: SyntheticRun[]; compact?: boolean }) {
  if (runs.length === 0) {
    return (
        <EmptyState title="No synthetic runs recorded">
        Run a built-in fixture from the Security Lab. Nothing is loaded from Phoenix or a target model.
      </EmptyState>
    );
  }

  const visible = compact ? runs.slice(0, 5) : runs;
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead><tr><th>Scenario</th><th>Outcome</th><th>Recorded</th><th>Scope</th><th><span className="sr-only">Details</span></th></tr></thead>
        <tbody>
          {visible.map((run) => (
            <tr key={run.id}>
              <td><span className="table-primary">{run.scenarioTitle}</span><span className="table-secondary mono">{run.id.slice(0, 12)}</span></td>
              <td><StatusBadge label={run.outcome === "PASS" ? "FIXTURE PASS" : "HARNESS MISMATCH"} tone={run.outcome === "PASS" ? "good" : "warn"} /></td>
              <td className="table-time">{formatDate(run.completedAt)}</td>
              <td><span className="scope-cell">synthetic · {run.mode === "synthetic-server" ? "SQLite" : "legacy browser"}</span></td>
              <td><Link className="row-link" to="/audit" aria-label={`Open synthetic record for ${run.scenarioTitle}`}><ArrowUpRight size={15} /></Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
