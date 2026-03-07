import { NextRequest, NextResponse } from "next/server";

import { changeCustomerPassword } from "@/app/lib/data-store";
import { rateLimit, requirePublicApiKey } from "@/app/lib/public-auth";

export const runtime = "nodejs";

export async function PATCH(
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
  if (!Number.isFinite(customerId)) {
    return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const currentPassword = body?.currentPassword?.toString() ?? "";
  const newPassword = body?.newPassword?.toString() ?? "";

  const result = changeCustomerPassword(customerId, { currentPassword, newPassword });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
