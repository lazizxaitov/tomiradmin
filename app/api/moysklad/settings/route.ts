import { NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";
import { getMoyskladIntegration, updateMoyskladIntegration } from "@/app/lib/data-store";
import { hasMoyskladCredentials, setMoyskladCredentials } from "@/app/lib/moysklad";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integration = getMoyskladIntegration();
  return NextResponse.json({
    item: {
      enabled: integration.enabled,
      baseUrl: integration.base_url,
      authMode: integration.auth_mode,
      priceTypeId: integration.price_type_id,
      priceTypeName: integration.price_type_name,
      lastSyncAt: integration.last_sync_at,
      lastSyncError: integration.last_sync_error,
      hasCredentials: hasMoyskladCredentials(),
    },
  });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  const enabled = body?.enabled !== undefined ? Boolean(body.enabled) : undefined;
  const baseUrl = body?.baseUrl?.toString()?.trim();
  const authModeRaw = body?.authMode?.toString()?.trim();
  const existing = getMoyskladIntegration();
  const authMode =
    authModeRaw === "basic" ? "basic" : authModeRaw === "token" ? "token" : existing.auth_mode;

  if (baseUrl !== undefined) {
    updateMoyskladIntegration({
      baseUrl: baseUrl || "https://api.moysklad.ru/api/remap/1.2",
    });
  }

  if (enabled !== undefined || authModeRaw !== undefined) {
    updateMoyskladIntegration({
      enabled: enabled ?? undefined,
      authMode,
    });
  }

  // Credentials are write-only (we never return them).
  const token = body?.token !== undefined ? body?.token?.toString() : undefined;
  const login = body?.login !== undefined ? body?.login?.toString() : undefined;
  const password = body?.password !== undefined ? body?.password?.toString() : undefined;
  if (token !== undefined || login !== undefined || password !== undefined) {
    setMoyskladCredentials({
      authMode,
      token: token ?? null,
      login: login ?? null,
      password: password ?? null,
    });
  }

  const priceTypeId =
    body?.priceTypeId !== undefined ? body?.priceTypeId?.toString()?.trim() || null : undefined;
  const priceTypeName =
    body?.priceTypeName !== undefined
      ? body?.priceTypeName?.toString()?.trim() || null
      : undefined;
  if (priceTypeId !== undefined || priceTypeName !== undefined) {
    updateMoyskladIntegration({ priceTypeId, priceTypeName });
  }

  const integration = getMoyskladIntegration();
  return NextResponse.json({
    item: {
      enabled: integration.enabled,
      baseUrl: integration.base_url,
      authMode: integration.auth_mode,
      priceTypeId: integration.price_type_id,
      priceTypeName: integration.price_type_name,
      lastSyncAt: integration.last_sync_at,
      lastSyncError: integration.last_sync_error,
      hasCredentials: hasMoyskladCredentials(),
    },
  });
}
