import { NextRequest, NextResponse } from "next/server";

import { listProducts } from "@/app/lib/data-store";
import { rateLimit, requirePublicApiKey } from "@/app/lib/public-auth";

export const runtime = "nodejs";

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

  const categoryId = Number((await params).id);
  if (!categoryId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const items = listProducts({ onlyActive: true, categoryId });
  return NextResponse.json({ items });
}
