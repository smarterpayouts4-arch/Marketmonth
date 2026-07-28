import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { calendarItems } from "@/data/mock-calendar";

const days = Array.from({ length: 30 }, (_, index) => index + 1);

export default function CalendarPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="CALENDAR"
        title="Marketing Calendar"
        description="A clean month view for scheduled content. Sparse by design — not a dense enterprise scheduler."
        large
        actions={<StatusBadge tone="primary">Placeholder</StatusBadge>}
      />

      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">July</h2>
          <p className="text-sm text-text-secondary">
            {calendarItems.length} planned items
          </p>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((label, index) => (
            <div
              key={`${label}-${index}`}
              className="pb-2 text-center text-xs font-semibold text-text-muted"
            >
              {label}
            </div>
          ))}
          {days.map((day) => {
            const item = calendarItems.find((entry) => entry.day === day);
            return (
              <div
                key={day}
                className="min-h-20 rounded-xl border border-border bg-background p-2"
              >
                <p className="text-xs text-text-muted">{day}</p>
                {item ? (
                  <div className="mt-2 rounded-lg bg-subtle px-2 py-1.5">
                    <p className="text-[11px] font-semibold text-primary-dark">
                      {item.platform}
                    </p>
                    <p className="text-[11px] text-text-secondary">{item.label}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
