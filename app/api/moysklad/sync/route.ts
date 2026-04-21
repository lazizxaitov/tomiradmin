import { NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";
import { updateMoyskladIntegration } from "@/app/lib/data-store";
import { syncMoyskladCatalog, syncMoyskladCustomers } from "@/app/lib/moysklad";

export const runtime = "nodejs";

type SyncJob = {
  running: boolean;
  mode: "catalog" | "customers";
  forceImages: boolean;
  startedAt: string;
  finishedAt: string | null;
  lastError: string | null;
  progress: { stage: string; processed: number; total: number | null } | null;
};

let job: SyncJob | null = null;

function nowIso() {
  return new Date().toISOString();
}

function safeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Sync failed";
}

function startJob(input: { mode: "catalog" | "customers"; forceImages: boolean }) {
  if (job?.running) return job;

  job = {
    running: true,
    mode: input.mode,
    forceImages: input.forceImages,
    startedAt: nowIso(),
    finishedAt: null,
    lastError: null,
    progress: { stage: input.mode, processed: 0, total: null },
  };

  // Persist "started" so UI can show last sync immediately.
  updateMoyskladIntegration({ lastSyncAt: job.startedAt, lastSyncError: null });

  // Run in background to avoid nginx timeouts on large accounts.
  void (async () => {
    try {
      if (input.mode === "customers") {
        await syncMoyskladCustomers();
      } else {
        await syncMoyskladCatalog({
          forceImages: input.forceImages,
          onProgress: (progress) => {
            if (!job) return;
            job.progress = progress;
          },
        });
      }
      updateMoyskladIntegration({ lastSyncAt: nowIso(), lastSyncError: null });
    } catch (error) {
      const message = safeErrorMessage(error);
      job!.lastError = message;
      updateMoyskladIntegration({ lastSyncError: message, lastSyncAt: nowIso() });
    } finally {
      job!.running = false;
      job!.finishedAt = nowIso();
    }
  })();

  return job;
}

export async function GET() {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    job: job
      ? {
          running: job.running,
          mode: job.mode,
          forceImages: job.forceImages,
          startedAt: job.startedAt,
          finishedAt: job.finishedAt,
          lastError: job.lastError,
          progress: job.progress,
        }
      : null,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const mode = body?.mode?.toString()?.trim() || "catalog";
  const forceImages = Boolean(body?.forceImages);

  const normalizedMode = mode === "customers" ? "customers" : "catalog";
  const current = startJob({ mode: normalizedMode, forceImages });
  return NextResponse.json({
    ok: true,
    job: {
      running: current.running,
      mode: current.mode,
      forceImages: current.forceImages,
      startedAt: current.startedAt,
      finishedAt: current.finishedAt,
      lastError: current.lastError,
      progress: current.progress,
    },
  });
}
