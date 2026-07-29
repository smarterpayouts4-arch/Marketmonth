import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractFaqs } from "./extract-faq";
import type { CrawlCorpus } from "./types";

describe("extractFaqs", () => {
  it("parses FAQPage JSON-LD", () => {
    const html = `
      <html><head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [{
          "@type": "Question",
          "name": "How do I book a consultation?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Use the contact form on the homepage."
          }
        }]
      }
      </script>
      </head><body></body></html>
    `;
    const corpus: CrawlCorpus = {
      normalizedUrl: "https://example.com",
      origin: "https://example.com",
      pages: [
        {
          url: "https://example.com/faq",
          status: 200,
          html,
          title: "FAQ",
          kind: "faq",
        },
      ],
    };
    const faqs = extractFaqs(corpus);
    assert.equal(faqs.length, 1);
    assert.match(faqs[0]!.question, /book a consultation/i);
    assert.match(faqs[0]!.answer, /contact form/i);
    assert.equal(faqs[0]!.sourceUrl, "https://example.com/faq");
  });

  it("parses details/summary accordion FAQs", () => {
    const html = `
      <html><body>
        <details>
          <summary>What is included in onboarding?</summary>
          <p>Setup, training, and first-month support.</p>
        </details>
      </body></html>
    `;
    const corpus: CrawlCorpus = {
      normalizedUrl: "https://example.com",
      origin: "https://example.com",
      pages: [
        {
          url: "https://example.com/help",
          status: 200,
          html,
          title: "Help",
          kind: "faq",
        },
      ],
    };
    const faqs = extractFaqs(corpus);
    assert.ok(faqs.length >= 1);
    assert.match(faqs[0]!.question, /onboarding/i);
  });

  it("rejects glued questions without a clean terminal ?", () => {
    const html = `
      <html><body>
        <details>
          <summary>What is ZYNAVA?What does it cost?</summary>
          <p>A discovery platform.</p>
        </details>
        <details>
          <summary>How we work.</summary>
          <p>We compare options across retailers with clear pricing.</p>
        </details>
      </body></html>
    `;
    const corpus: CrawlCorpus = {
      normalizedUrl: "https://zynava.com",
      origin: "https://zynava.com",
      pages: [
        {
          url: "https://zynava.com/faq",
          status: 200,
          html,
          title: "FAQ",
          kind: "faq",
        },
      ],
    };
    const faqs = extractFaqs(corpus);
    for (const f of faqs) {
      assert.ok(!/What is ZYNAVA\?What/i.test(f.question));
      assert.ok(f.question.endsWith("?") || f.question.length >= 10);
    }
  });
});
