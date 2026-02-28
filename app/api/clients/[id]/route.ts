import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";
import { updateCustomerByAdmin } from "@/app/lib/data-store";

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
  const name = body?.name?.toString()?.trim();
  const phone = body?.phone?.toString()?.trim();
  const password = body?.password?.toString()?.trim();

  if (!name || !phone) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const result = updateCustomerByAdmin(id, {
    name,
    phone,
    password: password || undefined,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    item: {
      id: result.item.id,
      name: result.item.name,
      phone: result.item.phone,
      bonus_balance: result.item.bonus_balance,
      created_at: result.item.created_at,
      updated_at: result.item.updated_at,
    },
  });
}
