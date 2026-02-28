import { NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";
import { createCashierAccount, listCashierAccounts } from "@/app/lib/data-store";

export async function GET() {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = listCashierAccounts().map((account) => ({
    id: account.id,
    username: account.username,
    branch_id: account.branch_id,
    display_name: account.display_name,
    is_active: account.is_active,
    created_at: account.created_at,
    updated_at: account.updated_at,
  }));

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = createCashierAccount({
    username: body?.username?.toString()?.trim() ?? "",
    password: body?.password?.toString()?.trim() ?? "",
    branchId: Number(body?.branchId ?? 0),
    displayName: body?.displayName?.toString()?.trim() ?? "",
    isActive: body?.isActive !== false,
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

  return NextResponse.json({ item }, { status: 201 });
}
