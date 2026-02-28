import { NextResponse } from "next/server";

import { getCashierSession, getSession } from "@/app/lib/auth";
import { listCouriers } from "@/app/lib/data-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  const cashier = await getCashierSession();
  if (!session && !cashier) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branchId = cashier && !session ? Number(cashier.b ?? 0) || undefined : undefined;
  return NextResponse.json({ items: listCouriers(branchId) });
}
