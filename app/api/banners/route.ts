import { NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";
import { createBanner, store } from "@/app/lib/data-store";

export async function GET() {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = [...store.banners].sort(
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
  const titleRu = body?.titleRu?.toString()?.trim();
  const titleUz = body?.titleUz?.toString()?.trim();
  const imageUrl = body?.imageUrl?.toString()?.trim();
  const linkUrl = body?.linkUrl?.toString()?.trim() ?? null;
  const sortOrder = Number(body?.sortOrder ?? 0);
  const isActive = body?.isActive === false ? false : true;

  if (!titleRu || !titleUz || !imageUrl) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const id = createBanner({
    titleRu,
    titleUz,
    imageUrl,
    linkUrl,
    sortOrder,
    isActive,
  });

  return NextResponse.json({ id });
}
