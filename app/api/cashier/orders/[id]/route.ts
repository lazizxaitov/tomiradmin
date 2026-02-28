import { NextRequest, NextResponse } from "next/server";

import { getCashierSession } from "@/app/lib/auth";
import { updateCashierOrder } from "@/app/lib/data-store";

export const runtime = "nodejs";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCashierSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number((await params).id);
  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const courierId =
    body?.courierId === undefined || body?.courierId === null
      ? undefined
      : body?.courierId
        ? Number(body.courierId)
        : null;

  const ok = updateCashierOrder(id, Number(session.b ?? 0) || undefined, {
    courierId,
    status: body?.status?.toString()?.trim(),
    cancelReason: body?.cancelReason?.toString()?.trim() ?? null,
  });

  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
