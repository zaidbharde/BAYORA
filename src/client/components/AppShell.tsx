import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  Archive,
  BookOpenCheck,
  CircleDot,
  ClipboardList,
  FlaskConical,
  Gauge,
  ScanEye,
  Shield,
  TriangleAlert,
} from "lucide-react";
import type { PhoenixHealthStatus } from "../../shared/types.js";
import { StatusBadge } from "./UI.js";

const navigation = [
  { to: "/", label: "Overview", icon: Gauge, end: true },
  { to: "/security", label: "Security lab", icon: FlaskConical },
  { to: "/observability", label: "Observability", icon: ScanEye },
  { to: "/findings", label: "Findings", icon: TriangleAlert },
  { to: "/evaluations", label: "Evaluations", icon: BookOpenCheck },
  { to: "/audit", label: "Audit & evidence", icon: Archive },
  { to: "/environment", label: "Environment", icon: ClipboardList },
];

function pageName(pathname: string): string {
  return navigation.find((item) => item.to === pathname)?.label ?? "Overview";
}

function phoenixLabel(status: PhoenixHealthStatus | null): { label: string; tone: "good" | "warn" | "bad" | "muted" } {
  if (!status) return { label: "Checking Phoenix", tone: "muted" };
  if (status.state === "healthy") return { label: "Phoenix healthy", tone: "good" };
  if (status.state === "blocked") return { label: "Phoenix probe blocked", tone: "warn" };
  if (status.state === "not_configured") return { label: "Phoenix not configured", tone: "muted" };
  if (status.state === "error") return { label: "Phoenix configuration error", tone: "warn" };
  return { label: "Phoenix unavailable", tone: "bad" };
}

export function AppShell({
  children,
  runCount,
  phoenix,
  phoenixLoading,
  storageNotice,
}: {
  children: ReactNode;
  runCount: number;
  phoenix: PhoenixHealthStatus | null;
  phoenixLoading: boolean;
  storageNotice: string | null;
}) {
  const location = useLocation();
  const service = phoenixLabel(phoenix);

  return (
    <div className="app-frame">
      <aside className="sidebar" aria-label="Primary navigation">
        <NavLink className="brand-lockup" to="/" aria-label="BAYORA overview">
          <img src="/bayora-mark.svg" alt="" className="brand-mark" />
          <span className="brand-word">BAYORA<span>SECURITY WORKBENCH</span></span>
        </NavLink>
        <div className="workspace-tag"><span className="workspace-square">B</span><span>LOCAL WORKSPACE</span><CircleDot size={12} className="workspace-dot" /></div>
        <p className="nav-section-label">WORKSPACE</p>
        <nav className="nav-list">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link${isActive ? " nav-link-active" : ""}`}>
              <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
              {to === "/audit" && runCount > 0 ? <span className="nav-count">{runCount}</span> : null}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-footnote">
          <div className="mini-shield"><Shield size={15} /></div>
          <div><strong>Bounded by design</strong><span>Fixtures only · no live targets</span></div>
        </div>
        <div className="sidebar-version mono">PROTOTYPE / 0.1</div>
      </aside>

      <main className="main-column">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{pageName(location.pathname)}</strong></div>
          <div className="topbar-status">
            <div className="topbar-service" aria-live="polite">
              <span className={`service-light ${service.tone === "good" ? "service-up" : service.tone === "bad" ? "service-down" : ""}`} />
              <span>{phoenixLoading ? "Checking health" : service.label}</span>
            </div>
            <StatusBadge label="SYNTHETIC MODE" tone="signal" />
            <span className="topbar-icon"><Activity size={16} aria-hidden="true" /></span>
          </div>
        </header>

        {storageNotice ? <div className="global-storage-notice" role="status"><strong>Local storage notice</strong><span>{storageNotice}</span></div> : null}
        <div className="content-wrap">{children}</div>
        <footer className="app-footer"><span>Evidence is local, synthetic and unsigned.</span><span className="mono">BAYORA · OWNER TESTING BUILD</span></footer>
      </main>
    </div>
  );
}
