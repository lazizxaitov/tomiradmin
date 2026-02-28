import { NextResponse } from "next/server";

import { createPublicOrder } from "@/app/lib/data-store";
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

  const result = createPublicOrder({
    customerId: body?.customerId ? Number(body.customerId) : null,
    customerName: body?.customerName?.toString()?.trim() ?? null,
    customerPhone: body?.customerPhone?.toString()?.trim() ?? null,
    addressId: body?.addressId ? Number(body.addressId) : null,
    addressLine: body?.addressLine?.toString()?.trim() ?? null,
    addressLabel: body?.addressLabel?.toString()?.trim() ?? null,
    addressComment: body?.addressComment?.toString()?.trim() ?? null,
    comment: body?.comment?.toString()?.trim() ?? null,
    paymentMethod: body?.paymentMethod?.toString()?.trim() ?? null,
    deliveryLat: body?.deliveryLat ?? body?.addressLat ?? null,
    deliveryLng: body?.deliveryLng ?? body?.addressLng ?? null,
    bonusUsed: Number(body?.bonusUsed ?? 0),
    items: Array.isArray(body?.items) ? body.items : [],
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ id: result.id, branchId: result.branchId });
}



