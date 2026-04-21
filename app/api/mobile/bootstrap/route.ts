import { NextResponse } from "next/server";

import { listProducts, store } from "@/app/lib/data-store";

export async function GET() {
  const products = listProducts({ onlyActive: true });
  const imagesByProductId = new Map<number, string[]>();
  store.product_images.forEach((img) => {
    const pid = Number(img.product_id);
    if (!pid || !img.url) return;
    if (!imagesByProductId.has(pid)) imagesByProductId.set(pid, []);
    imagesByProductId.get(pid)!.push(img.url);
  });

  // Ensure stable order.
  imagesByProductId.forEach((urls, pid) => {
    const sorted = [...store.product_images]
      .filter((img) => Number(img.product_id) === pid)
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
      .map((img) => img.url);
    imagesByProductId.set(pid, sorted.filter(Boolean));
  });

  const lastProductImageByCategory = new Map<number, string>();
  [...store.products]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .forEach((product) => {
      const categoryId = product.category_id ? Number(product.category_id) : 0;
      if (!categoryId) return;
      if (lastProductImageByCategory.has(categoryId)) return;
      const first = imagesByProductId.get(product.id)?.[0];
      if (first) lastProductImageByCategory.set(categoryId, first);
    });

  return NextResponse.json({
    data: {
      settings: store.settings,
      banners: store.banners
        .filter((banner) => banner.is_active === 1)
        .sort((a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at)),
      categories: [...store.categories]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((category) => ({
          ...category,
          image_url:
            category.image_url ||
            (category.id ? lastProductImageByCategory.get(Number(category.id)) ?? null : null),
        })),
      products: products.map((product) => ({
        ...product,
        images: imagesByProductId.get(product.id) ?? [],
      })),
      topProducts: products.filter((product) => product.is_top === 1),
      promoProducts: products.filter(
        (product) => product.is_promo === 1 && Number(product.promo_price ?? 0) > 0,
      ),
      branches: store.branches.filter((branch) => branch.is_active === 1),
    },
  });
}
