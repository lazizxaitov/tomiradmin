import { NextResponse } from "next/server";

import { getSession } from "@/app/lib/auth";
import { getMoyskladIntegration, store, sumStockAdjustments } from "@/app/lib/data-store";
import { hasMoyskladCredentials } from "@/app/lib/moysklad";
import { decryptSecret } from "@/app/lib/secret";

export const runtime = "nodejs";

type StockRow = {
  name?: string;
  stock?: number;
  quantity?: number;
  freeStock?: number;
  meta?: { href?: string; type?: string };
};

function extractIdFromHref(href?: string | null) {
  if (!href) return null;
  const parts = href.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.r !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integration = getMoyskladIntegration();
  if (!integration.enabled) {
    return NextResponse.json({ error: "MoySklad integration disabled" }, { status: 400 });
  }
  if (!hasMoyskladCredentials()) {
    return NextResponse.json({ error: "Missing MoySklad credentials" }, { status: 400 });
  }

  const url = new URL(request.url);
  const storeId = url.searchParams.get("storeId")?.trim() || "";
  if (!storeId) {
    return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
  }

  const baseUrl = (integration.base_url || "https://api.moysklad.ru/api/remap/1.2").replace(/\/+$/, "");
  const filter = `store=${baseUrl}/entity/store/${storeId}`;
  const stockUrl =
    `${baseUrl}/report/stock/all/current?` +
    new URLSearchParams({
      stockType: "freeStock",
      limit: "1000",
      filter,
    }).toString();

  const authMode = integration.auth_mode;
  const authHeader =
    authMode === "basic"
      ? (() => {
          const login = decryptSecret(integration.login_enc ?? "");
          const password = decryptSecret(integration.password_enc ?? "");
          if (!login || !password) return "";
          return `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;
        })()
      : (() => {
          const token = decryptSecret(integration.token_enc ?? "");
          if (!token) return "";
          if (token.startsWith("Basic ") || token.startsWith("Bearer ")) return token;
          if (token.includes(":")) return `Basic ${Buffer.from(token).toString("base64")}`;
          return `Bearer ${token}`;
        })();

  if (!authHeader) {
    return NextResponse.json({ error: "Missing MoySklad credentials" }, { status: 400 });
  }

  const res = await fetch(stockUrl, {
    headers: {
      Authorization: authHeader,
      Accept: "application/json;charset=utf-8",
      "Accept-Encoding": "gzip",
    },
    cache: "no-store",
  }).catch(() => null);

  if (!res?.ok) {
    const text = await res?.text().catch(() => "");
    return NextResponse.json({ error: text || "MoySklad error" }, { status: 500 });
  }

  const data = (await res.json().catch(() => null)) as { rows?: StockRow[] } | null;
  const rows = Array.isArray(data?.rows) ? data!.rows! : [];

  const items = rows.map((row) => {
    const href = row.meta?.href ?? null;
    const moyProductId = extractIdFromHref(href);
    const localProduct = moyProductId
      ? (store.products as any[]).find((p: any) => p.moysklad_id === moyProductId) ?? null
      : null;
    const localProductId = localProduct?.id ? Number(localProduct.id) : null;
    const adjustment =
      localProductId ? sumStockAdjustments({ storeId, productId: localProductId }) : 0;

    const base =
      Number(row.freeStock ?? row.quantity ?? row.stock ?? 0) || 0;

    return {
      moysklad_product_id: moyProductId,
      product_id: localProductId,
      title: row.name ?? localProduct?.title_ru ?? "Товар",
      free_stock: base,
      local_adjustment: adjustment,
      final_stock: base + adjustment,
    };
  });

  return NextResponse.json({ items });
}
