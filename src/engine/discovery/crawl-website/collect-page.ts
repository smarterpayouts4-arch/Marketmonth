import { fetchRenderedPage } from "@/lib/discovery/browser/fetch-rendered-page";
import { fetchStaticPage } from "@/lib/discovery/browser/fetch-static-page";
import { shouldUsePlaywright } from "@/lib/discovery/browser/should-use-playwright";
import type { CollectedPage } from "@/lib/discovery/browser/types";

import type { CrawledPage, PageKind } from "../types";

import { politeDelay, withRetry } from "./polite";

export async function collectPage(
  url: string,
  pageType: PageKind,
  opts?: { skipDelay?: boolean }
): Promise<CollectedPage | null> {
  if (!opts?.skipDelay) {
    await politeDelay();
  }

  let page: CollectedPage;
  try {
    page = await withRetry(
      () => fetchStaticPage({ url, pageType }),
      { attempts: 3, baseMs: 300 }
    );
  } catch {
    return null;
  }

  // Re-validate final URL against same-origin (redirects)
  try {
    const finalOrigin = new URL(page.url).origin;
    const expectedOrigin = new URL(url).origin;
    if (finalOrigin !== expectedOrigin) return null;
  } catch {
    return null;
  }

  if (!page.html || page.status >= 400) return null;

  if (shouldUsePlaywright(page)) {
    const rendered = await withRetry(
      async () => {
        const r = await fetchRenderedPage({ url, pageType });
        if (!r) throw new Error("playwright_empty");
        return r;
      },
      { attempts: 2, baseMs: 400 }
    ).catch(() => null);
    if (rendered?.html && rendered.text.length > page.text.length) {
      try {
        if (new URL(rendered.url).origin !== new URL(url).origin) {
          return page;
        }
      } catch {
        return page;
      }
      return rendered;
    }
  }

  return page;
}

export function toCrawled(page: CollectedPage, kind: PageKind): CrawledPage {
  return {
    url: page.url,
    status: page.status,
    html: page.html,
    title: page.title || page.url,
    kind,
    text: page.text,
    collectionMethod: page.collectionMethod,
  };
}
