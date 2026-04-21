import { NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";
import { listMoyskladStores } from "@/app/lib/moysklad";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await listMoyskladStores();
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load stores" },
      { status: 500 },
    );
  }
}
