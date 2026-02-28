import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { findCashierAccountByCredentials } from "@/app/lib/data-store";

export const SESSION_COOKIE = "tomir_admin_session";
export const CASHIER_SESSION_COOKIE = "tomir_cashier_session";
const SESSION_TTL_SEC = 60 * 60 * 24 * 7;

const ADMIN_USER = process.env.ADMIN_USER ?? "admintomir";
const ADMIN_PASS = process.env.ADMIN_PASS ?? "tomir123";
const AUTH_SECRET = process.env.AUTH_SECRET ?? "dev-secret-change";

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice(0, (4 - (value.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function sign(payload: string) {
  return crypto.createHmac("sha256", AUTH_SECRET).update(payload).digest();
}

export function verifyCredentials(username: string, password: string) {
  return username === ADMIN_USER && password === ADMIN_PASS;
}

export function createSessionToken(
  username: string,
  role: "admin" | "cashier" = "admin",
  branchId?: number | null,
) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const payload = JSON.stringify({ u: username, exp, r: role, b: branchId ?? null });
  const payloadEncoded = base64UrlEncode(payload);
  const signatureEncoded = base64UrlEncode(sign(payloadEncoded));
  return `${payloadEncoded}.${signatureEncoded}`;
}

export function verifySessionToken(token: string | undefined | null) {
  if (!token) return null;

  const [payloadEncoded, signatureEncoded] = token.split(".");
  if (!payloadEncoded || !signatureEncoded) return null;

  const expected = base64UrlEncode(sign(payloadEncoded));
  const signatureBuffer = Buffer.from(signatureEncoded);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    const payloadRaw = base64UrlDecode(payloadEncoded).toString("utf8");
    const payload = JSON.parse(payloadRaw) as { u: string; exp: number; r?: string; b?: number | null };
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    redirect("/login");
  }
  return session;
}

export function buildSessionCookie(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SEC,
    secure: process.env.NODE_ENV === "production",
  };
}

export function verifyCashierCredentials(username: string, password: string) {
  return findCashierAccountByCredentials(username, password);
}

export async function getCashierSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CASHIER_SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export async function requireCashier() {
  const session = await getCashierSession();
  if (!session || session.r !== "cashier") {
    redirect("/login");
  }
  return session;
}

export function buildCashierSessionCookie(token: string) {
  return {
    name: CASHIER_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SEC,
    secure: process.env.NODE_ENV === "production",
  };
}
