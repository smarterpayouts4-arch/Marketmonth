export type RenderOp =
  | "image"
  | "voice"
  | "video"
  | "compose"
  | "assemble"
  | "full";

export type RenderBusyMap = Partial<Record<RenderOp, boolean>>;

export function isAnyRenderBusy(map: RenderBusyMap): boolean {
  return Object.values(map).some(Boolean);
}
