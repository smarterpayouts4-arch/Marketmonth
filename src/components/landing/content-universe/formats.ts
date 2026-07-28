import { AtSign, Briefcase, Camera, CircleDot, Music2, Video } from "lucide-react";

/** Top six channels people recognize at a glance. */
export const FORMATS = [
  {
    id: "instagram",
    label: "Instagram",
    metric: "views",
    Icon: Camera,
    tone: "text-[#E1306C] bg-[#E1306C]/12",
    target: 128_400,
  },
  {
    id: "tiktok",
    label: "TikTok",
    metric: "views",
    Icon: Music2,
    tone: "text-[#111111] bg-[#111111]/10",
    target: 214_800,
  },
  {
    id: "youtube",
    label: "YouTube",
    metric: "views",
    Icon: Video,
    tone: "text-[#FF0000] bg-[#FF0000]/12",
    target: 96_200,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    metric: "followers",
    Icon: Briefcase,
    tone: "text-[#0A66C2] bg-[#0A66C2]/12",
    target: 41_600,
  },
  {
    id: "reddit",
    label: "Reddit",
    metric: "upvotes",
    Icon: CircleDot,
    tone: "text-[#FF4500] bg-[#FF4500]/12",
    target: 22_400,
  },
  {
    id: "threads",
    label: "Threads",
    metric: "views",
    Icon: AtSign,
    tone: "text-[#1A1A1A] bg-[#1A1A1A]/10",
    target: 67_300,
  },
] as const;

export type FormatItem = (typeof FORMATS)[number];

export function formatMetric(n: number): string {
  if (n >= 100_000) return `${Math.round(n / 1000)}k`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}
