import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

function contentTypeFromExt(ext: string) {
  switch (ext.toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path: parts } = await params;
  const safeParts = Array.isArray(parts) ? parts.filter(Boolean) : [];

  const baseDir = path.join(process.cwd(), "data", "uploads");
  const filePath = path.join(baseDir, ...safeParts);
  const resolvedBase = path.resolve(baseDir) + path.sep;
  const resolvedFile = path.resolve(filePath);

  if (!resolvedFile.startsWith(resolvedBase)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const bytes = await readFile(resolvedFile);
    const ext = path.extname(resolvedFile);
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentTypeFromExt(ext),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

