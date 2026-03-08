import { NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";

function getYandexGeocoderKey() {
  return (
    process.env.YANDEX_GEOCODER_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY?.trim() ||
    ""
  );
}

async function geocodeByYandex(query: string) {
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
                metaDataProperty?: {
                  GeocoderMetaData?: { text?: string };
                };
              };
            }>;
          };
        };
      }
    | null;

  const first =
    data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject ?? null;
  const pos = first?.Point?.pos?.trim();
  if (!pos) return null;

  const [lngRaw, latRaw] = pos.split(/\s+/);
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    lat,
    lng,
    address: first?.metaDataProperty?.GeocoderMetaData?.text ?? query,
  };
}

async function reverseGeocodeByYandex(lat: number, lng: number) {
  const key = getYandexGeocoderKey();
  if (!key) return null;

  const url =
    "https://geocode-maps.yandex.ru/1.x/?" +
    new URLSearchParams({
      apikey: key,
      geocode: `${lng},${lat}`,
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
                metaDataProperty?: {
                  GeocoderMetaData?: { text?: string };
                };
              };
            }>;
          };
        };
      }
    | null;

  const first =
    data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject ?? null;
  const pos = first?.Point?.pos?.trim();
  if (!pos) return null;

  const [lngRaw, latRaw] = pos.split(/\s+/);
  const parsedLat = Number(latRaw);
  const parsedLng = Number(lngRaw);
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null;

  return {
    lat: parsedLat,
    lng: parsedLng,
    address: first?.metaDataProperty?.GeocoderMetaData?.text ?? `${lat}, ${lng}`,
  };
}

async function geocodeByNominatim(query: string) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
    {
      headers: {
        "User-Agent": "tomiradmin/1.0 (admin geocode fallback)",
        Accept: "application/json",
      },
      cache: "no-store",
    },
  ).catch(() => null);
  if (!response?.ok) return null;

  const data = (await response.json().catch(() => null)) as
    | Array<{ lat: string; lon: string; display_name?: string }>
    | null;
  const first = data?.[0];
  if (!first) return null;

  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    lat,
    lng,
    address: first.display_name ?? query,
  };
}

async function reverseGeocodeByNominatim(lat: number, lng: number) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
    {
      headers: {
        "User-Agent": "tomiradmin/1.0 (admin reverse geocode fallback)",
        Accept: "application/json",
      },
      cache: "no-store",
    },
  ).catch(() => null);
  if (!response?.ok) return null;

  const data = (await response.json().catch(() => null)) as
    | { lat?: string; lon?: string; display_name?: string }
    | null;
  const parsedLat = Number(data?.lat);
  const parsedLng = Number(data?.lon);
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null;

  return {
    lat: parsedLat,
    lng: parsedLng,
    address: data?.display_name ?? `${lat}, ${lng}`,
  };
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();
  const latRaw = Number(searchParams.get("lat"));
  const lngRaw = Number(searchParams.get("lng"));
  const hasCoords = Number.isFinite(latRaw) && Number.isFinite(lngRaw);

  if (!query && !hasCoords) {
    return NextResponse.json({ error: "Missing query or coordinates" }, { status: 400 });
  }

  const item = hasCoords
    ? (await reverseGeocodeByYandex(latRaw, lngRaw)) ??
      (await reverseGeocodeByNominatim(latRaw, lngRaw))
    : (await geocodeByYandex(query!)) ?? (await geocodeByNominatim(query!));
  if (!item) {
    return NextResponse.json({ error: "Geocoder failed" }, { status: 502 });
  }

  return NextResponse.json({
    item,
  });
}
