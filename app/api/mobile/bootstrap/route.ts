import { NextResponse } from "next/server";

import { listProducts, store } from "@/app/lib/data-store";

export async function GET() {
  const products = listProducts({ onlyActive: true });
  return NextResponse.json({
    data: {
      settings: store.settings,
      banners: store.banners
        .filter((banner) => banner.is_active === 1)
        .sort((a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at)),
      categories: [...store.categories].sort((a, b) => a.sort_order - b.sort_order),
      products,
      topProducts: products.filter((product) => product.is_top === 1),
      promoProducts: products.filter(
        (product) => product.is_promo === 1 && Number(product.promo_price ?? 0) > 0,
      ),
      branches: store.branches.filter((branch) => branch.is_active === 1),
    },
  });
}
