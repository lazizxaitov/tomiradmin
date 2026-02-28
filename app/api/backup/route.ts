import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";
import { SQLITE_DB_PATH, store } from "@/app/lib/data-store";

export async function GET() {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const bytes = await readFile(SQLITE_DB_PATH);
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${path.basename(SQLITE_DB_PATH)}"`,
      },
    });
  } catch {
    const payload = JSON.stringify(store, null, 2);
    return new NextResponse(payload, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="tomir-backup-${Date.now()}.json"`,
      },
    });
  }
}
