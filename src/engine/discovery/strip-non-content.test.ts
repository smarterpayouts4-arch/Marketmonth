import assert from "node:assert/strict";
import { describe, it } from "node:test";

import * as cheerio from "cheerio";

import { mainContentText, stripNonContent } from "@/lib/discovery/html-clean";

const FIXTURE = `
<html><body>
  <nav>How It Works Contact More Home About</nav>
  <header role="banner">Site chrome banner</header>
  <main>
    <h1>About ZYNAVA</h1>
    <p>The supplement market presents a paradox for individuals seeking clarity.</p>
  </main>
  <footer>Privacy Terms Cookie settings</footer>
  <aside role="complementary">Promo sidebar</aside>
</body></html>
`;

describe("stripNonContent / mainContentText", () => {
  it("removes nav header footer from the DOM", () => {
    const $ = cheerio.load(FIXTURE);
    stripNonContent($);
    assert.ok(!/How It Works Contact/.test($.html()));
    assert.ok(!/Privacy Terms/.test($.html()));
    assert.match($.html(), /About ZYNAVA/);
  });

  it("mainContentText excludes chrome from description-source text", () => {
    const text = mainContentText(FIXTURE);
    assert.match(text, /supplement market presents a paradox/i);
    assert.ok(!/How It Works/.test(text));
    assert.ok(!/Cookie settings/.test(text));
    assert.ok(!/Promo sidebar/.test(text));
  });
});
