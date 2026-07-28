import { ImageResponse } from "next/og";

import { socialImageCopy } from "@/seo/foundation/social-images";

const copyMeta = socialImageCopy();

export const runtime = "edge";
export const alt = copyMeta.alt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const copy = socialImageCopy();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 72,
          background: "linear-gradient(145deg, #0f172a 0%, #0f766e 55%, #134e4a 100%)",
          color: "#f8fafc",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: "-0.04em" }}>
          {copy.title}
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 28,
            fontFamily: "system-ui, sans-serif",
            opacity: 0.92,
            maxWidth: 900,
          }}
        >
          {copy.subtitle}
        </div>
      </div>
    ),
    { ...size }
  );
}
