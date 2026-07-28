import { landingImagery } from "./shared";

/** Illustrative organic-loop teaser — not real performance data. */
export const organicLoopTeaser = {
  disclaimer: "Illustrative demo — not real analytics",
  bars: [
    { channel: "TikTok", value: 78 },
    { channel: "YouTube", value: 62 },
    { channel: "Instagram", value: 58 },
  ],
} as const;

/** Illustrative growth preview — labeled demo metrics only. */
export const growthPreview = {
  disclaimer: "Illustrative demo — not real analytics",
  callout: "+87% Content impact this month",
  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"] as const,
  values: [28, 36, 44, 58, 72, 87] as const,
  stats: [
    { label: "Content impact", value: "87%", icon: "trend" as const },
    { label: "Engagement", value: "2.4x", icon: "users" as const },
    { label: "Total reach", value: "156K", icon: "play" as const },
    { label: "Follower growth", value: "35%", icon: "bars" as const },
  ],
} as const;

export const demoTheater = {
  title: "Your August Marketing Month",
  coreIdeas: 12,
  totalAssets: 34,
  channels: [
    { name: "TikTok", count: 8, image: landingImagery.tiktok },
    { name: "Instagram", count: 8, image: landingImagery.instagram },
    { name: "YouTube", count: 6, image: landingImagery.youtube },
    { name: "LinkedIn", count: 4, image: landingImagery.linkedin },
    { name: "Facebook", count: 4, image: landingImagery.facebook },
    { name: "Articles", count: 4, image: landingImagery.article },
  ],
  weeks: [
    {
      label: "Week 1",
      items: ["Magnesium forms intro", "Glycinate vs citrate", "FAQ reel"],
      image: landingImagery.tiktok,
    },
    {
      label: "Week 2",
      items: ["Price per serving", "Label education", "Vitamin D basics"],
      image: landingImagery.instagram,
    },
    {
      label: "Week 3",
      items: ["Buying guide carousel", "Trust story", "Comparison short"],
      image: landingImagery.youtube,
    },
    {
      label: "Week 4",
      items: ["Month recap", "Shopper checklist", "Next-month teaser"],
      image: landingImagery.month,
    },
  ],
} as const;
