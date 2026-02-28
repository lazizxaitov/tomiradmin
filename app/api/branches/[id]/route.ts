import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";
import { deleteBranch, updateBranch } from "@/app/lib/data-store";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branchId = Number((await params).id);
  if (!branchId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);

  const item = updateBranch(branchId, {
    title: body?.title?.toString()?.trim(),
    address: body?.address?.toString()?.trim(),
    phone: body?.phone?.toString()?.trim() ?? undefined,
    workHours: body?.workHours?.toString()?.trim() ?? undefined,
    lat: body?.lat !== undefined ? Number(body.lat) : undefined,
    lng: body?.lng !== undefined ? Number(body.lng) : undefined,
    isActive: body?.isActive,
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branchId = Number((await params).id);
  if (!branchId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const removed = deleteBranch(branchId);
  if (!removed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
