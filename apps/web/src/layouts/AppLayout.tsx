import type { ReactNode } from "react";
import { Activity, BrainCircuit, ClipboardList, Eye, LayoutDashboard, Shield, Swords } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Red Team", icon: Swords },
  { label: "Blue Team", icon: Shield },
  { label: "Client LLM", icon: BrainCircuit },
  { label: "Test Runs", icon: Activity },
  { label: "Audit Logs", icon: ClipboardList }
];

export const AppLayout = ({ children }: AppLayoutProps) => (
  <div className="min-h-screen bg-bayora-ink text-slate-100">
    <div className="flex min-h-screen">
      <aside className="hidden w-72 shrink-0 border-r border-bayora-border bg-[#0D1420] px-5 py-6 lg:block">
        <div className="mb-9 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded border border-bayora-signal/40 bg-bayora-signal/10">
            <Eye className="h-5 w-5 text-bayora-signal" aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-wide text-white">BAYORA</p>
            <p className="text-xs uppercase text-slate-500">Adversarial AI Lab</p>
          </div>
        </div>

        <nav className="space-y-1" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.label}
                href={`#${item.label.toLowerCase().replaceAll(" ", "-")}`}
                className="flex items-center gap-3 rounded px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                <Icon className="h-4 w-4 text-slate-500" aria-hidden="true" />
                {item.label}
              </a>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-hidden">
        <header className="border-b border-bayora-border bg-[#0D1420]/80 px-5 py-4 backdrop-blur lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase text-slate-500">Secure Adversarial AI Testing Infrastructure</p>
              <h1 className="mt-1 text-2xl font-semibold text-white">Phase 1.1 Command Surface</h1>
            </div>
            <div className="rounded border border-bayora-border px-3 py-2 text-sm text-slate-300">
              Simulation-only foundation
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  </div>
);

