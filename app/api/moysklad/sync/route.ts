import { NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";
import { updateMoyskladIntegration } from "@/app/lib/data-store";
import { syncMoyskladCatalog, syncMoyskladCustomers } from "@/app/lib/moysklad";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const mode = body?.mode?.toString()?.trim() || "catalog";
  const forceImages = Boolean(body?.forceImages);

  try {
    if (mode === "customers") {
      const result = await syncMoyskladCustomers();
      return NextResponse.json({ mode, result });
    }

    const result = await syncMoyskladCatalog({ forceImages });
    return NextResponse.json({ mode: "catalog", result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    updateMoyskladIntegration({ lastSyncError: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
