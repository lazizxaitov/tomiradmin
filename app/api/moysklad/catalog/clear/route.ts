import { NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";
import { getMoyskladIntegration, persistStore, store, updateMoyskladIntegration } from "@/app/lib/data-store";

export const runtime = "nodejs";

export async function POST() {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const beforeProducts = store.products.length;
  const beforeImages = store.product_images.length;

  const removedProductIds = new Set<number>();
  store.products.forEach((p) => {
    if (!p?.moysklad_id) return;
    removedProductIds.add(Number(p.id));
  });

  store.products = store.products.filter((p) => !p?.moysklad_id);
  store.product_images = store.product_images.filter((img) => !removedProductIds.has(Number(img.product_id)));
  store.portion_options = store.portion_options.filter((row) => !removedProductIds.has(Number(row.product_id)));

  const removedProducts = beforeProducts - store.products.length;
  const removedImages = beforeImages - store.product_images.length;

  const integration = getMoyskladIntegration();
  if (integration.catalog_products_synced_at) {
    updateMoyskladIntegration({ catalogProductsSyncedAt: null });
  }

  await persistStore();

  return NextResponse.json({
    ok: true,
    removed: {
      products: removedProducts,
      images: removedImages,
    },
  });
}

