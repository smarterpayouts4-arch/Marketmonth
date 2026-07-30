"use client";

import { useState } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { PrototypeModeToggle } from "@/components/layout/prototype-mode-toggle";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      />

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:static md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <AppSidebar onNavigate={() => setMobileOpen(false)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setMobileOpen(true)} />
        <div className="border-b border-border bg-card px-4 py-2 sm:hidden">
          <PrototypeModeToggle />
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto lg:has-[[data-studio-shell]]:overflow-hidden">
          <div className="mx-auto h-full min-h-0 w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 lg:has-[[data-studio-shell]]:max-w-none lg:has-[[data-studio-shell]]:py-3">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
