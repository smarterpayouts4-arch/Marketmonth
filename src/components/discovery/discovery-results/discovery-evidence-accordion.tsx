"use client";

import { useState } from "react";

import type { DiscoveryEvidenceItem as EvidenceItem } from "@/components/discovery/activation";

import { DiscoveryEvidenceItem } from "./discovery-evidence-item";

type Props = {
  items: EvidenceItem[];
};

/**
 * Compact evidence accordion — one open row at a time; card grows with content.
 */
export function DiscoveryEvidenceAccordion({ items }: Props) {
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(
    null
  );

  if (!items.length) return null;

  return (
    <div className="space-y-1.5" role="list" aria-label="Evidence on your website">
      <p className="text-[10px] font-semibold tracking-[0.08em] text-text-muted uppercase">
        Evidence on your website
      </p>
      {items.map((item, index) => (
        <div key={item.id} role="listitem">
          <DiscoveryEvidenceItem
            item={item}
            index={index}
            expanded={expandedEvidenceId === item.id}
            onToggle={() =>
              setExpandedEvidenceId((prev) =>
                prev === item.id ? null : item.id
              )
            }
          />
        </div>
      ))}
    </div>
  );
}
