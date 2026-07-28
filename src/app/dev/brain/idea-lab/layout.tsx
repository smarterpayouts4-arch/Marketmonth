import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { PrototypeModeProvider } from "@/lib/prototype-mode";

/**
 * Idea Lab sandbox shell — visual parity with the product dashboard only.
 * Does not route through Marketing Topic product session, product topic history,
 * or ContentAtom. Generation goes exclusively through /api/dev/brain/idea-lab/*.
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
