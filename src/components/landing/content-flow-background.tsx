/**
 * Decorative DNA / content-network motif for the lower landing page
 * (teaser row → HowItWorks). Three quiet helix clusters that weave through
 * open whitespace. Purely visual - aria-hidden, pointer-events-none,
 * no animation. Rendered behind content (content sits on relative z-10).
 */
export function ContentFlowBackground() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
      viewBox="0 0 1400 4400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMin slice"
    >
      {/* Cluster B - teaser row / process strip band */}
      <path
        d="M-40 700 C160 620, 320 520, 560 480 C760 448, 900 520, 1080 470 C1220 432, 1330 380, 1440 330"
        stroke="rgba(66, 137, 112, 0.15)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M-40 780 C170 700, 340 590, 580 555 C780 528, 920 590, 1100 545 C1240 510, 1350 455, 1440 410"
        stroke="rgba(108, 167, 143, 0.12)"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path
        d="M240 620 L285 560"
        stroke="rgba(108, 167, 143, 0.12)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M560 520 L605 465"
        stroke="rgba(66, 137, 112, 0.12)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M880 540 L925 485"
        stroke="rgba(108, 167, 143, 0.11)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M1160 480 L1205 428"
        stroke="rgba(66, 137, 112, 0.11)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <circle cx="285" cy="560" r="3" fill="rgba(66, 137, 112, 0.18)" />
      <circle cx="605" cy="465" r="3" fill="rgba(108, 167, 143, 0.16)" />
      <circle cx="925" cy="485" r="3" fill="rgba(66, 137, 112, 0.16)" />
      <circle cx="1205" cy="428" r="2.5" fill="rgba(108, 167, 143, 0.15)" />
      <circle cx="140" cy="690" r="2.5" fill="rgba(66, 137, 112, 0.14)" />

      {/* Cluster C - demo theater / feature band (right-to-left drift) */}
      <path
        d="M1440 1700 C1260 1610, 1090 1520, 880 1490 C680 1462, 540 1540, 360 1490 C220 1452, 90 1400, -40 1360"
        stroke="rgba(66, 137, 112, 0.14)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M1440 1790 C1270 1690, 1110 1590, 900 1560 C700 1532, 560 1610, 380 1560 C240 1520, 110 1470, -40 1430"
        stroke="rgba(108, 167, 143, 0.11)"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path
        d="M1160 1610 L1115 1552"
        stroke="rgba(108, 167, 143, 0.11)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M840 1520 L795 1465"
        stroke="rgba(66, 137, 112, 0.11)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M520 1560 L475 1502"
        stroke="rgba(108, 167, 143, 0.1)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M240 1490 L195 1438"
        stroke="rgba(66, 137, 112, 0.1)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <circle cx="1115" cy="1552" r="3" fill="rgba(66, 137, 112, 0.16)" />
      <circle cx="795" cy="1465" r="3" fill="rgba(108, 167, 143, 0.15)" />
      <circle cx="475" cy="1502" r="2.5" fill="rgba(66, 137, 112, 0.14)" />
      <circle cx="195" cy="1438" r="2.5" fill="rgba(108, 167, 143, 0.14)" />
      <circle cx="1300" cy="1680" r="2.5" fill="rgba(66, 137, 112, 0.13)" />

      {/* Cluster D - proof / stats / how-it-works band */}
      <path
        d="M-40 3100 C180 3010, 360 2920, 580 2880 C800 2848, 940 2920, 1140 2870 C1270 2840, 1360 2790, 1440 2750"
        stroke="rgba(66, 137, 112, 0.15)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M-40 3190 C190 3090, 380 2990, 600 2955 C820 2922, 960 2990, 1160 2940 C1290 2910, 1370 2860, 1440 2820"
        stroke="rgba(108, 167, 143, 0.12)"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path
        d="M260 3020 L305 2962"
        stroke="rgba(108, 167, 143, 0.12)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M580 2910 L625 2855"
        stroke="rgba(66, 137, 112, 0.12)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M900 2930 L945 2872"
        stroke="rgba(108, 167, 143, 0.11)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M1180 2880 L1225 2825"
        stroke="rgba(66, 137, 112, 0.11)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <circle cx="305" cy="2962" r="3" fill="rgba(66, 137, 112, 0.17)" />
      <circle cx="625" cy="2855" r="3" fill="rgba(108, 167, 143, 0.16)" />
      <circle cx="945" cy="2872" r="3" fill="rgba(66, 137, 112, 0.15)" />
      <circle cx="1225" cy="2825" r="2.5" fill="rgba(108, 167, 143, 0.15)" />
      <circle cx="120" cy="3120" r="2.5" fill="rgba(66, 137, 112, 0.13)" />
    </svg>
  );
}
