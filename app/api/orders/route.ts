import { NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";
import { createPublicOrder, listAdminOrders } from "@/app/lib/data-store";

export async function GET() {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ items: listAdminOrders() });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    deliveryLat: body?.deliveryLat ?? body?.addressLat ?? body?.lat ?? body?.latitude ?? null,
    deliveryLng: body?.deliveryLng ?? body?.addressLng ?? body?.lng ?? body?.longitude ?? null,
    bonusUsed: Number(body?.bonusUsed ?? 0),
    items: Array.isArray(body?.items) ? body.items : [],
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ id: result.id, branchId: result.branchId }, { status: 201 });
}



