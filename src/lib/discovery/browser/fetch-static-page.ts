import * as cheerio from "cheerio";

import { mainContentText } from "@/lib/discovery/html-clean";

import type { CollectedPage } from "./types";

const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT =
  "MarketingAI-Discovery/1.0 (+https://localhost; brand discovery bot)";

export async function fetchStaticPage(input: {
  url: string;
  pageType: string;
}): Promise<CollectedPage> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(input.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    const contentType = res.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      return {
        url: input.url,
        pageType: input.pageType,
        html: "",
        text: "",
        collectionMethod: "fetch",
        status: res.status,
      };
    }
    const html = await res.text();
    const $ = cheerio.load(html);
    const title = $("title").first().text().trim() || undefined;
    return {
      url: input.url,
      pageType: input.pageType,
      title,
      html,
      text: mainContentText(html),
      collectionMethod: "fetch",
      status: res.status,
    };
  } finally {
    clearTimeout(timer);
  }
}
