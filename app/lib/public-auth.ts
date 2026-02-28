import "server-only";

import { headers } from "next/headers";

const API_KEY = process.env.MOBILE_API_KEY ?? "";

type RateEntry = { count: number; resetAt: number };
const rateMap = new Map<string, RateEntry>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;

async function getClientIp() {
  const hdrs = await headers();
  const forwarded = hdrs.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return hdrs.get("x-real-ip") ?? "unknown";
}

export async function requirePublicApiKey() {
  if (!API_KEY) return null;
  const hdrs = await headers();
  const key = hdrs.get("x-api-key") ?? "";
  if (key !== API_KEY) {
    return { status: 401, message: "Invalid API key" };
  }
  return null;
}

export async function rateLimit() {
  const ip = await getClientIp();
  const now = Date.now();
  const entry = rateMap.get(ip);

  if (!entry || entry.resetAt <= now) {
    rateMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  if (entry.count >= MAX_REQUESTS) {
    return { status: 429, message: "Too many requests" };
  }

  entry.count += 1;
  return null;
}
