import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { ACTIVE_BRAND_COOKIE } from "@/lib/dev/zynava-constants";

export type ActiveBrandCookiePayload = {
  brandId: string;
  companyName: string;
  website: string;
  userName: string;
  hasProfile: boolean;
  hasStrategy: boolean;
  /** Unix ms */
  exp: number;
};

const MAX_AGE_SEC = 60 * 60 * 24 * 14; // 14 days
const MAX_PAYLOAD_BYTES = 2048;

function signingSecret(): string | null {
  const secret = process.env.AUTH_SECRET?.trim();
  return secret || null;
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

function sign(body: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(body).digest());
}

export function sealActiveBrandCookie(
  payload: Omit<ActiveBrandCookiePayload, "exp">
): string | null {
  const secret = signingSecret();
  if (!secret) return null;

  const full: ActiveBrandCookiePayload = {
    ...payload,
    exp: Date.now() + MAX_AGE_SEC * 1000,
  };
  const body = b64url(JSON.stringify(full));
  if (Buffer.byteLength(body, "utf8") > MAX_PAYLOAD_BYTES) return null;
  return `${body}.${sign(body, secret)}`;
}

export function unsealActiveBrandCookie(
  raw: string | undefined | null
): ActiveBrandCookiePayload | null {
  if (!raw) return null;
  const secret = signingSecret();
  if (!secret) return null;

  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;

  const expected = sign(body, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(
      fromB64url(body).toString("utf8")
    ) as ActiveBrandCookiePayload;
    if (
      typeof parsed.brandId !== "string" ||
      typeof parsed.companyName !== "string" ||
      typeof parsed.website !== "string" ||
      typeof parsed.userName !== "string" ||
      typeof parsed.hasProfile !== "boolean" ||
      typeof parsed.hasStrategy !== "boolean" ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setActiveBrandCookie(
  payload: Omit<ActiveBrandCookiePayload, "exp">
): Promise<boolean> {
  const sealed = sealActiveBrandCookie(payload);
  if (!sealed) return false;
  const jar = await cookies();
  jar.set(ACTIVE_BRAND_COOKIE, sealed, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
  return true;
}

export async function readActiveBrandCookie(): Promise<ActiveBrandCookiePayload | null> {
  const jar = await cookies();
  return unsealActiveBrandCookie(jar.get(ACTIVE_BRAND_COOKIE)?.value);
}
