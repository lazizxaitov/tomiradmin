import { NextResponse } from "next/server";

import { loginCustomer } from "@/app/lib/data-store";
import { rateLimit, requirePublicApiKey } from "@/app/lib/public-auth";

export const runtime = "nodejs";

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
  const phone = body?.phone?.toString()?.trim() ?? "";
  const password = body?.password?.toString()?.trim() ?? "";

  if (!phone || !password) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const item = loginCustomer({ phone, password });
  if (!item) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  return NextResponse.json({ item });
}
