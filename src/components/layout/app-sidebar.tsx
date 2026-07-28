"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Brain,
  CalendarDays,
  CircleHelp,
  Clapperboard,
  Crosshair,
  Home,
  ListChecks,
  Settings,
  Sparkles,
} from "lucide-react";
import { Suspense, type ReactNode } from "react";

import { MARKETING_TOPIC_HREF } from "@/components/dashboard/dashboard-home/phase-query";
import { useDevWorkspace } from "@/lib/dev/use-dev-workspace";
import { cn } from "@/lib/utils";
import { PRODUCT_IDENTITY } from "@/seo/config/product-identity";

const PRODUCT_NAME = PRODUCT_IDENTITY.displayName;

const bottomNav = [
  { href: "/help", label: "Help", icon: CircleHelp },
  { href: "/settings", label: "Settings", icon: Settings },
];

type AppSidebarProps = {
  onNavigate?: () => void;
  className?: string;
};

export function AppSidebar({ onNavigate, className }: AppSidebarProps) {
  return (
    <Suspense
      fallback={
        <SidebarShell className={className}>
          <div className="flex-1" />
        </SidebarShell>
      }
    >
      <AppSidebarInner onNavigate={onNavigate} className={className} />
    </Suspense>
  );
}

function SidebarShell({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <aside
      className={cn(
        "flex h-full w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground",
        className
      )}
    >
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="size-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">
            {PRODUCT_NAME}
          </p>
          <p className="truncate text-xs text-sidebar-foreground/60">
            AI marketing OS
          </p>
        </div>
      </div>
      {children}
    </aside>
  );
}

function AppSidebarInner({ onNavigate, className }: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const workspace = useDevWorkspace();
  // useDevWorkspace starts null on server + first client paint, then fills.
  const userLabel =
    workspace?.active && workspace.userName ? workspace.userName : "Oscar";
  const companyLabel =
    workspace?.active && workspace.companyName
      ? workspace.companyName
      : "your brand";
  const initials = userLabel.slice(0, 1).toUpperCase() || "O";

  const onDashboard =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const phase = searchParams.get("phase");

  // Legacy ?phase=strategy|learn normalize to marketing-topic in the dashboard;
  // keep them active here so the sidebar stays correct until the URL rewrites.
  const marketingTopicActive =
    onDashboard &&
    (phase === null ||
      phase === "marketing-topic" ||
      phase === "strategy" ||
      phase === "learn");

  const mainNav = [
    {
      href: "/dashboard",
      label: "Home",
      icon: Home,
      active: false,
    },
    {
      href: "/brand",
      label: "Brand",
      icon: Brain,
      active: pathname.startsWith("/brand"),
    },
    {
      href: MARKETING_TOPIC_HREF,
      label: "Marketing Topic",
      icon: Crosshair,
      active: marketingTopicActive,
    },
    {
      href: "/content",
      label: "Content",
      icon: Clapperboard,
      active:
        pathname.startsWith("/content") ||
        (onDashboard && phase === "content"),
    },
    {
      href: "/review",
      label: "Review",
      icon: ListChecks,
      active:
        pathname.startsWith("/review") || (onDashboard && phase === "review"),
    },
    {
      href: "/calendar",
      label: "Calendar",
      icon: CalendarDays,
      active: pathname.startsWith("/calendar"),
    },
    {
      href: "/analytics",
      label: "Analytics",
      icon: BarChart3,
      active:
        pathname.startsWith("/analytics") ||
        (onDashboard && phase === "results"),
    },
  ];

  return (
    <SidebarShell className={className}>
      <nav className="flex-1 space-y-1 px-3" aria-label="Main">
        {mainNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={`${item.label}-${item.href}`}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                item.active
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-white"
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-sidebar-border px-3 py-4">
        {bottomNav.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-white"
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}

        <div className="mt-3 flex items-center gap-3 rounded-xl bg-sidebar-accent/50 px-3 py-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{userLabel}</p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {companyLabel}
            </p>
          </div>
        </div>
      </div>
    </SidebarShell>
  );
}
