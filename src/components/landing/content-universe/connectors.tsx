"use client";

import { useSyncExternalStore } from "react";

import {
  gridColumnCenterFraction,
  SEQUENCE_LOOP_S,
  SEQUENCE_STEP_S,
} from "./formats";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(callback: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** SSR-safe: reports "motion allowed" on the server and syncs to the real
 * preference on the client via `useSyncExternalStore`, so the traveling
 * signal particles (SMIL — not reachable by the CSS
 * `prefers-reduced-motion` media query used for the rail/node pulses) never
 * render for a user who has asked for reduced motion. */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    () => false
  );
}

const VIEW_W = 1000;
const VIEW_H = 100;
const JUNCTION_Y = 12;
const RAIL_Y = 42;
const NODE_Y = 90;

type ContentFlowConnectorsProps = {
  count: number;
};

/**
 * The distribution network between the strategy card and the format-card
 * grid: one central junction, one horizontal rail, and one branch per
 * output card. Branch X positions are derived from `count` as the same
 * `(i + 0.5) / count` fraction the CSS grid uses for equal-width columns,
 * so a connector always meets its card's true horizontal center — never a
 * hand-guessed pixel position.
 */
export function ContentFlowConnectors({ count }: ContentFlowConnectorsProps) {
  const reducedMotion = usePrefersReducedMotion();
  const xs = Array.from(
    { length: count },
    (_, i) => gridColumnCenterFraction(i, count) * VIEW_W
  );
  const left = xs[0] ?? VIEW_W / 2;
  const right = xs[xs.length - 1] ?? VIEW_W / 2;
  const centerX = VIEW_W / 2;

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      fill="none"
      preserveAspectRatio="none"
    >
      {/* Hidden motion guides — one continuous path per branch (center out
          along the rail, then down to the card) for the traveling signal
          particles to follow. Not stroked; visual lines are drawn below. */}
      {!reducedMotion &&
        xs.map((x, i) => (
          <path
            key={`guide-${i}`}
            id={`content-flow-guide-${i}`}
            d={`M ${centerX} ${JUNCTION_Y} L ${centerX} ${RAIL_Y} L ${x} ${RAIL_Y} L ${x} ${NODE_Y}`}
            fill="none"
            stroke="none"
          />
        ))}

      {/* Stem: junction down to the rail. */}
      <path
        d={`M ${centerX} ${JUNCTION_Y} L ${centerX} ${RAIL_Y}`}
        stroke="var(--primary)"
        strokeOpacity="0.35"
        strokeWidth="1.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Rail. */}
      <path
        d={`M ${left} ${RAIL_Y} H ${right}`}
        stroke="var(--primary)"
        strokeOpacity="0.3"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="5 5"
        vectorEffect="non-scaling-stroke"
        className="content-flow-dash"
      />

      {/* Branch drops — one per card. */}
      {xs.map((x, i) => (
        <path
          key={`drop-${i}`}
          d={`M ${x} ${RAIL_Y} L ${x} ${NODE_Y}`}
          stroke="var(--primary)"
          strokeOpacity="0.4"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="5 5"
          vectorEffect="non-scaling-stroke"
          className="content-flow-dash"
          style={{ animationDelay: `${-(i * 0.2)}s` }}
        />
      ))}

      {/* Central junction with a restrained pulse ring. */}
      <circle
        cx={centerX}
        cy={JUNCTION_Y}
        r="10"
        fill="var(--primary)"
        fillOpacity="0.18"
        className="content-flow-ring"
      />
      <circle cx={centerX} cy={JUNCTION_Y} r="4.5" fill="var(--primary)" />

      {/* Active nodes above each card — brighten in a repeating sequence. */}
      {xs.map((x, i) => (
        <circle
          key={`node-${i}`}
          cx={x}
          cy={NODE_Y}
          r="4"
          fill="var(--primary)"
          className="content-flow-node"
          style={{
            animationDuration: `${SEQUENCE_LOOP_S}s`,
            animationDelay: `${i * SEQUENCE_STEP_S}s`,
          }}
        />
      ))}

      {/* Traveling signal particles — one per branch, following the hidden
          motion guides. SMIL doesn't honor `prefers-reduced-motion`, so
          these are only rendered client-side once we know motion is OK. */}
      {!reducedMotion &&
        xs.map((_, i) => (
          <circle key={`particle-${i}`} r="5" fill="var(--accent)" opacity="0">
            <animateMotion
              dur={`${SEQUENCE_LOOP_S}s`}
              begin={`${i * SEQUENCE_STEP_S}s`}
              repeatCount="indefinite"
              keyPoints="0;1;1"
              keyTimes="0;0.16;1"
              calcMode="linear"
            >
              <mpath href={`#content-flow-guide-${i}`} />
            </animateMotion>
            <animate
              attributeName="opacity"
              dur={`${SEQUENCE_LOOP_S}s`}
              begin={`${i * SEQUENCE_STEP_S}s`}
              repeatCount="indefinite"
              keyTimes="0;0.02;0.16;0.22;1"
              values="0;1;1;0;0"
              calcMode="linear"
            />
          </circle>
        ))}
    </svg>
  );
}
