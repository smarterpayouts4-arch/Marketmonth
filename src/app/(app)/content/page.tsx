import { ContentStudio } from "@/components/dashboard/content";
import { isContentPromptInspectorEnabled } from "@/lib/content/prompt-inspector";

export default function ContentPage() {
  const promptInspectorEnabled = isContentPromptInspectorEnabled();

  return <ContentStudio promptInspectorEnabled={promptInspectorEnabled} />;
}
