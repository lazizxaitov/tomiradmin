import { NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";
import { createCategory, store } from "@/app/lib/data-store";

export async function GET() {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = [...store.categories].sort(
    (a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at),
  );
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const nameRu = body?.nameRu?.toString()?.trim();
  const nameUz = body?.nameUz?.toString()?.trim();
  const imageUrl = body?.imageUrl?.toString()?.trim() ?? null;

  if (!nameRu || !nameUz) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }

  const category = createCategory({ nameRu, nameUz, imageUrl });
  return NextResponse.json({ id: category.id });
}
