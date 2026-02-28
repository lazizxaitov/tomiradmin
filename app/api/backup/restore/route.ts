import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { NextResponse } from "next/server";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

import { getSession } from "@/app/lib/auth";
import { restoreStoreSnapshot } from "@/app/lib/data-store";

async function parseSnapshotFromFile(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());

  if (file.name.toLowerCase().endsWith(".json") || file.type.includes("json")) {
    return JSON.parse(bytes.toString("utf8"));
  }

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "tomir-restore-"));
  const tmpDbPath = path.join(tmpDir, "restore.db");
  try {
    await writeFile(tmpDbPath, bytes);
    const db = await open({ filename: tmpDbPath, driver: sqlite3.Database });
    const row = (await db.get("SELECT data FROM app_state WHERE id = 1")) as
      | { data?: string }
      | undefined;
    await db.close();
    if (!row?.data) return null;
    return JSON.parse(row.data);
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Backup file is required" }, { status: 400 });
  }

  try {
    const snapshot = await parseSnapshotFromFile(file);
    if (!snapshot) {
      return NextResponse.json({ error: "Invalid backup file" }, { status: 400 });
    }

    const ok = await restoreStoreSnapshot(snapshot);
    if (!ok) {
      return NextResponse.json({ error: "Backup structure is invalid" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to restore backup" }, { status: 400 });
  }
}
