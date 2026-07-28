export type CollectedPage = {
  url: string;
  pageType: string;
  title?: string;
  html: string;
  text: string;
  collectionMethod: "fetch" | "playwright";
  status: number;
};
