import { Activity, BrainCircuit, ClipboardList, Shield, Swords, Target } from "lucide-react";
import { SystemStatus } from "../components/SystemStatus";

const sections = [
  {
    id: "overview",
    title: "Security Overview",
    detail: "Monitor platform status, active security tests, and recent security activity.",
    icon: Target,
    status: "Operational"
  },
  {
    id: "red-team",
    title: "Red Team",
    detail: "Configure and execute controlled adversarial security tests.",
    icon: Swords,
    status: "Ready"
  },
  {
    id: "blue-team",
    title: "Blue Team",
    detail: "Monitor threats, evaluate defensive rules, and review security responses.",
    icon: Shield,
    status: "Monitoring"
  },
  {
    id: "client-llm",
    title: "Client LLM",
    detail: "Manage the model boundary used for controlled AI security evaluation.",
    icon: BrainCircuit,
    status: "Protected"
  },
  {
    id: "test-runs",
    title: "Test Runs",
    detail: "Review security tests, execution status, findings, and outcomes.",
    icon: Activity,
    status: "No test runs yet"
  },
  {
    id: "audit-logs",
    title: "Audit Logs",
    detail: "Review security events and trace activity across the testing environment.",
    icon: ClipboardList,
    status: "No audit events yet"
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
                <span className="rounded border border-bayora-border bg-black/15 px-2 py-1 text-xs text-slate-400">
                  {section.status}
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
