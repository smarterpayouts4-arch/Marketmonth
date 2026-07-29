import type { PageKind } from "../types";

export function classifyPath(pathname: string): PageKind {
  const p = pathname.toLowerCase();
  if (p === "/" || p === "") return "home";
  if (/how-it-works|howitworks|how_we|product-tour|tour-tour/.test(p)) {
    return "how_it_works";
  }
  if (/product|shop|store|services|solutions|catalog|pricing/.test(p)) {
    return "products";
  }
  if (/about|our-story|who-we-are|company/.test(p)) return "about";
  if (/faq|help|support|questions/.test(p)) return "faq";
  if (/testimonial|review|case-stud|success-stor|customers/.test(p)) {
    return "testimonials";
  }
  if (/blog|resource|learn|education|articles|guides|news/.test(p)) {
    return "blog";
  }
  if (/contact|get-in-touch/.test(p)) return "contact";
  return "other";
}
