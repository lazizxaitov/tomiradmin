import { NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";
import { createBranch, listBranches } from "@/app/lib/data-store";

export async function GET() {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ items: listBranches() });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const title = body?.title?.toString()?.trim();
  const address = body?.address?.toString()?.trim();

  if (!title || !address) {
    return NextResponse.json({ error: "Missing title/address" }, { status: 400 });
  }

  const item = createBranch({
    title,
    address,
    phone: body?.phone?.toString()?.trim() ?? null,
    workHours: body?.workHours?.toString()?.trim() ?? null,
    lat: body?.lat !== undefined ? Number(body.lat) : null,
    lng: body?.lng !== undefined ? Number(body.lng) : null,
    isActive: body?.isActive !== false,
    moyskladStoreId: body?.moyskladStoreId?.toString()?.trim() ?? null,
  });

  return NextResponse.json({ item }, { status: 201 });
}
