import { NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";
import { createCustomer, store } from "@/app/lib/data-store";

export async function GET() {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = store.customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    bonus_balance: customer.bonus_balance,
    created_at: customer.created_at,
    updated_at: customer.updated_at,
  }));

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = body?.name?.toString()?.trim();
  const phone = body?.phone?.toString()?.trim();
  const password = body?.password?.toString()?.trim();

  if (!name || !phone || !password) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const result = createCustomer({ name, phone, password });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ id: result.item.id });
}
