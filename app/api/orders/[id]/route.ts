import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";
import { assignOrderToBranch } from "@/app/lib/data-store";

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
  const branchId = Number(body?.branchId);
  if (!branchId) {
    return NextResponse.json({ error: "Invalid branchId" }, { status: 400 });
  }

  const result = assignOrderToBranch(id, branchId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ item: result.item });
}
