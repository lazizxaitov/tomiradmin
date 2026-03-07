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
    ? await reverseGeocodeByYandex(latRaw, lngRaw)
    : await geocodeByYandex(query!);
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    item,
  });
}
