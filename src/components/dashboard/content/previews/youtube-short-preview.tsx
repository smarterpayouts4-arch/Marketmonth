import { Heart, MessageCircle, Share2 } from "lucide-react";

import type { ProductionPackage } from "../types";

import { YoutubeShortsIcon } from "../channel-icons";

type YoutubeShortPreviewProps = {
  pkg: ProductionPackage;
  brandName: string;
  headlineOverride?: string;
};

export function YoutubeShortPreview({
  pkg,
  brandName,
  headlineOverride,
}: YoutubeShortPreviewProps) {
  const title = headlineOverride ?? pkg.copy.headline ?? pkg.metadata.title ?? "";
  const overlay = pkg.copy.onScreenText?.[0] ?? title;
  const duration = pkg.video?.durationSeconds ?? 45;

  return (
    <article
      className="relative mx-auto flex h-full max-w-[420px] flex-col overflow-hidden rounded-xl border border-[#222] bg-black text-white shadow-sm"
      aria-label="YouTube Shorts preview"
    >
      <div className="relative min-h-0 flex-1 bg-gradient-to-b from-emerald-900/80 via-slate-900 to-black">
        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-md bg-black/50 px-2 py-1 text-xs">
          <YoutubeShortsIcon className="size-3.5" />
          Shorts · Illustrative
        </div>
        <span className="absolute top-3 right-3 rounded bg-black/70 px-1.5 py-0.5 text-xs">
          0:{duration.toString().padStart(2, "0").slice(-2)}
        </span>

        <div className="absolute inset-x-0 bottom-16 px-4">
          <p className="text-sm font-semibold">{brandName}</p>
          <p className="mt-1 line-clamp-2 text-base font-medium">{overlay}</p>
          <p className="mt-1 line-clamp-1 text-xs text-white/70">
            {pkg.copy.description ?? pkg.cta.label}
          </p>
        </div>

        <div className="absolute right-3 bottom-20 flex flex-col items-center gap-4 text-white">
          <Heart className="size-6" aria-hidden />
          <MessageCircle className="size-6" aria-hidden />
          <Share2 className="size-6" aria-hidden />
        </div>
      </div>
    </article>
  );
}
