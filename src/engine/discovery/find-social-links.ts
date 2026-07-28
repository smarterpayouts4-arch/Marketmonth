import type { SocialProfile } from "./brand-profile";
import type { CrawlCorpus } from "./types";

const PATTERNS: { platform: SocialProfile["platform"]; re: RegExp }[] = [
  { platform: "instagram", re: /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.-]+/i },
  { platform: "facebook", re: /https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9_.-]+/i },
  { platform: "linkedin", re: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[A-Za-z0-9_.-]+/i },
  { platform: "tiktok", re: /https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9_.-]+/i },
  { platform: "youtube", re: /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/)[A-Za-z0-9_.-]+/i },
  { platform: "x", re: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[A-Za-z0-9_]+/i },
];

export function findSocialLinks(corpus: CrawlCorpus): SocialProfile[] {
  const blob = corpus.pages.map((p) => p.html).join("\n");

  return PATTERNS.map(({ platform, re }) => {
    const match = blob.match(re)?.[0];
    if (match) {
      return { platform, status: "present" as const, url: match.split('"')[0] };
    }
    return { platform, status: "missing" as const };
  });
}
