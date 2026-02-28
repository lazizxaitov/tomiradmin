import { NextResponse } from "next/server";

import { rateLimit, requirePublicApiKey } from "@/app/lib/public-auth";
import { store } from "@/app/lib/data-store";

export const runtime = "nodejs";

export async function GET() {
  const authError = await requirePublicApiKey();
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: authError.status });
  }

  const rateError = await rateLimit();
  if (rateError) {
    return NextResponse.json({ error: rateError.message }, { status: rateError.status });
  }

  const items = [...store.categories].sort(
    (a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at),
  );

  return NextResponse.json({ items });
}
