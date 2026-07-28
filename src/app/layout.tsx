import type { Metadata } from "next";
import { Bricolage_Grotesque, Source_Sans_3 } from "next/font/google";

import { AuthSessionProvider } from "@/components/providers/auth-session-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { buildRootMetadata } from "@/seo/foundation/metadata";

import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const body = Source_Sans_3({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = buildRootMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans" suppressHydrationWarning>
        <AuthSessionProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
