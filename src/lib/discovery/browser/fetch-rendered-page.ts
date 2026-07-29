import { mainContentText } from "@/lib/discovery/html-clean";

import type { CollectedPage } from "./types";

const NAV_TIMEOUT_MS = 15_000;
const RENDER_WAIT_MS = 1_200;
const TOTAL_BUDGET_MS = 25_000;

type Closable = { close: () => Promise<unknown> };

type PlaywrightRoute = {
  request: () => { resourceType: () => string };
  abort: () => Promise<void>;
  continue: () => Promise<void>;
};

type PlaywrightPage = Closable & {
  goto: (
    url: string,
    opts: { waitUntil?: string; timeout?: number }
  ) => Promise<{ status: () => number } | null>;
  content: () => Promise<string>;
  title: () => Promise<string>;
};

type PlaywrightContext = Closable & {
  route: (
    pattern: string,
    handler: (route: PlaywrightRoute) => void | Promise<void>
  ) => Promise<void>;
  newPage: () => Promise<PlaywrightPage>;
};

type PlaywrightBrowser = Closable & {
  newContext: (opts: {
    userAgent?: string;
    javaScriptEnabled?: boolean;
  }) => Promise<PlaywrightContext>;
};

type PlaywrightModule = {
  chromium: {
    launch: (opts: {
      headless?: boolean;
      args?: string[];
    }) => Promise<PlaywrightBrowser>;
  };
};

async function loadPlaywright(): Promise<PlaywrightModule | null> {
  try {
    // Avoid static module resolution so environments without playwright types still typecheck.
    const dynamicImport = new Function(
      "specifier",
      "return import(specifier)"
    ) as (specifier: string) => Promise<PlaywrightModule>;
    return await dynamicImport("playwright");
  } catch {
    return null;
  }
}

/**
 * Product crawl Playwright — in-process Chromium for JS-heavy pages during
 * `crawlWebsite` when static HTML looks like a shell.
 *
 * Not the Docker MCP Playwright server (agent toolchain only). Kill switch:
 * `DISCOVERY_PLAYWRIGHT=0`. Always closes browser resources. Never import
 * from client components.
 */
export async function fetchRenderedPage(input: {
  url: string;
  pageType: string;
}): Promise<CollectedPage | null> {
  if (process.env.DISCOVERY_PLAYWRIGHT === "0") return null;

  let browser: Closable | undefined;
  let context: Closable | undefined;
  let page: Closable | undefined;

  const started = Date.now();

  try {
    const mod = await loadPlaywright();
    if (!mod) return null;

    browser = await mod.chromium.launch({
      headless: true,
      args: ["--disable-dev-shm-usage", "--no-sandbox"],
    });
    context = await (browser as PlaywrightBrowser).newContext({
      userAgent:
        "MarketingAI-Discovery/1.0 (+https://localhost; brand discovery bot)",
      javaScriptEnabled: true,
    });
    const ctx = context as PlaywrightContext;
    await ctx.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (
        type === "image" ||
        type === "media" ||
        type === "font" ||
        type === "stylesheet"
      ) {
        return route.abort();
      }
      return route.continue();
    });

    page = await ctx.newPage();
    const remaining = TOTAL_BUDGET_MS - (Date.now() - started);
    if (remaining < 3_000) return null;

    const pwPage = page as PlaywrightPage;
    const response = await pwPage.goto(input.url, {
      waitUntil: "domcontentloaded",
      timeout: Math.min(NAV_TIMEOUT_MS, remaining),
    });
    await new Promise((r) => setTimeout(r, Math.min(RENDER_WAIT_MS, 2_000)));
    const html = await pwPage.content();
    const title = await pwPage.title();
    return {
      url: input.url,
      pageType: input.pageType,
      title: title || undefined,
      html,
      text: mainContentText(html),
      collectionMethod: "playwright",
      status: response?.status() ?? 200,
    };
  } catch {
    return null;
  } finally {
    await page?.close().catch(() => undefined);
    await context?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }
}
