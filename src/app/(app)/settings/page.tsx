import { PageHeader } from "@/components/shared/page-header";
import { PrototypeModeToggle } from "@/components/layout/prototype-mode-toggle";
import { SeoStatusPanel } from "@/components/seo/seo-status-panel";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Prototype settings. Use Prototype Mode to switch between first-run and completed-brand dashboards."
        large
      />
      <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 className="text-base font-semibold">Prototype Mode</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Switch the mock company state used across Dashboard and Brand.
        </p>
        <div className="mt-4">
          <PrototypeModeToggle />
        </div>
      </section>
      <SeoStatusPanel />
    </div>
  );
}
