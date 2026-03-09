import { NextResponse } from "next/server";

import { getCashierSession, getSession } from "@/app/lib/auth";
import { createCourier, listCouriers } from "@/app/lib/data-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  const cashier = await getCashierSession();
  if (!session && !cashier) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ items: listCouriers() });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = createCourier({
    branchId: Number(body?.branchId ?? 0),
    name: body?.name?.toString()?.trim() ?? "",
    phone: body?.phone?.toString() ?? null,
    carNumber: body?.carNumber?.toString() ?? null,
    comment: body?.comment?.toString() ?? null,
    isActive: body?.isActive !== false,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ item: result.item }, { status: 201 });
}
