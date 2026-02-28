import { NextResponse } from "next/server";

import { getCashierSession } from "@/app/lib/auth";
import { getBranchById, listCashierOrders } from "@/app/lib/data-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getCashierSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branchId = Number(session.b ?? 0) || undefined;
  return NextResponse.json({
    items: listCashierOrders(branchId),
    branch: branchId ? getBranchById(branchId) : null,
  });
}
