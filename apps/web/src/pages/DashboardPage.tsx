import { Activity, BrainCircuit, ClipboardList, Shield, Swords, Target } from "lucide-react";
import { SystemStatus } from "../components/SystemStatus";

const sections = [
  {
    id: "overview",
    title: "Overview",
    detail: "High-level posture, active simulations, and system readiness will appear here.",
    icon: Target
  },
  {
    id: "red-team",
    title: "Red Team",
    detail: "Adversarial test planning and simulated attack workflows will be added in later phases.",
    icon: Swords
  },
  {
    id: "blue-team",
    title: "Blue Team",
    detail: "Detection rules, response actions, and defensive status will be modeled here.",
    icon: Shield
  },
  {
    id: "client-llm",
    title: "Client LLM",
    detail: "The mock model boundary is reserved for future local or cloud LLM adapters.",
    icon: BrainCircuit
  },
  {
    id: "test-runs",
    title: "Test Runs",
    detail: "Run history, status, and scenario outcomes will be tracked through API contracts.",
    icon: Activity
  },
  {
    id: "audit-logs",
    title: "Audit Logs",
    detail: "Audit trail entries will remain separated from UI logic for later hardening.",
    icon: ClipboardList
  }
];

export const DashboardPage = () => (
  <div className="px-5 py-6 lg:px-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <SystemStatus />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Bayora modules">
        {sections.map((section) => {
          const Icon = section.icon;

          return (
            <article
              key={section.id}
              id={section.id}
              className="rounded border border-bayora-border bg-bayora-panel p-5 transition hover:border-slate-500"
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded border border-slate-700 bg-black/20">
                  <Icon className="h-5 w-5 text-bayora-signal" aria-hidden="true" />
                </div>
                <span className="rounded border border-bayora-border px-2 py-1 text-xs uppercase text-slate-500">
                  Placeholder
                </span>
              </div>
              <h2 className="text-lg font-semibold text-white">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{section.detail}</p>
            </article>
          );
        })}
      </section>
    </div>
  </div>
);

