import { NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";
import { createProduct, listProducts } from "@/app/lib/data-store";

export async function GET() {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = listProducts();
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
  const categoryId = body?.categoryId ? Number(body.categoryId) : null;

  if (!titleRu || !titleUz) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }

  const id = createProduct({
    categoryId,
    titleRu,
    titleUz,
    descriptionTitleRu: body?.descriptionTitleRu?.toString()?.trim() ?? null,
    descriptionTitleUz: body?.descriptionTitleUz?.toString()?.trim() ?? null,
    descriptionTextRu: body?.descriptionTextRu?.toString()?.trim() ?? null,
    descriptionTextUz: body?.descriptionTextUz?.toString()?.trim() ?? null,
    price: Number(body?.price ?? 0),
    priceTextRu: body?.priceTextRu?.toString()?.trim() ?? null,
    priceTextUz: body?.priceTextUz?.toString()?.trim() ?? null,
    pricingMode: body?.pricingMode === "portion" ? "portion" : "quantity",
    stock: Number(body?.stock ?? 0),
    isActive: body?.isActive === false ? false : true,
    images: Array.isArray(body?.images) ? body.images : [],
    portionOptions: Array.isArray(body?.portionOptions) ? body.portionOptions : [],
  });

  return NextResponse.json({ id });
}
