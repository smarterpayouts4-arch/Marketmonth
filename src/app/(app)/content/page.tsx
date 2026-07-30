import { Suspense } from "react";

import { ContentStudio } from "@/components/dashboard/content";

export default function ContentPage() {
  return (
    <Suspense
      fallback={
        <p className="p-6 text-sm text-text-secondary" aria-live="polite">
          Loading Content Studio…
        </p>
      }
    >
      <ContentStudio />
    </Suspense>
  );
}
