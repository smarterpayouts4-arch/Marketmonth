import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { PrototypeModeProvider } from "@/lib/prototype-mode";
import { buildAppShellMetadata } from "@/seo/foundation/metadata";

export const metadata: Metadata = buildAppShellMetadata();

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PrototypeModeProvider>
      <AppShell>{children}</AppShell>
    </PrototypeModeProvider>
  );
}
