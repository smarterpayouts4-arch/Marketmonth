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
});
