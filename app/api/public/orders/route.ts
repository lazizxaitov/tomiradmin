import { NextResponse } from "next/server";

import { createPublicOrder } from "@/app/lib/data-store";
import { rateLimit, requirePublicApiKey } from "@/app/lib/public-auth";

export const runtime = "nodejs";

function getYandexGeocoderKey() {
  return (
    process.env.YANDEX_GEOCODER_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY?.trim() ||
    ""
  );
}

function parseCoordinate(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value.trim().replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

async function geocodeAddress(query: string) {
  const key = getYandexGeocoderKey();
  if (!key) return null;

  const url =
    "https://geocode-maps.yandex.ru/1.x/?" +
    new URLSearchParams({
      apikey: key,
      geocode: query,
      format: "json",
      results: "1",
      lang: "ru_RU",
    }).toString();

  const response = await fetch(url, { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return null;

  const data = (await response.json().catch(() => null)) as
    | {
        response?: {
          GeoObjectCollection?: {
            featureMember?: Array<{
              GeoObject?: {
                Point?: { pos?: string };
              };
            }>;
          };
        };
      }
    | null;
  const pos =
    data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos?.trim() ?? "";
  if (!pos) return null;

  const [lngRaw, latRaw] = pos.split(/\s+/);
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
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

  let deliveryLat = body?.deliveryLat ?? body?.addressLat ?? body?.lat ?? body?.latitude ?? null;
  let deliveryLng = body?.deliveryLng ?? body?.addressLng ?? body?.lng ?? body?.longitude ?? null;

  const parsedLat = parseCoordinate(deliveryLat);
  const parsedLng = parseCoordinate(deliveryLng);
  const hasCoords = parsedLat !== null && parsedLng !== null;
  if (hasCoords) {
    deliveryLat = parsedLat;
    deliveryLng = parsedLng;
  }

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
