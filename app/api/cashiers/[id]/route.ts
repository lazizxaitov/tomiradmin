import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";
import { updateCashierAccount } from "@/app/lib/data-store";

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
  const result = updateCashierAccount(id, {
    username: body?.username?.toString()?.trim(),
    password: body?.password?.toString()?.trim(),
    branchId: body?.branchId !== undefined ? Number(body.branchId) : undefined,
    displayName: body?.displayName?.toString()?.trim(),
    isActive: body?.isActive,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const item = {
    id: result.item.id,
    username: result.item.username,
    branch_id: result.item.branch_id,
    display_name: result.item.display_name,
    is_active: result.item.is_active,
    created_at: result.item.created_at,
    updated_at: result.item.updated_at,
  };

  return NextResponse.json({ item });
}
