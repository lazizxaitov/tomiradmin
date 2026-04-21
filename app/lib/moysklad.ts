import {
  getBranchById,
  getMoyskladIntegration,
  persistStore,
  store,
  updateMoyskladIntegration,
} from "@/app/lib/data-store";
import { decryptSecret, encryptSecret } from "@/app/lib/secret";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

type MoyskladListResponse<T> = {
  meta?: { size?: number; offset?: number; limit?: number };
  rows?: T[];
};

type MoyskladMeta = { href?: string; type?: string; mediaType?: string };

function nowIso() {
  return new Date().toISOString();
}

function baseUrl() {
  const integration = getMoyskladIntegration();
  const url = (integration.base_url || "https://api.moysklad.ru/api/remap/1.2").trim();
  return url.replace(/\/+$/, "");
}

function authHeader() {
  const integration = getMoyskladIntegration();
  if (integration.auth_mode === "basic") {
    const login = decryptSecret(integration.login_enc ?? "");
    const password = decryptSecret(integration.password_enc ?? "");
    if (!login || !password) return "";
    return `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;
  }

  const token = decryptSecret(integration.token_enc ?? "");
  if (!token) return "";
  if (token.startsWith("Basic ") || token.startsWith("Bearer ")) return token;
  if (token.includes(":")) return `Basic ${Buffer.from(token).toString("base64")}`;
  return `Bearer ${token}`;
}

export function hasMoyskladCredentials() {
  return Boolean(authHeader());
}

export function setMoyskladCredentials(input: {
  authMode: "token" | "basic";
  token?: string | null;
  login?: string | null;
  password?: string | null;
}) {
  const integration = getMoyskladIntegration();
  integration.auth_mode = input.authMode;

  if (input.token !== undefined) {
    const value = input.token?.trim() ?? "";
    integration.token_enc = value ? encryptSecret(value) : null;
  }
  if (input.login !== undefined) {
    const value = input.login?.trim() ?? "";
    integration.login_enc = value ? encryptSecret(value) : null;
  }
  if (input.password !== undefined) {
    const value = input.password?.trim() ?? "";
    integration.password_enc = value ? encryptSecret(value) : null;
  }

  void persistStore();
  return integration;
}

function requireAuth() {
  const auth = authHeader();
  if (!auth) throw new Error("РќРµ Р·Р°РґР°РЅ С‚РѕРєРµРЅ/Р»РѕРіРёРЅ/РїР°СЂРѕР»СЊ РњРѕР№РЎРєР»Р°Рґ");
  return auth;
}

function extractId(meta?: MoyskladMeta | null) {
  const href = meta?.href;
  if (!href) return null;
  const parts = href.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

function buildMeta(type: string, id: string) {
  return {
    href: `${baseUrl()}/entity/${type}/${id}`,
    type,
    mediaType: "application/json",
  };
}

function refMeta(type: string, id: string) {
  // MoySklad expects references in the form { meta: { href, type, mediaType } } for most fields.
  return { meta: buildMeta(type, id) };
}

async function moyskladFetch<T>(pathName: string, init?: RequestInit) {
  const auth = requireAuth();
  const url = pathName.startsWith("http") ? pathName : `${baseUrl()}${pathName}`;

  // MoySklad API sometimes closes large responses; undici reports it as "terminated".
  // Retry a few times with small delay to make sync more robust for big accounts.
  const maxAttempts = 3;
  let lastError: unknown = null;
  const timeoutMs = 120_000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(url, {
        ...init,
        signal: init?.signal ?? controller.signal,
        headers: {
          "Accept-Encoding": "gzip",
          Accept: "application/json;charset=utf-8",
          "Content-Type": "application/json;charset=utf-8",
          ...(init?.headers ?? {}),
          Authorization: auth,
        },
        cache: "no-store",
      }).finally(() => clearTimeout(timer));

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`MoySklad ${response.status}: ${text || response.statusText}`);
      }

      if (response.status === 204) return null as T;
      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      const baseMessage = error instanceof Error ? error.message : String(error);
      const cause = (error as any)?.cause;
      const causeCode = typeof cause?.code === "string" ? cause.code : null;
      const causeMessage = typeof cause?.message === "string" ? cause.message : null;
      const diagnostic =
        causeCode || causeMessage ? ` (cause: ${causeCode ?? ""}${causeCode && causeMessage ? " " : ""}${causeMessage ?? ""})` : "";

      const message = `${baseMessage}${diagnostic}`;
      const lower = baseMessage.toLowerCase();
      const retryable =
        lower.includes("terminated") ||
        lower.includes("fetch failed") ||
        lower.includes("etimedout") ||
        String(causeCode ?? "").toLowerCase().includes("etimedout");
      if (!retryable || attempt === maxAttempts) {
        throw new Error(`MoySklad request failed: ${message}`);
      }
      await new Promise((r) => setTimeout(r, 700 * attempt));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("MoySklad request failed");
}

async function fetchAll<T>(pathName: string, params?: Record<string, string>) {
  // Smaller page size avoids timeouts on big accounts.
  const limit = 50;
  let offset = 0;
  let total = 0;
  const rows: T[] = [];

  while (true) {
    const query = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      ...(params ?? {}),
    });
    const response = await moyskladFetch<MoyskladListResponse<T>>(`${pathName}?${query}`);
    const batch = response.rows ?? [];
    rows.push(...batch);
    total = response.meta?.size ?? rows.length;
    offset += response.meta?.limit ?? limit;
    if (rows.length >= total || batch.length === 0) break;
  }

  return rows;
}

async function downloadImageToUploads(downloadHref: string, suggestedName: string) {
  const auth = requireAuth();
  // First request returns 302 with Location. Location can be fetched without auth (short-lived).
  const first = await fetch(downloadHref, {
    headers: { Authorization: auth, Accept: "application/json;charset=utf-8" },
    redirect: "manual",
    cache: "no-store",
  });
  const location = first.headers.get("location")?.trim() || "";
  if (!location) throw new Error("РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ СЃСЃС‹Р»РєСѓ РЅР° РёР·РѕР±СЂР°Р¶РµРЅРёРµ");

  const imgRes = await fetch(location, { cache: "no-store" });
  if (!imgRes.ok) throw new Error(`РќРµ СѓРґР°Р»РѕСЃСЊ СЃРєР°С‡Р°С‚СЊ РёР·РѕР±СЂР°Р¶РµРЅРёРµ (${imgRes.status})`);
  const original = Buffer.from(await imgRes.arrayBuffer());
  const buffer = await toSquareJpegIfPossible(original).catch(() => original);

  const safeNameBase = suggestedName.replace(/[^a-z0-9_.-]/gi, "_").slice(0, 120) || "image";
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "moysklad");
  mkdirSync(uploadsDir, { recursive: true });
  const fileName = `${Date.now()}-${safeNameBase.replace(/\.(png|jpe?g|webp|gif)$/i, "")}.jpg`;
  const fullPath = path.join(uploadsDir, fileName);
  writeFileSync(fullPath, buffer);
  return `/uploads/moysklad/${fileName}`;
}

async function toSquareJpegIfPossible(input: Buffer) {
  // Optional dependency. If not installed, keep original bytes.
  // Making square images avoids "vertical squeeze" when the mobile UI uses fill/forced aspect ratio.
  const mod = (await import("jimp").catch(() => null)) as any;
  const Jimp = mod?.Jimp ?? mod;
  if (!Jimp?.read) return input;

  const image = await Jimp.read(input);
  const size = Math.min(image.bitmap.width, image.bitmap.height);
  // Center-crop to square, then upscale/downscale to a predictable size.
  const x = Math.max(0, Math.floor((image.bitmap.width - size) / 2));
  const y = Math.max(0, Math.floor((image.bitmap.height - size) / 2));
  image.crop(x, y, size, size);
  image.resize(1200, 1200);
  image.quality(82);
  return Buffer.from(await image.getBufferAsync("image/jpeg"));
}

export async function testMoyskladConnection() {
  const auth = authHeader();
  if (!auth) throw new Error("РќРµ Р·Р°РґР°РЅ С‚РѕРєРµРЅ/Р»РѕРіРёРЅ/РїР°СЂРѕР»СЊ РњРѕР№РЎРєР»Р°Рґ");
  const url = `${baseUrl()}/entity/store?limit=1`;
  const response = await fetch(url, {
    headers: { Authorization: auth, Accept: "application/json;charset=utf-8" },
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`MoySklad ${response.status}: ${text || response.statusText}`);
  }
  return true;
}

export async function listMoyskladStores() {
  return fetchAll<{ id?: string; name?: string }>("/entity/store");
}

export async function listMoyskladPriceTypes() {
  return moyskladFetch<Array<{ id?: string; name?: string }>>("/context/companysettings/pricetype");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9Р°-СЏС‘\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function syncMoyskladCatalog(options?: {
  forceImages?: boolean;
  onProgress?: (progress: { stage: string; processed: number; total: number | null }) => void;
}) {
  const integration = getMoyskladIntegration();
  if (!integration.enabled) throw new Error("РРЅС‚РµРіСЂР°С†РёСЏ РњРѕР№РЎРєР»Р°Рґ РІС‹РєР»СЋС‡РµРЅР°");
  requireAuth();

  const existingCategoriesByMoyId = new Map<string, any>();
  store.categories.forEach((category: any) => {
    if (category?.moysklad_id) existingCategoriesByMoyId.set(String(category.moysklad_id), category);
  });

  const existingProductsByMoyId = new Map<string, any>();
  store.products.forEach((product: any) => {
    if (product?.moysklad_id) existingProductsByMoyId.set(String(product.moysklad_id), product);
  });

  const existingImagesByProductId = new Map<number, any[]>();
  store.product_images.forEach((img: any) => {
    if (!existingImagesByProductId.has(img.product_id)) existingImagesByProductId.set(img.product_id, []);
    existingImagesByProductId.get(img.product_id)!.push(img);
  });

  // Avoid parallel heavy requests; large accounts may hit "terminated" otherwise.
  const folders = await fetchAll<any>("/entity/productfolder");
  const stores = await fetchAll<any>("/entity/store");
  const priceTypes = await listMoyskladPriceTypes();

  let priceTypeId = integration.price_type_id;
  if (!priceTypeId && integration.price_type_name) {
    const found = priceTypes.find((item) => item.name === integration.price_type_name);
    if (found?.id) priceTypeId = found.id;
  }
  if (!priceTypeId && priceTypes.length > 0) {
    priceTypeId = priceTypes[0]?.id ?? null;
  }
  if (priceTypeId && priceTypeId !== integration.price_type_id) {
    integration.price_type_id = priceTypeId;
    integration.price_type_name =
      priceTypes.find((item) => item.id === priceTypeId)?.name ?? integration.price_type_name;
  }

  // Stock is synced via the "РћСЃС‚Р°С‚РєРё" window per store. Global stock report is too heavy for large accounts.
  const stockByProduct = new Map<string, number>();

  const now = nowIso();
  let nextCategoryId =
    store.categories.reduce((max: number, item: any) => Math.max(max, Number(item?.id ?? 0)), 0) + 1;

  const categories = folders.map((folder: any, index: number) => {
    const moyId = folder?.id ? String(folder.id) : "";
    const existing = moyId ? existingCategoriesByMoyId.get(moyId) : null;
    const id = existing?.id ? Number(existing.id) : nextCategoryId++;
    const name = folder?.name?.toString() ?? existing?.name_ru ?? "РљР°С‚РµРіРѕСЂРёСЏ";
    return {
      id,
      name_ru: name,
      name_uz: folder?.name?.toString() ?? existing?.name_uz ?? name,
      slug: slugify(name || `category-${id}`),
      image_url: existing?.image_url ?? null,
      sort_order: index + 1,
      moysklad_id: folder?.id ?? existing?.moysklad_id ?? null,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
  });

  const categoryById = new Map<string, number>();
  categories.forEach((item) => {
    if (item.moysklad_id) categoryById.set(item.moysklad_id, item.id);
  });

  let nextProductId =
    store.products.reduce((max: number, item: any) => Math.max(max, Number(item?.id ?? 0)), 0) + 1;

  store.categories = categories as any;

  const seenMoyProductIds = new Set<string>();
  const mergedByMoyId = new Map<string, any>();

  const nonMoyProducts = (store.products as any[]).filter((p: any) => !p?.moysklad_id);

  // Some fields (like productFolder) are not filterable in MoySklad. Instead, sync in pages and persist after each page.
  let processed = 0;
  for await (const page of fetchPages<any>("/entity/product")) {
    for (const product of page.rows) {
      const moyId = product?.id ? String(product.id) : "";
      if (!moyId) continue;
      seenMoyProductIds.add(moyId);
      processed += 1;

      const existing = mergedByMoyId.get(moyId) ?? existingProductsByMoyId.get(moyId) ?? null;
      const id = existing?.id ? Number(existing.id) : nextProductId++;
      const folderId = extractId(product?.productFolder?.meta);
      const categoryId = folderId ? categoryById.get(folderId) ?? null : null;
      const salePrices = Array.isArray(product?.salePrices) ? product.salePrices : [];
      const matchedPrice =
        (priceTypeId
          ? salePrices.find((price: any) => extractId(price?.priceType?.meta) === priceTypeId)
          : null) ?? salePrices[0];
      const priceValue = Number(matchedPrice?.value ?? 0);
      const price = Number.isFinite(priceValue) ? Math.round(priceValue / 100) : 0;
      const stockValue = stockByProduct.has(product?.id ?? "")
        ? Number(stockByProduct.get(product?.id ?? "") ?? 0)
        : Number(existing?.stock ?? 0);

      mergedByMoyId.set(moyId, {
        id,
        category_id: categoryId,
        title_ru: product?.name?.toString() ?? "Товар",
        title_uz: product?.name?.toString() ?? "Mahsulot",
        description_title_ru: null,
        description_title_uz: null,
        description_text_ru: product?.description?.toString() ?? null,
        description_text_uz: product?.description?.toString() ?? null,
        price,
        price_text_ru: null,
        price_text_uz: null,
        pricing_mode: "quantity" as const,
        stock: Number.isFinite(stockValue) ? Math.round(stockValue) : 0,
        is_active: product?.archived ? 0 : 1,
        is_top: 0,
        is_promo: 0,
        old_price: null,
        promo_price: null,
        moysklad_id: product?.id ?? existing?.moysklad_id ?? null,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      });
    }

    store.products = [...nonMoyProducts, ...Array.from(mergedByMoyId.values())] as any;
    await persistStore();
    options?.onProgress?.({
      stage: "products",
      processed,
      total: Number.isFinite(page.total) ? page.total : null,
    });
  }

  // Drop MoySklad products that no longer exist.
  store.products = (store.products as any[]).filter((p: any) => {
    const moyId = p?.moysklad_id ? String(p.moysklad_id) : "";
    if (!moyId) return true;
    return seenMoyProductIds.has(moyId);
  }) as any;

  // Preserve local product images for products that still exist (ids are stable by moysklad_id).
  const validProductIds = new Set<number>((store.products as any[]).map((p: any) => Number(p.id)));
  store.product_images = store.product_images.filter((img: any) => validProductIds.has(Number(img.product_id)));
  store.portion_options = [];
  const forceImages = Boolean(options?.forceImages);

  const imageTargets = (store.products as any[]).filter((product: any) => {
    const productId = Number(product?.id ?? 0);
    const moyId = product?.moysklad_id ? String(product.moysklad_id) : "";
    if (!productId || !moyId) return false;
    const current = store.product_images.filter((img: any) => Number(img.product_id) === productId);
    const hasAny = current.length > 0;
    const hasMoysklad = current.some((img: any) => String(img.url ?? "").startsWith("/uploads/moysklad/"));
    if (hasAny && !(forceImages && hasMoysklad)) return false;
    return true;
  });

  let imagesProcessed = 0;
  // Pull product images from MoySklad:
  // - if product has no local images yet
  // - or if forced (re-download + crop), but only for images previously downloaded from MoySklad.
  // We download images into /public/uploads so the mobile app can display them reliably.
  for (const product of imageTargets) {
    const productId = Number(product.id);
    const moyId = product?.moysklad_id ? String(product.moysklad_id) : "";
    if (!moyId) continue;
    const current = store.product_images.filter((img: any) => Number(img.product_id) === productId);
    const hasAny = current.length > 0;
    const hasMoysklad = current.some((img: any) => String(img.url ?? "").startsWith("/uploads/moysklad/"));
    if (hasAny && !(forceImages && hasMoysklad)) continue;
    if (forceImages && hasMoysklad) {
      store.product_images = store.product_images.filter(
        (img: any) =>
          !(Number(img.product_id) === productId && String(img.url ?? "").startsWith("/uploads/moysklad/")),
      );
    }

    try {
      const images = await moyskladFetch<MoyskladListResponse<any>>(
        `/entity/product/${encodeURIComponent(moyId)}/images?limit=1`,
      );
      const row = images.rows?.[0];
      const downloadHref = row?.meta?.downloadHref?.toString?.() ?? "";
      const filename = row?.filename?.toString?.() ?? "image.png";
      if (!downloadHref) continue;
      const url = await downloadImageToUploads(downloadHref, filename);
      const nextImgId =
        store.product_images.reduce((max: number, item: any) => Math.max(max, Number(item?.id ?? 0)), 0) + 1;
      store.product_images.push({
        id: nextImgId,
        product_id: productId,
        url,
        sort_order: 0,
      });
    } catch {
      // Ignore image errors; catalog sync should still work.
    }

    imagesProcessed += 1;
    if (forceImages) {
      options?.onProgress?.({
        stage: "images",
        processed: imagesProcessed,
        total: imageTargets.length,
      });
    }
  }

  // Keep existing branch list, only attempt to auto-map by name if empty.
  store.branches.forEach((branch) => {
    if (branch.moysklad_store_id) return;
    const matched = stores.find((item: any) =>
      branch.title?.toLowerCase().includes((item?.name ?? "").toLowerCase()),
    );
    if (matched?.id) branch.moysklad_store_id = matched.id;
  });

  updateMoyskladIntegration({
    lastSyncAt: now,
    lastSyncError: null,
  });

  await persistStore();

  return {
    categories: categories.length,
    products: (store.products as any[]).filter((p: any) => p?.moysklad_id).length,
  };
}

async function* fetchPages<T>(pathName: string, params?: Record<string, string>) {
  // Keep pages small for stability on big accounts.
  const limit = 50;
  let offset = 0;
  let total = 0;

  while (true) {
    const query = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      ...(params ?? {}),
    });
    const response = await moyskladFetch<MoyskladListResponse<T>>(`${pathName}?${query}`);
    const batch = response.rows ?? [];

    total = response.meta?.size ?? (offset + batch.length);
    const nextOffset = offset + (response.meta?.limit ?? limit);

    yield { rows: batch, offset, total, limit };

    offset = nextOffset;
    if (offset >= total || batch.length === 0) break;
  }
}

export async function syncMoyskladCustomers() {
  const integration = getMoyskladIntegration();
  if (!integration.enabled) throw new Error("РРЅС‚РµРіСЂР°С†РёСЏ РњРѕР№РЎРєР»Р°Рґ РІС‹РєР»СЋС‡РµРЅР°");
  requireAuth();

  const counterparties = await fetchAll<any>("/entity/counterparty");
  const now = nowIso();
  let created = 0;
  let updated = 0;

  counterparties.forEach((row: any) => {
    const phoneRaw = row?.phone?.toString() ?? "";
    const phone = phoneRaw.replace(/\s+/g, "");
    if (!phone) return;

    const existing = store.customers.find((item) => item.phone === phone);
    if (existing) {
      existing.name = row?.name?.toString() ?? existing.name;
      existing.moysklad_id = row?.id ?? existing.moysklad_id ?? null;
      existing.updated_at = now;
      updated += 1;
      return;
    }

    const id = store.customers.reduce((max, item) => Math.max(max, item.id), 0) + 1;
    store.customers.push({
      id,
      name: row?.name?.toString() ?? "РљР»РёРµРЅС‚",
      phone,
      password: null,
      bonus_balance: 0,
      moysklad_id: row?.id ?? null,
      created_at: now,
      updated_at: now,
    });
    created += 1;
  });

  updateMoyskladIntegration({
    lastSyncAt: now,
    lastSyncError: null,
  });

  await persistStore();
  return { created, updated };
}

async function getOrganizationMeta() {
  const response = await moyskladFetch<MoyskladListResponse<any>>("/entity/organization?limit=1");
  const org = response.rows?.[0];
  if (!org?.id) return null;
  return buildMeta("organization", org.id);
}

async function findOrCreateCounterparty(name: string, phone: string | null) {
  if (phone) {
    const search = await moyskladFetch<MoyskladListResponse<any>>(
      `/entity/counterparty?${new URLSearchParams({ search: phone, limit: "1" })}`,
    );
    const found = search.rows?.[0];
    if (found?.id) return found;
  }

  return moyskladFetch<any>("/entity/counterparty", {
    method: "POST",
    body: JSON.stringify({
      name: name || "РџРѕРєСѓРїР°С‚РµР»СЊ",
      phone: phone || undefined,
    }),
  });
}

export async function sendOrderToMoysklad(orderId: number) {
  const integration = getMoyskladIntegration();
  if (!integration.enabled) return { ok: false, skipped: true };

  const order = store.orders.find((item) => item.id === orderId);
  if (!order) return { ok: false, error: "Order not found" };
  if (order.moysklad_customerorder_id) return { ok: true, skipped: true };

  const organization = await getOrganizationMeta();
  if (!organization) throw new Error("РћСЂРіР°РЅРёР·Р°С†РёСЏ РІ РњРѕР№РЎРєР»Р°Рґ РЅРµ РЅР°Р№РґРµРЅР°");

  const branch = getBranchById(order.branch_id);
  const storeMeta = branch?.moysklad_store_id ? buildMeta("store", branch.moysklad_store_id) : null;
  if (!storeMeta) {
    // We must know which MoySklad store to decrement for a given branch.
    throw new Error("РЈ С„РёР»РёР°Р»Р° РЅРµ РІС‹Р±СЂР°РЅ СЃРєР»Р°Рґ РњРѕР№РЎРєР»Р°Рґ");
  }

  const customer = order.customer_id
    ? store.customers.find((item) => item.id === order.customer_id) ?? null
    : null;
  const phone = customer?.phone ?? null;
  const name = customer?.name ?? "РџРѕРєСѓРїР°С‚РµР»СЊ";

  let counterpartyId = customer?.moysklad_id ?? null;
  if (!counterpartyId) {
    const counterparty = await findOrCreateCounterparty(name, phone);
    counterpartyId = counterparty?.id ?? null;
    if (customer && counterpartyId) {
      customer.moysklad_id = counterpartyId;
      customer.updated_at = nowIso();
    }
  }

  if (!counterpartyId) throw new Error("РљРѕРЅС‚СЂР°РіРµРЅС‚ РњРѕР№РЎРєР»Р°Рґ РЅРµ РЅР°Р№РґРµРЅ");

  const items = store.order_items.filter((item) => item.order_id === order.id);
  const positions = items
    .map((item) => {
      const product = item.product_id
        ? store.products.find((row) => row.id === item.product_id)
        : null;
      if (!product?.moysklad_id) return null;
      return {
        quantity: item.quantity,
        price: Math.round(item.price * 100),
        assortment: refMeta("product", product.moysklad_id),
      };
    })
    .filter(Boolean);

  if (!positions.length) throw new Error("РќРµС‚ С‚РѕРІР°СЂРѕРІ СЃ РїСЂРёРІСЏР·РєРѕР№ Рє РњРѕР№РЎРєР»Р°Рґ");

  const payload: Record<string, unknown> = {
    name: `Р—Р°РєР°Р· #${order.id}`,
    externalCode: `tomir-order-${order.id}`,
    organization: { meta: organization },
    agent: refMeta("counterparty", counterpartyId),
    positions,
    // Only "applicable" documents affect stock in MoySklad.
    applicable: true,
    description: order.comment || undefined,
  };
  if (storeMeta?.href) payload.store = { meta: storeMeta };

  const created = await moyskladFetch<any>("/entity/customerorder", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  order.moysklad_customerorder_id = created?.id ?? null;
  order.moysklad_last_error = null;
  order.moysklad_synced_at = nowIso();
  await persistStore();

  return { ok: true, id: created?.id ?? null };
}

export async function sendRetailDemandToMoysklad(orderId: number) {
  const integration = getMoyskladIntegration();
  if (!integration.enabled) return { ok: false, skipped: true };

  const order = store.orders.find((item) => item.id === orderId);
  if (!order) return { ok: false, error: "Order not found" };
  if (order.moysklad_retaildemand_id) return { ok: true, skipped: true };

  const organization = await getOrganizationMeta();
  if (!organization) throw new Error("РћСЂРіР°РЅРёР·Р°С†РёСЏ РІ РњРѕР№РЎРєР»Р°Рґ РЅРµ РЅР°Р№РґРµРЅР°");

  const branch = getBranchById(order.branch_id);
  const storeMeta = branch?.moysklad_store_id ? buildMeta("store", branch.moysklad_store_id) : null;
  if (!storeMeta) {
    throw new Error("РЈ С„РёР»РёР°Р»Р° РЅРµ РІС‹Р±СЂР°РЅ СЃРєР»Р°Рґ РњРѕР№РЎРєР»Р°Рґ");
  }

  const customer = order.customer_id
    ? store.customers.find((item) => item.id === order.customer_id) ?? null
    : null;
  const phone = customer?.phone ?? null;
  const name = customer?.name ?? "РџРѕРєСѓРїР°С‚РµР»СЊ";

  let counterpartyId = customer?.moysklad_id ?? null;
  if (!counterpartyId) {
    const counterparty = await findOrCreateCounterparty(name, phone);
    counterpartyId = counterparty?.id ?? null;
    if (customer && counterpartyId) {
      customer.moysklad_id = counterpartyId;
      customer.updated_at = nowIso();
    }
  }

  if (!counterpartyId) throw new Error("РљРѕРЅС‚СЂР°РіРµРЅС‚ РњРѕР№РЎРєР»Р°Рґ РЅРµ РЅР°Р№РґРµРЅ");

  const items = store.order_items.filter((item) => item.order_id === order.id);
  const positions = items
    .map((item) => {
      const product = item.product_id
        ? store.products.find((row) => row.id === item.product_id)
        : null;
      if (!product?.moysklad_id) return null;
      return {
        quantity: item.quantity,
        price: Math.round(item.price * 100),
        assortment: refMeta("product", product.moysklad_id),
      };
    })
    .filter(Boolean);

  if (!positions.length) throw new Error("РќРµС‚ С‚РѕРІР°СЂРѕРІ СЃ РїСЂРёРІСЏР·РєРѕР№ Рє РњРѕР№РЎРєР»Р°Рґ");

  const payload: Record<string, unknown> = {
    name: `РџСЂРѕРґР°Р¶Р° #${order.id}`,
    externalCode: `tomir-sale-${order.id}`,
    organization: { meta: organization },
    agent: refMeta("counterparty", counterpartyId),
    positions,
    // Only "applicable" documents affect stock in MoySklad.
    applicable: true,
    description: order.comment || undefined,
  };
  if (storeMeta?.href) payload.store = { meta: storeMeta };

  const created = await moyskladFetch<any>("/entity/demand", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  order.moysklad_retaildemand_id = created?.id ?? null;
  order.moysklad_last_error = null;
  order.moysklad_synced_at = nowIso();
  await persistStore();

  return { ok: true, id: created?.id ?? null };
}

export async function attachMoyskladError(orderId: number, error: unknown) {
  const order = store.orders.find((item) => item.id === orderId);
  if (!order) return;
  order.moysklad_last_error = error instanceof Error ? error.message : String(error);
  order.moysklad_synced_at = nowIso();
  await persistStore();
}
