export type ReviewItem = {
  id: string;
  title: string;
  format: string;
  platform: string;
  status: "needs_review" | "approved" | "needs_changes";
};

export const reviewQueue: ReviewItem[] = [
  {
    id: "1",
    title: "Why magnesium forms are not interchangeable",
    format: "Short Video",
    platform: "TikTok",
    status: "needs_review",
  },
  {
    id: "2",
    title: "3 questions to ask before buying a supplement",
    format: "Carousel",
    platform: "Instagram",
    status: "needs_review",
  },
  {
    id: "3",
    title: "How we compare wellness products",
    format: "Long-form Video",
    platform: "YouTube",
    status: "needs_changes",
  },
  {
    id: "4",
    title: "Busy adult supplement checklist",
    format: "Text Post",
    platform: "LinkedIn",
    status: "approved",
  },
  {
    id: "5",
    title: "What “value” really means in wellness",
    format: "Thread",
    platform: "X",
    status: "needs_review",
  },
];
