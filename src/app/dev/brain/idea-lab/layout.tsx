import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { PrototypeModeProvider } from "@/lib/prototype-mode";

/**
 * Idea Lab sandbox shell — visual parity with the product dashboard only.
 * Does not route through Marketing Topic product session or product topic history.
 * Candidates/directions use /api/dev/brain/idea-lab/*; atom stage uses product content-atom.
 */
export default function IdeaLabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <PrototypeModeProvider>
      <AppShell>{children}</AppShell>
    </PrototypeModeProvider>
  );
}
