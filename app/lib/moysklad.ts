import {
  getBranchById,
  getMoyskladIntegration,
  persistStore,
  store,
  updateMoyskladIntegration,
} from "@/app/lib/data-store";
import { decryptSecret, encryptSecret } from "@/app/lib/secret";

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
  if (!auth) throw new Error("Не задан токен/логин/пароль МойСклад");
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

async function moyskladFetch<T>(pathName: string, init?: RequestInit) {
  const auth = requireAuth();
  const url = pathName.startsWith("http") ? pathName : `${baseUrl()}${pathName}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      "Accept-Encoding": "gzip",
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
      Authorization: auth,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`MoySklad ${response.status}: ${text || response.statusText}`);
  }

  if (response.status === 204) return null as T;
  return (await response.json()) as T;
}

async function fetchAll<T>(pathName: string, params?: Record<string, string>) {
  const limit = 1000;
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

export async function testMoyskladConnection() {
  const auth = authHeader();
  if (!auth) throw new Error("Не задан токен/логин/пароль МойСклад");
  const url = `${baseUrl()}/entity/store?limit=1`;
  const response = await fetch(url, {
    headers: { Authorization: auth, Accept: "application/json" },
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
    .replace(/[^a-z0-9а-яё\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function syncMoyskladCatalog() {
  const integration = getMoyskladIntegration();
  if (!integration.enabled) throw new Error("Интеграция МойСклад выключена");
  requireAuth();

  const [folders, products, stores, priceTypes, stockReport] = await Promise.all([
    fetchAll<any>("/entity/productfolder"),
    fetchAll<any>("/entity/product", { expand: "salePrices.priceType" }),
    fetchAll<any>("/entity/store"),
    listMoyskladPriceTypes(),
    moyskladFetch<any>("/report/stock/bystore/current?stockType=freeStock"),
  ]);

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

  const stockRows = Array.isArray(stockReport?.rows) ? stockReport.rows : [];
  const stockByProduct = new Map<string, number>();
  stockRows.forEach((row: any) => {
    const id = extractId(row?.assortment?.meta);
    if (!id) return;
    const value = Number(row?.stock ?? row?.freeStock ?? row?.quantity ?? 0);
    if (!Number.isFinite(value)) return;
    stockByProduct.set(id, (stockByProduct.get(id) ?? 0) + value);
  });

  const now = nowIso();
  const categories = folders.map((folder: any, index: number) => ({
    id: index + 1,
    name_ru: folder?.name?.toString() ?? "Категория",
    name_uz: folder?.name?.toString() ?? "Kategoriya",
    slug: slugify(folder?.name?.toString() ?? `category-${index + 1}`),
    image_url: null,
    sort_order: index + 1,
    moysklad_id: folder?.id ?? null,
    created_at: now,
    updated_at: now,
  }));

  const categoryById = new Map<string, number>();
  categories.forEach((item) => {
    if (item.moysklad_id) categoryById.set(item.moysklad_id, item.id);
  });

  const productsMapped = products.map((product: any, index: number) => {
    const folderId = extractId(product?.productFolder?.meta);
    const categoryId = folderId ? categoryById.get(folderId) ?? null : null;
    const salePrices = Array.isArray(product?.salePrices) ? product.salePrices : [];
    const matchedPrice =
      (priceTypeId
        ? salePrices.find((price: any) => extractId(price?.priceType?.meta) === priceTypeId)
        : null) ?? salePrices[0];
    const priceValue = Number(matchedPrice?.value ?? 0);
    const price = Number.isFinite(priceValue) ? Math.round(priceValue / 100) : 0;
    const stockValue = Number(stockByProduct.get(product?.id ?? "") ?? 0);
    return {
      id: index + 1,
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
      moysklad_id: product?.id ?? null,
      created_at: now,
      updated_at: now,
    };
  });

  store.categories = categories as any;
  store.products = productsMapped as any;
  store.product_images = [];
  store.portion_options = [];

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
    products: productsMapped.length,
  };
}

export async function syncMoyskladCustomers() {
  const integration = getMoyskladIntegration();
  if (!integration.enabled) throw new Error("Интеграция МойСклад выключена");
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
      name: row?.name?.toString() ?? "Клиент",
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
      name: name || "Покупатель",
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
  if (!organization) throw new Error("Организация в МойСклад не найдена");

  const branch = getBranchById(order.branch_id);
  const storeMeta = branch?.moysklad_store_id ? buildMeta("store", branch.moysklad_store_id) : null;

  const customer = order.customer_id
    ? store.customers.find((item) => item.id === order.customer_id) ?? null
    : null;
  const phone = customer?.phone ?? null;
  const name = customer?.name ?? "Покупатель";

  let counterpartyId = customer?.moysklad_id ?? null;
  if (!counterpartyId) {
    const counterparty = await findOrCreateCounterparty(name, phone);
    counterpartyId = counterparty?.id ?? null;
    if (customer && counterpartyId) {
      customer.moysklad_id = counterpartyId;
      customer.updated_at = nowIso();
    }
  }

  if (!counterpartyId) throw new Error("Контрагент МойСклад не найден");

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
        assortment: buildMeta("product", product.moysklad_id),
      };
    })
    .filter(Boolean);

  if (!positions.length) throw new Error("Нет товаров с привязкой к МойСклад");

  const payload: Record<string, unknown> = {
    name: `Заказ #${order.id}`,
    externalCode: `tomir-order-${order.id}`,
    organization,
    agent: buildMeta("counterparty", counterpartyId),
    positions,
    description: order.comment || undefined,
  };
  if (storeMeta) payload.store = storeMeta;

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
  if (!organization) throw new Error("Организация в МойСклад не найдена");

  const branch = getBranchById(order.branch_id);
  const storeMeta = branch?.moysklad_store_id ? buildMeta("store", branch.moysklad_store_id) : null;

  const customer = order.customer_id
    ? store.customers.find((item) => item.id === order.customer_id) ?? null
    : null;
  const phone = customer?.phone ?? null;
  const name = customer?.name ?? "Покупатель";

  let counterpartyId = customer?.moysklad_id ?? null;
  if (!counterpartyId) {
    const counterparty = await findOrCreateCounterparty(name, phone);
    counterpartyId = counterparty?.id ?? null;
    if (customer && counterpartyId) {
      customer.moysklad_id = counterpartyId;
      customer.updated_at = nowIso();
    }
  }

  if (!counterpartyId) throw new Error("Контрагент МойСклад не найден");

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
        assortment: buildMeta("product", product.moysklad_id),
      };
    })
    .filter(Boolean);

  if (!positions.length) throw new Error("Нет товаров с привязкой к МойСклад");

  const payload: Record<string, unknown> = {
    name: `Продажа #${order.id}`,
    externalCode: `tomir-sale-${order.id}`,
    organization,
    agent: buildMeta("counterparty", counterpartyId),
    positions,
    description: order.comment || undefined,
  };
  if (storeMeta) payload.store = storeMeta;

  const created = await moyskladFetch<any>("/entity/retaildemand", {
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
