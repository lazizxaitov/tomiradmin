import { NextResponse } from "next/server";

import { createPublicOrder } from "@/app/lib/data-store";
import { rateLimit, requirePublicApiKey } from "@/app/lib/public-auth";

export const runtime = "nodejs";

async function geocodeAddress(query: string) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
    {
      headers: {
        "User-Agent": "tomiradmin/1.0 (public order geocode)",
        Accept: "application/json",
      },
      cache: "no-store",
    },
  ).catch(() => null);

  if (!response?.ok) return null;
  const data = (await response.json().catch(() => null)) as
    | Array<{ lat: string; lon: string }>
    | null;
  const first = data?.[0];
  if (!first) return null;

  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export async function POST(request: Request) {
  const authError = await requirePublicApiKey();
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: authError.status });
  }

  const rateError = await rateLimit();
  if (rateError) {
    return NextResponse.json({ error: rateError.message }, { status: rateError.status });
  }

  const body = await request.json().catch(() => null);
  const addressLine = body?.addressLine?.toString()?.trim() ?? null;

  let deliveryLat = body?.deliveryLat ?? body?.addressLat ?? null;
  let deliveryLng = body?.deliveryLng ?? body?.addressLng ?? null;

  const hasCoords =
    Number.isFinite(Number(deliveryLat)) && Number.isFinite(Number(deliveryLng));

  if (!hasCoords && addressLine) {
    const point = await geocodeAddress(addressLine);
    if (point) {
      deliveryLat = point.lat;
      deliveryLng = point.lng;
    }
  }

  const result = createPublicOrder({
    customerId: body?.customerId ? Number(body.customerId) : null,
    customerName: body?.customerName?.toString()?.trim() ?? null,
    customerPhone: body?.customerPhone?.toString()?.trim() ?? null,
    addressId: body?.addressId ? Number(body.addressId) : null,
    addressLine,
    addressLabel: body?.addressLabel?.toString()?.trim() ?? null,
    addressComment: body?.addressComment?.toString()?.trim() ?? null,
    comment: body?.comment?.toString()?.trim() ?? null,
    paymentMethod: body?.paymentMethod?.toString()?.trim() ?? null,
    deliveryLat,
    deliveryLng,
    bonusUsed: Number(body?.bonusUsed ?? 0),
    items: Array.isArray(body?.items) ? body.items : [],
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ id: result.id, branchId: result.branchId });
}
