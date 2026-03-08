import { NextRequest, NextResponse } from "next/server";

import { addCustomerAddress, listCustomerAddresses } from "@/app/lib/data-store";
import { rateLimit, requirePublicApiKey } from "@/app/lib/public-auth";

export const runtime = "nodejs";

function parseCoordinate(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value.trim().replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requirePublicApiKey();
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: authError.status });
  }

  const rateError = await rateLimit();
  if (rateError) {
    return NextResponse.json({ error: rateError.message }, { status: rateError.status });
  }

  const customerId = Number((await params).id);
  if (!customerId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const items = listCustomerAddresses(customerId).map((item) => ({
    ...item,
    lat: item.lat ?? null,
    lng: item.lng ?? null,
    latitude: item.lat ?? null,
    longitude: item.lng ?? null,
  }));
  return NextResponse.json({ items });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requirePublicApiKey();
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: authError.status });
  }

  const rateError = await rateLimit();
  if (rateError) {
    return NextResponse.json({ error: rateError.message }, { status: rateError.status });
  }

  const customerId = Number((await params).id);
  if (!customerId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const label = body?.label?.toString()?.trim() ?? null;
  const addressLine = body?.addressLine?.toString()?.trim();
  const comment = body?.comment?.toString()?.trim() ?? null;
  const isDefault = body?.isDefault === true;
  const latRaw = body?.lat ?? body?.latitude;
  const lngRaw = body?.lng ?? body?.longitude;
  const lat = parseCoordinate(latRaw);
  const lng = parseCoordinate(lngRaw);

  if (!addressLine) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  const id = addCustomerAddress(customerId, {
    label,
    addressLine,
    comment,
    lat,
    lng,
    isDefault,
  });

  return NextResponse.json({ id });
}
