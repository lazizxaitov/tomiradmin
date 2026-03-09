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
  const rawCourierId = body?.courierId;
  let courierId: number | null | undefined = undefined;
  let outsourceProvider: "yandex" | null | undefined = undefined;

  if (rawCourierId === "__yandex__" || body?.outsourceProvider === "yandex") {
    courierId = null;
    outsourceProvider = "yandex";
  } else if (rawCourierId === undefined || rawCourierId === null) {
    courierId = undefined;
  } else if (rawCourierId === "") {
    courierId = null;
    outsourceProvider = null;
  } else {
    courierId = Number(rawCourierId);
    outsourceProvider = null;
  }

  const ok = updateCashierOrder(id, Number(session.b ?? 0) || undefined, {
    courierId,
    outsourceProvider,
    status: body?.status?.toString()?.trim(),
    cancelReason: body?.cancelReason?.toString()?.trim() ?? null,
  });

  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
