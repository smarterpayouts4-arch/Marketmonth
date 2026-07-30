import { notFound } from "next/navigation";

import { IdeaLabClient } from "@/app/dev/brain/idea-lab/idea-lab-client";

export const dynamic = "force-dynamic";

/**
 * Development-only Idea Lab sandbox.
 * Isolated from product Marketing Topic session and product topic history.
 * Direction confirm builds a Content Atom via the product content-atom route.
 */
export default function IdeaLabPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <IdeaLabClient />;
}
