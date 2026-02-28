import { NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
    {
      headers: {
        "User-Agent": "tomiradmin/1.0 (admin geocode)",
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Geocoder failed" }, { status: 502 });
  }

  const data = (await response.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
  const first = data[0];
  if (!first) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 502 });
  }

  return NextResponse.json({
    item: {
      lat,
      lng,
      address: first.display_name ?? query,
    },
  });
}
