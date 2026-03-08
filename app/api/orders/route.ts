import { NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";
import { createPublicOrder, listAdminOrders } from "@/app/lib/data-store";

function parseCoordinate(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value.trim().replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

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
    deliveryLat: parseCoordinate(body?.deliveryLat ?? body?.addressLat ?? body?.lat ?? body?.latitude),
    deliveryLng: parseCoordinate(body?.deliveryLng ?? body?.addressLng ?? body?.lng ?? body?.longitude),
    bonusUsed: Number(body?.bonusUsed ?? 0),
    items: Array.isArray(body?.items) ? body.items : [],
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ id: result.id, branchId: result.branchId }, { status: 201 });
}



