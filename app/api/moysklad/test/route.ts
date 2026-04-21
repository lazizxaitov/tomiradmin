import { NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";
import { testMoyskladConnection } from "@/app/lib/moysklad";

export const runtime = "nodejs";

export async function POST() {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await testMoyskladConnection();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Test failed" },
      { status: 500 },
    );
  }
}
