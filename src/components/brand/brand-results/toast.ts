import { useState } from "react";

export function useFlashToast(durationMs = 2200) {
  const [toast, setToast] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), durationMs);
  }

  return { toast, flash };
}
