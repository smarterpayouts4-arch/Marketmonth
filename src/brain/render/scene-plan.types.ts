/** Channel-agnostic human-readable scene plan for compilers (not provider JSON). */
export type ScenePlan = {
  format: string;
  duration_seconds: number;
  scenes: Array<{
    duration_seconds: number;
    motion: string;
    visual?: string;
    on_screen_text?: string;
    safe_zone?: string;
    voiceover_line?: string;
  }>;
};
