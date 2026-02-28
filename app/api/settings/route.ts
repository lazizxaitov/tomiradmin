import { NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";
import { getSettings, updateSettings } from "@/app/lib/data-store";

export async function GET() {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ item: getSettings() });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const cafeName = body?.cafeName?.toString()?.trim();
  if (!cafeName) {
    return NextResponse.json({ error: "Missing cafe name" }, { status: 400 });
  }

  const item = updateSettings({
    cafeName,
    phone: body?.phone?.toString()?.trim() ?? "",
    address: body?.address?.toString()?.trim() ?? "",
    workHours: body?.workHours?.toString()?.trim() ?? "",
    deliveryFee: Number(body?.deliveryFee ?? 0),
    minOrder: Number(body?.minOrder ?? 0),
    currency: body?.currency?.toString()?.trim() ?? "сум",
    bonusPercent: Number(body?.bonusPercent ?? 0),
    bonusRedeemAmount: Number(body?.bonusRedeemAmount ?? 25000),
    instagram: body?.instagram?.toString()?.trim() ?? "",
    telegram: body?.telegram?.toString()?.trim() ?? "",
  });

  return NextResponse.json({ item });
}
