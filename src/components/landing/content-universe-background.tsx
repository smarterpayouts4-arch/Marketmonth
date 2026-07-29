/**
 * Decorative DNA / content-network motif for the landing hero + content-universe band.
 * Purely visual - aria-hidden, pointer-events-none, no animation.
 */
export function ContentUniverseBackground() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1400 900"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Primary helix strands */}
      <path
        d="M80 720 C220 620, 340 520, 480 480 C640 430, 760 500, 900 420 C1040 340, 1160 260, 1320 180"
        stroke="rgba(66, 137, 112, 0.22)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M120 780 C260 680, 380 560, 520 530 C680 490, 800 560, 940 470 C1080 380, 1200 300, 1360 220"
        stroke="rgba(108, 167, 143, 0.18)"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M40 640 C180 560, 300 460, 440 430 C600 390, 720 460, 860 390 C1000 320, 1120 240, 1280 160"
        stroke="rgba(66, 137, 112, 0.14)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Cross-links suggesting a helix / connected network */}
      <path
        d="M300 600 L340 540"
        stroke="rgba(108, 167, 143, 0.16)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M480 500 L520 450"
        stroke="rgba(66, 137, 112, 0.16)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M700 500 L740 440"
        stroke="rgba(108, 167, 143, 0.15)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M900 430 L940 370"
        stroke="rgba(66, 137, 112, 0.15)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M1080 320 L1120 270"
        stroke="rgba(108, 167, 143, 0.13)"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* Soft nodes */}
      <circle cx="300" cy="600" r="3.5" fill="rgba(66, 137, 112, 0.24)" />
      <circle cx="340" cy="540" r="2.5" fill="rgba(108, 167, 143, 0.2)" />
      <circle cx="480" cy="500" r="3.5" fill="rgba(66, 137, 112, 0.22)" />
      <circle cx="520" cy="450" r="2.5" fill="rgba(108, 167, 143, 0.18)" />
      <circle cx="700" cy="500" r="3.5" fill="rgba(66, 137, 112, 0.2)" />
      <circle cx="740" cy="440" r="2.5" fill="rgba(108, 167, 143, 0.18)" />
      <circle cx="900" cy="430" r="3.5" fill="rgba(66, 137, 112, 0.19)" />
      <circle cx="940" cy="370" r="2.5" fill="rgba(108, 167, 143, 0.17)" />
      <circle cx="1080" cy="320" r="3" fill="rgba(66, 137, 112, 0.17)" />
      <circle cx="1120" cy="270" r="2.5" fill="rgba(108, 167, 143, 0.16)" />
      <circle cx="200" cy="680" r="2.5" fill="rgba(66, 137, 112, 0.18)" />
      <circle cx="1240" cy="200" r="3" fill="rgba(108, 167, 143, 0.17)" />
    </svg>
  );
}
