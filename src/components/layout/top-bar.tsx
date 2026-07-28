"use client";

import dynamic from "next/dynamic";
import { Bell, ChevronDown, CircleHelp, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PrimaryButton } from "@/components/ui/primary-button";
import { useDevWorkspace } from "@/lib/dev/use-dev-workspace";

const PrototypeModeToggle = dynamic(
  () =>
    import("@/components/layout/prototype-mode-toggle").then(
      (m) => m.PrototypeModeToggle
    ),
  {
    ssr: false,
    loading: () => (
      <div className="hidden h-9 w-[11.5rem] md:block" aria-hidden />
    ),
  }
);

type TopBarProps = {
  onMenuClick?: () => void;
};

export function TopBar({ onMenuClick }: TopBarProps) {
  const workspace = useDevWorkspace();
  const companyLabel =
    workspace?.active && workspace.companyName
      ? workspace.companyName
      : "your brand";

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur sm:px-6">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </Button>

      <button
        type="button"
        className="inline-flex h-10 items-center gap-2 rounded-xl px-2 text-sm font-semibold transition-colors hover:bg-muted"
        aria-label="Workspace selector"
        suppressHydrationWarning
      >
        {companyLabel}
        <ChevronDown className="size-4 text-text-muted" aria-hidden />
      </button>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <PrototypeModeToggle className="hidden md:inline-flex" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-xl"
          aria-label="Help"
        >
          <CircleHelp className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-xl"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="hidden h-10 rounded-xl sm:inline-flex"
        >
          Preview Month
        </Button>
        <PrimaryButton type="button" className="hidden sm:inline-flex">
          Build My Month
        </PrimaryButton>
      </div>
    </header>
  );
}
