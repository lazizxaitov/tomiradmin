import { NextResponse } from "next/server";

import { listProducts } from "@/app/lib/data-store";
import { rateLimit, requirePublicApiKey } from "@/app/lib/public-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authError = await requirePublicApiKey();
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: authError.status });
  }

  const rateError = await rateLimit();
  if (rateError) {
    return NextResponse.json({ error: rateError.message }, { status: rateError.status });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type")?.trim();

  const items = listProducts({
    onlyActive: true,
    onlyTop: type === "top",
    onlyPromotional: type === "promo",
  });
  return NextResponse.json({ items });
}
