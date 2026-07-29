/**
 * Minimal inline brand glyphs for the social distribution channels used
 * across the landing page (Content Flow section, Month Plan feature).
 *
 * `lucide-react` (the project's icon library) has no social brand marks, and
 * the operating rules forbid adding a new icon dependency for a handful of
 * glyphs, so these are hand-authored single-path SVGs sized to inherit
 * `currentColor`. Shared here so no feature duplicates its own copy.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function FacebookIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M13.5 21v-7.6h2.55l.38-2.96h-2.93V8.56c0-.86.24-1.44 1.47-1.44h1.57V4.47C16.2 4.4 15.29 4.32 14.23 4.32c-2.2 0-3.71 1.34-3.71 3.8v2.32H7.96v2.96h2.56V21h2.98Z" />
    </svg>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <rect
        x="3.75"
        y="3.75"
        width="16.5"
        height="16.5"
        rx="4.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="16.85" cy="7.15" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function YoutubeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M21.6 8.2a2.9 2.9 0 0 0-2.05-2.06C17.8 5.7 12 5.7 12 5.7s-5.8 0-7.55.44A2.9 2.9 0 0 0 2.4 8.2 30.4 30.4 0 0 0 2 12c0 1.28.13 2.55.4 3.8a2.9 2.9 0 0 0 2.05 2.06C6.2 18.3 12 18.3 12 18.3s5.8 0 7.55-.44a2.9 2.9 0 0 0 2.05-2.06c.27-1.25.4-2.52.4-3.8 0-1.28-.13-2.55-.4-3.8ZM10.02 14.9V9.1L15.2 12l-5.18 2.9Z" />
    </svg>
  );
}

export function TiktokIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M16.6 3h-2.9v12.3a2.6 2.6 0 1 1-1.85-2.5V9.7a5.7 5.7 0 1 0 4.75 5.62V9.05a7.6 7.6 0 0 0 4.4 1.4V7.55a4.7 4.7 0 0 1-4.4-4.4V3Z" />
    </svg>
  );
}

export function LinkedinIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M6.94 8.5H3.83V20h3.1V8.5ZM5.4 3.5a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6ZM20.5 20h-3.1v-6.02c0-1.43-.03-3.27-2-3.27-2 0-2.3 1.56-2.3 3.17V20h-3.1V8.5h2.98v1.57h.04c.41-.78 1.44-1.6 2.96-1.6 3.17 0 3.75 2.09 3.75 4.8V20Z" />
    </svg>
  );
}
