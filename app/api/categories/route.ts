import { NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";
import { createCategory, store } from "@/app/lib/data-store";

export async function GET() {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin UX: if category image isn't uploaded, fallback to the latest product image in this category.
  const bestImageByProductId = new Map<
    number,
    { url: string; sort_order: number; id: number }
  >();
  for (const img of store.product_images) {
    const current = bestImageByProductId.get(img.product_id);
    if (!current) {
      bestImageByProductId.set(img.product_id, {
        url: img.url,
        sort_order: img.sort_order,
        id: img.id,
      });
      continue;
    }

    // Prefer lower sort_order, then lower id.
    if (
      img.sort_order < current.sort_order ||
      (img.sort_order === current.sort_order && img.id < current.id)
    ) {
      bestImageByProductId.set(img.product_id, {
        url: img.url,
        sort_order: img.sort_order,
        id: img.id,
      });
    }
  }

  const latestProductByCategory = new Map<
    number,
    { id: number; created_at: string }
  >();
  for (const p of store.products) {
    if (!p.category_id) continue;
    const existing = latestProductByCategory.get(p.category_id);
    if (!existing || p.created_at > existing.created_at) {
      latestProductByCategory.set(p.category_id, { id: p.id, created_at: p.created_at });
    }
  }

  const fallbackImageByCategory = new Map<number, string>();
  for (const [categoryId, p] of latestProductByCategory.entries()) {
    const best = bestImageByProductId.get(p.id);
    if (best?.url) fallbackImageByCategory.set(categoryId, best.url);
  }

  const items = [...store.categories].map((c) => {
    if (c.image_url) return c;
    const fallback = fallbackImageByCategory.get(c.id) ?? null;
    return fallback ? { ...c, image_url: fallback } : c;
  }).sort(
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
