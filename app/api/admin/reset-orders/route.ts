import { NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";
import { resetOrderStatsAndHistory } from "@/app/lib/data-store";

export const runtime = "nodejs";

export async function POST() {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = resetOrderStatsAndHistory();
  return NextResponse.json(result);
}
