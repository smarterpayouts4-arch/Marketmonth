import type {
  ResearchReport,
  ResearchRequest,
  SearchRequest,
  SearchResult,
  SeoResearchProvider,
} from "../contracts/search-provider";

const SONAR_URL = "https://api.perplexity.ai/chat/completions";
const DEFAULT_TIMEOUT_MS = 45_000;

type PerplexityMessage = { role: string; content: string };

/**
 * First research adapter. Uses Perplexity Sonar for web-grounded answers.
 * Replace/supplement without changing intelligence orchestration.
 */
export class PerplexitySeoProvider implements SeoResearchProvider {
  constructor(
    private readonly apiKey = process.env.PERPLEXITY_API_KEY,
    private readonly timeoutMs = Number(process.env.PERPLEXITY_SEO_TIMEOUT_MS) ||
      DEFAULT_TIMEOUT_MS
  ) {}

  private ensureKey(): string {
    if (!this.apiKey?.trim()) {
      throw new Error(
        "PERPLEXITY_API_KEY is not configured — cannot run SEO research provider"
      );
    }
    return this.apiKey;
  }

  async search(input: SearchRequest): Promise<SearchResult[]> {
    const report = await this.research({
      topic: input.query,
      questions: [
        `List the top ${input.maxResults ?? 5} recent authoritative sources about: ${input.query}. Return title, URL, and a one-sentence snippet for each.`,
      ],
    });
    return report.citations.map((c) => ({
      title: c.title,
      url: c.url,
      snippet: c.excerpt ?? report.summary.slice(0, 200),
      publishedAt: c.publishedAt,
    }));
  }

  async research(input: ResearchRequest): Promise<ResearchReport> {
    const key = this.ensureKey();
    const prefer = input.preferDomains?.length
      ? `Prefer sources from: ${input.preferDomains.join(", ")}.`
      : "Prefer official search-engine documentation when available.";

    const userContent = [
      `Topic: ${input.topic}`,
      prefer,
      "Answer with grounded facts and cite sources. Do not invent ranking guarantees.",
      "Questions:",
      ...input.questions.map((q, i) => `${i + 1}. ${q}`),
    ].join("\n");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Response;
    try {
      res = await fetch(SONAR_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: process.env.PERPLEXITY_SEO_MODEL || "sonar",
          messages: [
            {
              role: "system",
              content:
                "You are a careful SEO research assistant. Cite URLs. Distinguish confirmed engine guidance from speculation.",
            },
            { role: "user", content: userContent },
          ] satisfies PerplexityMessage[],
          return_citations: true,
        }),
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(
          `Perplexity research timed out after ${this.timeoutMs}ms`
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 429) {
      throw new Error("Perplexity research rate-limited (429)");
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Perplexity research failed (${res.status}): ${text.slice(0, 300)}`
      );
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      throw new Error("Perplexity research returned malformed JSON");
    }

    if (!data || typeof data !== "object") {
      throw new Error("Perplexity research returned unexpected payload shape");
    }

    const payload = data as {
      choices?: { message?: { content?: unknown } }[];
      citations?: unknown;
    };

    const rawSummary = payload.choices?.[0]?.message?.content;
    if (typeof rawSummary !== "string" || !rawSummary.trim()) {
      throw new Error("Perplexity research returned empty or malformed content");
    }

    const summary = rawSummary.trim();
    const citationUrls = Array.isArray(payload.citations)
      ? payload.citations.filter((u): u is string => typeof u === "string")
      : [];

    const citations = citationUrls.map((url, i) => ({
      title: `Source ${i + 1}`,
      url,
      excerpt: summary.slice(0, 240),
    }));

    return {
      topic: input.topic,
      summary,
      citations,
      retrievedAt: new Date().toISOString(),
      provider: "perplexity",
    };
  }
}

export function createDefaultResearchProvider(): SeoResearchProvider {
  return new PerplexitySeoProvider();
}
