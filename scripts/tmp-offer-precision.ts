/**
 * Throwaway probe: does isCommercialTerm() misclassify Zynava's own product
 * capabilities as commercial offers? Delete after the offers workstream lands.
 */
import { isCommercialTerm } from "../src/engine/discovery/extract-offers";

/** Real strings from data/companies/zynava.com/approved.csv. */
const ZYNAVA_PRODUCT_CAPABILITIES = [
  "Compare Supplement Prices Based on Your Preferences",
  "Zynava finds matching products across participating retailers and shows the lowest observed price and price per serving when verified.",
  "AI-powered supplement search and price-comparison engine.",
  "Supplement Price Comparison",
  "Filter your way. Lowest matching price.",
  "Browse supplement guides, use free tools, or compare retailer deals before you decide.",
];

/** Genuine commercial terms on the same site. */
const ZYNAVA_REAL_OFFERS = [
  "Free — no sign-up required.",
  "The process is free, requires no account",
];

/** From the false-positive table: real product names, none are offers. */
const KNOWN_PRODUCT_NAMES = [
  "5-hour ENERGY",
  "Claritin 24 Hour",
  "Gluten-Free Menu",
  "Sugar-Free Red Bull",
  "worry-free plumbing",
  "distraction-free",
  "Free Range Chicken",
  "Extended Warranty Plan",
  "Saia Guaranteed 10 a.m.",
  "12 Pack",
  "trial size",
];

/** Real offers from eight verticals — recall check. */
const CROSS_INDUSTRY_OFFERS = [
  "Kids 12 and under can enjoy a meal for just $1 on Wednesdays with the purchase of an adult entree",
  "Happy Hour Specials, Monday to Friday from 3pm - 7pm",
  "$29 new patient exam & X-rays",
  "Dentures starting at $499 per arch",
  "$300 off Motto Clear Aligners",
  "The Fee Is Free. Only pay if we win.",
  "See if you qualify",
  "50% off for 3 months",
  "$7.25 USD per user / month, when paying annually",
  "If we're not on time, we pay you $5.00 for each minute we're late, up to 60 minutes",
  "Schedule Online Or Call 800-768-6911",
  "Save 50% | Free Shipping on First Order | 100% Money-Back Guarantee",
  "3 Pack Save 30%",
  "Refer a Friend - Get $20",
  "Walk-ins welcome during business hours",
  "Gift vouchers valid for 12 months at both locations",
  "Written on-time or 100% refund",
  "Get an instant quote in under 2 minutes",
  "no contracts, no monthly fees",
  "Volume LTL discounts for regular shippers",
  "Check In Online",
  "Transparent pricing, in writing, before we start. No surprise totals.",
];

function report(label: string, lines: string[], expected: boolean): number {
  let wrong = 0;
  console.log(`\n${label}  (expect ${expected ? "MATCH" : "no match"})`);
  for (const line of lines) {
    const got = isCommercialTerm(line);
    const ok = got === expected;
    if (!ok) wrong += 1;
    const mark = ok ? "  ok " : " FAIL";
    console.log(`${mark}  ${got ? "offer  " : "reject "}  ${line.slice(0, 88)}`);
  }
  return wrong;
}

const falsePositives =
  report("Zynava product capabilities", ZYNAVA_PRODUCT_CAPABILITIES, false) +
  report("Known product names", KNOWN_PRODUCT_NAMES, false);

const falseNegatives =
  report("Zynava genuine offers", ZYNAVA_REAL_OFFERS, true) +
  report("Cross-industry real offers", CROSS_INDUSTRY_OFFERS, true);

const fpTotal = ZYNAVA_PRODUCT_CAPABILITIES.length + KNOWN_PRODUCT_NAMES.length;
const fnTotal = ZYNAVA_REAL_OFFERS.length + CROSS_INDUSTRY_OFFERS.length;

console.log(
  `\nfalse positives ${falsePositives}/${fpTotal}   missed offers ${falseNegatives}/${fnTotal}`
);
