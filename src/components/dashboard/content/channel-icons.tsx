/** Brand channel marks as inline SVG — lucide no longer ships social logos. */

type IconProps = { className?: string };

export function FacebookIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M14 8h3V4h-3c-2.8 0-5 2.2-5 5v2H6v4h3v7h4v-7h3l1-4h-4V9c0-.6.4-1 1-1z" />
    </svg>
  );
}

export function InstagramIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm0 2a3 3 0 00-3 3v10a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H7zm5 3.5A4.5 4.5 0 1112 16.5 4.5 4.5 0 0112 7.5zm0 2A2.5 2.5 0 1014.5 12 2.5 2.5 0 0012 9.5zM17.5 6.75a1.25 1.25 0 11-1.25 1.25A1.25 1.25 0 0117.5 6.75z" />
    </svg>
  );
}

export function YoutubeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M23 12s0-3.2-.4-4.6c-.2-.8-.9-1.5-1.7-1.7C19.5 5.2 12 5.2 12 5.2s-7.5 0-8.9.5c-.8.2-1.5.9-1.7 1.7C1 8.8 1 12 1 12s0 3.2.4 4.6c.2.8.9 1.5 1.7 1.7 1.4.5 8.9.5 8.9.5s7.5 0 8.9-.5c.8-.2 1.5-.9 1.7-1.7.4-1.4.4-4.6.4-4.6zM9.8 15.5v-7l6 3.5-6 3.5z" />
    </svg>
  );
}

export function ThreadsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M12.2 2c-3.4 0-5.9 1.6-6.8 4.2-.2.6.2 1.2.8 1.3.6.1 1.1-.3 1.3-.8.6-1.7 2.2-2.7 4.7-2.7 2.4 0 4 1.2 4.4 3.2.2 1.1-.1 2.1-.8 2.8-.5.5-1.2.9-2.1 1.1 1.1.4 1.9 1.1 2.4 2 .7 1.2.8 2.7.4 4.3-.7 2.8-2.8 4.4-5.7 4.4-2.6 0-4.5-1.1-5.5-3.2-.3-.6 0-1.3.6-1.5.6-.3 1.3 0 1.5.6.6 1.2 1.7 1.9 3.4 1.9 1.8 0 3-1 3.4-2.6.3-1.1.2-2-.2-2.6-.5-.7-1.4-1.1-2.7-1.1h-.6c-.6 0-1.1-.5-1.1-1.1 0-.6.5-1.1 1.1-1.1h.6c1.1 0 1.9-.2 2.4-.5.4-.3.6-.7.5-1.2-.2-1-1.1-1.6-2.5-1.6zm.1 7.4c.5 0 1 .1 1.4.2-.1 1.5-.7 2.6-1.8 3.2-.4.2-.8.3-1.3.3-.8 0-1.4-.2-1.8-.6-.3-.3-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8h2.2z" />
    </svg>
  );
}

export function RedditIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M14.2 3.2a1.3 1.3 0 11.4 2.5l-1.5.3c1.1.4 1.9 1.1 2.4 2 .3-.2.7-.3 1.1-.3a1.8 1.8 0 110 3.6c0 .1 0 .2-.1.3A3.6 3.6 0 0118 13.5c0 2.5-2.7 4.5-6 4.5s-6-2-6-4.5c0-.7.2-1.4.6-2a1.8 1.8 0 11.9-3c.5-.9 1.3-1.6 2.4-2l-1.5-.3a1.3 1.3 0 11.5-2.5l3.3.7zm-4.5 8.3a1.1 1.1 0 100 2.2 1.1 1.1 0 000-2.2zm4.6 0a1.1 1.1 0 100 2.2 1.1 1.1 0 000-2.2zM9.8 14.7c.5.5 1.5.9 2.2.9s1.7-.4 2.2-.9a.6.6 0 11.8.8c-.7.7-2.1 1.2-3 .1-.9 0-2.3-.5-3-1.2a.6.6 0 11.8-.8z" />
    </svg>
  );
}

export function YoutubeShortsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M8.5 3h7a3 3 0 013 3v12a3 3 0 01-3 3h-7a3 3 0 01-3-3V6a3 3 0 013-3zm2.2 5.2v7.6l5.2-3.8-5.2-3.8z" />
    </svg>
  );
}

export function TikTokIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.49V12a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.19-.13z" />
    </svg>
  );
}

export function XIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M3 3h4.2l4.3 6.1L16.8 3H21l-7.2 8.5L21.5 21h-4.2l-4.8-6.8L6.2 21H2l7.7-9.1L3 3z" />
    </svg>
  );
}

export function LinkedInIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M6.5 9H3.7v11.5h2.8V9zM5.1 3.5A1.7 1.7 0 103.4 5.2 1.7 1.7 0 005.1 3.5zM20.3 9c-1.7 0-2.9.9-3.4 1.8V9H14v11.5h2.9v-6.1c0-1.6.9-2.6 2.2-2.6s2 .9 2 2.6v6.1h2.9v-6.6C24 11 22.5 9 20.3 9z" />
    </svg>
  );
}
