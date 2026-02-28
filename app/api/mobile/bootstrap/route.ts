import { NextResponse } from "next/server";

import { listProducts, store } from "@/app/lib/data-store";

export async function GET() {
  return NextResponse.json({
    data: {
      settings: store.settings,
      banners: store.banners
        .filter((banner) => banner.is_active === 1)
        .sort((a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at)),
      categories: [...store.categories].sort((a, b) => a.sort_order - b.sort_order),
      products: listProducts({ onlyActive: true }),
      branches: store.branches.filter((branch) => branch.is_active === 1),
    },
  });
}
