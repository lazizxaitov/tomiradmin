import { NextRequest, NextResponse } from "next/server";

import { deleteCustomerAddress } from "@/app/lib/data-store";
import { rateLimit, requirePublicApiKey } from "@/app/lib/public-auth";

export const runtime = "nodejs";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; addressId: string }> },
) {
  const authError = await requirePublicApiKey();
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: authError.status });
  }

  const rateError = await rateLimit();
  if (rateError) {
    return NextResponse.json({ error: rateError.message }, { status: rateError.status });
  }

  const parsed = await params;
  const customerId = Number(parsed.id);
  const addressId = Number(parsed.addressId);
  if (!customerId || !addressId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const result = deleteCustomerAddress(customerId, addressId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
