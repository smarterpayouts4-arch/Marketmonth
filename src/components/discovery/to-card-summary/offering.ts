import type { BrandProfileView } from "@/components/discovery/types";

import { LIMITS } from "./limits";
import { previewField, stripDashes } from "./text";

export type OfferingMapped = {
  services: string[];
  products: string[];
  offerItems: string[];
  offerItemsFull: string[];
  coreOffering: string;
  coreOfferingFull: string;
  coreOfferingOverflow: boolean;
  brandPosition: string;
  brandPositionFull: string;
  brandPositionOverflow: boolean;
  /** Clamped for card display. */
  valueProposition: string;
  valuePropositionFull: string;
  valuePropositionOverflow: boolean;
  /** Unclamped source used by audience / offerFit copy (parity with prior monolithic transform). */
  valuePropositionSource: string;
  offerFit: string;
  offerFitFull: string;
  offerFitOverflow: boolean;
  leadOffer: string;
  offersOverflow: boolean;
};

export function mapOffering(profile: BrandProfileView): OfferingMapped {
  const servicesFull = profile.services.map(stripDashes).filter(Boolean);
  const productsFull = profile.products.map(stripDashes).filter(Boolean);
  const offerItemsFull = [...servicesFull, ...productsFull];
  const offerItems = offerItemsFull.slice(0, 3);
  const services = servicesFull.slice(0, 3);
  const products = productsFull.slice(0, 3);

  const coreOfferingRaw =
    offerItems.length > 0
      ? offerItems.join(", ")
      : profile.valueProposition || "Core offerings";

  const brandPositionRaw =
    profile.brandVoice ||
    profile.valueProposition ||
    "Clear and helpful brand voice";

  const valuePropositionSource =
    profile.valueProposition &&
    profile.valueProposition !== profile.description
      ? profile.valueProposition
      : profile.valueProposition || "";

  const leadOffer = offerItems[0] || "the core offer";

  const offerFitRaw = `Lead with ${leadOffer}. Sell the outcome${
    valuePropositionSource
      ? ` (${stripDashes(valuePropositionSource).replace(/\.$/, "").toLowerCase()})`
      : ""
  } in a ${stripDashes(brandPositionRaw).replace(/\.$/, "").toLowerCase()} voice.`;

  const coreOffering = previewField(coreOfferingRaw, LIMITS.coreOffering);
  const brandPosition = previewField(brandPositionRaw, LIMITS.brandPosition);
  const valueProposition = previewField(
    valuePropositionSource,
    LIMITS.valueProposition
  );
  const offerFit = previewField(offerFitRaw, LIMITS.offerFit);

  return {
    services,
    products,
    offerItems,
    offerItemsFull,
    coreOffering: coreOffering.preview,
    coreOfferingFull: coreOffering.full,
    coreOfferingOverflow: coreOffering.overflow,
    brandPosition: brandPosition.preview,
    brandPositionFull: brandPosition.full,
    brandPositionOverflow: brandPosition.overflow,
    valueProposition: valueProposition.preview,
    valuePropositionFull: valueProposition.full,
    valuePropositionOverflow: valueProposition.overflow,
    valuePropositionSource,
    offerFit: offerFit.preview,
    offerFitFull: offerFit.full,
    offerFitOverflow: offerFit.overflow,
    leadOffer,
    offersOverflow: offerItemsFull.length > offerItems.length,
  };
}
