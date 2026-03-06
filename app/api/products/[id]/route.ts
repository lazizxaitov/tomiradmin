import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";
import { deleteProduct, updateProduct } from "@/app/lib/data-store";

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
  const titleRu = body?.titleRu?.toString()?.trim();
  const titleUz = body?.titleUz?.toString()?.trim();
  if (!titleRu || !titleUz) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }

  const item = updateProduct(id, {
    categoryId: body?.categoryId ? Number(body.categoryId) : null,
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

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function DELETE(
  _request: NextRequest,
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

  const removed = deleteProduct(id);
  if (!removed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
