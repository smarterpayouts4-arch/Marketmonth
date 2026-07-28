import { notFound } from "next/navigation";

import { IdeaLabClient } from "@/app/dev/brain/idea-lab/idea-lab-client";

export const dynamic = "force-dynamic";

/**
 * Development-only Idea Lab sandbox.
 * Isolated from product Marketing Topic session, product topic history, and ContentAtom.
 */
export default function IdeaLabPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <IdeaLabClient />;
}
