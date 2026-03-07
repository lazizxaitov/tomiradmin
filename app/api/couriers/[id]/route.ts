import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";
import { deleteCourier, updateCourier } from "@/app/lib/data-store";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number((await params).id);
  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const result = updateCourier(id, {
    branchId: body?.branchId !== undefined ? Number(body.branchId) : undefined,
    name: body?.name?.toString()?.trim(),
    phone: body?.phone?.toString() ?? undefined,
    carNumber: body?.carNumber?.toString() ?? undefined,
    comment: body?.comment?.toString() ?? undefined,
    isActive: body?.isActive,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ item: result.item });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number((await params).id);
  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const result = deleteCourier(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
