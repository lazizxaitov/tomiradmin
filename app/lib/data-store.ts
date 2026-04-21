import { mkdirSync } from 'node:fs';
import path from 'node:path';

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export type Category = {
  id: number;
  name_ru: string;
  name_uz: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
  moysklad_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: number;
  category_id: number | null;
  title_ru: string;
  title_uz: string;
  description_title_ru: string | null;
  description_title_uz: string | null;
  description_text_ru: string | null;
  description_text_uz: string | null;
  price: number;
  price_text_ru: string | null;
  price_text_uz: string | null;
  pricing_mode: "quantity" | "portion";
  stock: number;
  is_active: 0 | 1;
  is_top: 0 | 1;
  is_promo: 0 | 1;
  old_price: number | null;
  promo_price: number | null;
  moysklad_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductImage = {
  id: number;
  product_id: number;
  url: string;
  sort_order: number;
};

export type PortionOption = {
  id: number;
  product_id: number;
  label_ru: string;
  label_uz: string;
  price: number;
};

export type Banner = {
  id: number;
  title_ru: string;
  title_uz: string;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  is_active: 0 | 1;
  created_at: string;
  updated_at: string;
};

export type Settings = {
  id: 1;
  cafe_name: string;
  phone: string;
  address: string;
  work_hours: string;
  delivery_fee: number;
  min_order: number;
  currency: string;
  bonus_percent: number;
  bonus_redeem_amount: number;
  instagram: string;
  telegram: string;
  updated_at: string;
};

export type Customer = {
  id: number;
  name: string;
  phone: string | null;
  password: string | null;
  bonus_balance: number;
  moysklad_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerAddress = {
  id: number;
  customer_id: number;
  label: string | null;
  address_line: string;
  comment: string | null;
  lat: number | null;
  lng: number | null;
  is_default: 0 | 1;
  created_at: string;
  updated_at: string;
};

export type Branch = {
  id: number;
  title: string;
  address: string;
  phone: string | null;
  work_hours: string | null;
  lat: number | null;
  lng: number | null;
  is_active: 0 | 1;
  moysklad_store_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type Courier = {
  id: number;
  branch_id: number;
  name: string;
  phone: string | null;
  car_number: string | null;
  comment: string | null;
  is_active: 0 | 1;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: number;
  branch_id: number;
  customer_id: number | null;
  customer_address_id: number | null;
  total_amount: number;
  status: "paid" | "accepted" | "in_delivery" | "completed" | "canceled";
  sent_to_branch_at?: string | null;
  comment: string | null;
  bonus_used: number;
  bonus_earned: number;
  courier_id: number | null;
  outsource_provider?: "yandex" | null;
  payment_method: "cash" | "card" | null;
  accepted_at: string | null;
  in_delivery_at: string | null;
  completed_at: string | null;
  canceled_at: string | null;
  cancel_reason: string | null;
  moysklad_customerorder_id?: string | null;
  moysklad_retaildemand_id?: string | null;
  moysklad_last_error?: string | null;
  moysklad_synced_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: number;
  order_id: number;
  product_id: number | null;
  title_ru: string;
  title_uz: string;
  price: number;
  quantity: number;
  total: number;
};

export type CashierAccount = {
  id: number;
  username: string;
  password: string;
  branch_id: number;
  display_name: string;
  is_active: 0 | 1;
  created_at: string;
  updated_at: string;
};

type Store = {
  settings: Settings;
  categories: Category[];
  products: Product[];
  product_images: ProductImage[];
  portion_options: PortionOption[];
  banners: Banner[];
  customers: Customer[];
  customer_addresses: CustomerAddress[];
  branches: Branch[];
  couriers: Courier[];
  cashier_accounts: CashierAccount[];
  orders: Order[];
  order_items: OrderItem[];
  stock_adjustments?: Array<{
    id: number;
    branch_id: number;
    product_id: number;
    delta: number; // negative for sold, positive for restock
    created_at: string;
  }>;
  integrations?: {
    moysklad: {
      enabled: boolean;
      base_url: string;
      auth_mode: "token" | "basic";
      token_enc: string | null;
      login_enc: string | null;
      password_enc: string | null;
      price_type_id: string | null;
      price_type_name: string | null;
      last_sync_at: string | null;
      last_sync_error: string | null;
    };
  };
};

function getDbPath() {
  const fromEnv = process.env.SQLITE_DB_PATH?.trim();
  if (fromEnv) return fromEnv;
  return path.join(process.cwd(), "data", "tomir.db");
}

export const SQLITE_DB_PATH = getDbPath();

function nowIso() {
  return new Date().toISOString();
}

function parseCoordinate(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeAddressLine(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,]/g, "")
    .replace(/ё/g, "е");
}

function normalizePhone(phone: string | null | undefined) {
  const trimmed = phone?.toString().trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("+998")) return trimmed;
  return `+998${trimmed.replace(/^\+?998/, "")}`;
}

const seededAt = nowIso();

const categoriesSeed: Category[] = [
  {
    id: 1,
    name_ru: "Химия для дома",
    name_uz: "Uy uchun kimyo",
    slug: "himiya-dlya-doma",
    image_url: "https://picsum.photos/seed/tomir-cat-1/600/600",
    sort_order: 1,
    moysklad_id: null,
    created_at: seededAt,
    updated_at: seededAt,
  },
  {
    id: 2,
    name_ru: "Посуда для кухни",
    name_uz: "Oshxona idishlari",
    slug: "posuda-dlya-kuhni",
    image_url: "https://picsum.photos/seed/tomir-cat-2/600/600",
    sort_order: 2,
    moysklad_id: null,
    created_at: seededAt,
    updated_at: seededAt,
  },
  {
    id: 3,
    name_ru: "Товары для детей",
    name_uz: "Bolalar mahsulotlari",
    slug: "tovary-dlya-detej",
    image_url: "https://picsum.photos/seed/tomir-cat-3/600/600",
    sort_order: 3,
    moysklad_id: null,
    created_at: seededAt,
    updated_at: seededAt,
  },
  {
    id: 4,
    name_ru: "Товары для дома",
    name_uz: "Uy mahsulotlari",
    slug: "tovary-dlya-doma",
    image_url: "https://picsum.photos/seed/tomir-cat-4/600/600",
    sort_order: 4,
    moysklad_id: null,
    created_at: seededAt,
    updated_at: seededAt,
  },
];

const productsSeed: Product[] = [
  {
    id: 1,
    category_id: 2,
    title_ru: "Шоколадница",
    title_uz: "Shokolad idishi",
    description_title_ru: null,
    description_title_uz: null,
    description_text_ru: null,
    description_text_uz: null,
    price: 45000,
    price_text_ru: null,
    price_text_uz: null,
    pricing_mode: "quantity",
    stock: 24,
    is_active: 1,
    is_top: 1,
    is_promo: 0,
    old_price: null,
    promo_price: null,
    moysklad_id: null,
    created_at: seededAt,
    updated_at: seededAt,
  },
  {
    id: 2,
    category_id: 1,
    title_ru: "Гель для стирки",
    title_uz: "Kir yuvish geli",
    description_title_ru: null,
    description_title_uz: null,
    description_text_ru: null,
    description_text_uz: null,
    price: 55000,
    price_text_ru: null,
    price_text_uz: null,
    pricing_mode: "quantity",
    stock: 14,
    is_active: 1,
    is_top: 0,
    is_promo: 1,
    old_price: 55000,
    promo_price: 49500,
    moysklad_id: null,
    created_at: seededAt,
    updated_at: seededAt,
  },
  {
    id: 3,
    category_id: 3,
    title_ru: "Копилка для детей",
    title_uz: "Bolalar jamgarmasi",
    description_title_ru: null,
    description_title_uz: null,
    description_text_ru: null,
    description_text_uz: null,
    price: 35000,
    price_text_ru: null,
    price_text_uz: null,
    pricing_mode: "quantity",
    stock: 41,
    is_active: 1,
    is_top: 1,
    is_promo: 0,
    old_price: null,
    promo_price: null,
    moysklad_id: null,
    created_at: seededAt,
    updated_at: seededAt,
  },
  {
    id: 4,
    category_id: 2,
    title_ru: "Блинница",
    title_uz: "Blinchik tova",
    description_title_ru: null,
    description_title_uz: null,
    description_text_ru: null,
    description_text_uz: null,
    price: 45000,
    price_text_ru: null,
    price_text_uz: null,
    pricing_mode: "quantity",
    stock: 8,
    is_active: 0,
    is_top: 0,
    is_promo: 0,
    old_price: null,
    promo_price: null,
    moysklad_id: null,
    created_at: seededAt,
    updated_at: seededAt,
  },
];

const productImagesSeed: ProductImage[] = [
  { id: 1, product_id: 1, url: "https://picsum.photos/seed/tomir-prod-1/800/800", sort_order: 0 },
  { id: 2, product_id: 2, url: "https://picsum.photos/seed/tomir-prod-2/800/800", sort_order: 0 },
  { id: 3, product_id: 3, url: "https://picsum.photos/seed/tomir-prod-3/800/800", sort_order: 0 },
  { id: 4, product_id: 4, url: "https://picsum.photos/seed/tomir-prod-4/800/800", sort_order: 0 },
];

const portionOptionsSeed: PortionOption[] = [
  { id: 1, product_id: 1, label_ru: "Малый", label_uz: "Kichik", price: 30000 },
  { id: 2, product_id: 1, label_ru: "Большой", label_uz: "Katta", price: 45000 },
];

const bannersSeed: Banner[] = [
  {
    id: 1,
    title_ru: "Скидки недели",
    title_uz: "Haftalik chegirmalar",
    image_url: "https://picsum.photos/seed/tomir-banner-1/1600/900",
    link_url: null,
    sort_order: 1,
    is_active: 1,
    created_at: seededAt,
    updated_at: seededAt,
  },
  {
    id: 2,
    title_ru: "Товары для дома",
    title_uz: "Uy mahsulotlari",
    image_url: "https://picsum.photos/seed/tomir-banner-2/1600/900",
    link_url: null,
    sort_order: 2,
    is_active: 1,
    created_at: seededAt,
    updated_at: seededAt,
  },
  {
    id: 3,
    title_ru: "Новая коллекция",
    title_uz: "Yangi kolleksiya",
    image_url: "https://picsum.photos/seed/tomir-banner-3/1600/900",
    link_url: null,
    sort_order: 3,
    is_active: 0,
    created_at: seededAt,
    updated_at: seededAt,
  },
];

const settingsSeed: Settings = {
  id: 1,
  cafe_name: "Tomir",
  phone: "+998900000000",
  address: "Ташкент",
  work_hours: "09:00-23:00",
  delivery_fee: 0,
  min_order: 0,
  currency: "сум",
  bonus_percent: 0,
  bonus_redeem_amount: 25000,
  instagram: "",
  telegram: "",
  updated_at: seededAt,
};

const customersSeed: Customer[] = [];

const customerAddressesSeed: CustomerAddress[] = [
  {
    id: 1,
    customer_id: 1,
    label: "Дом",
    address_line: "Ташкент, Юнусабад 12, дом 24",
    comment: null,
    lat: null,
    lng: null,
    is_default: 1,
    created_at: seededAt,
    updated_at: seededAt,
  },
  {
    id: 2,
    customer_id: 2,
    label: "Офис",
    address_line: "Ташкент, Чиланзар 3, дом 17",
    comment: null,
    lat: null,
    lng: null,
    is_default: 1,
    created_at: seededAt,
    updated_at: seededAt,
  },
];

const branchesSeed: Branch[] = [
  {
    id: 1,
    title: "Tomir Yunusabad",
    address: "Юнусабад-12, дом 24",
    phone: "+998712233445",
    work_hours: "09:00-23:00",
    lat: 41.36,
    lng: 69.29,
    is_active: 1,
    moysklad_store_id: null,
    created_at: seededAt,
    updated_at: seededAt,
  },
  {
    id: 2,
    title: "Tomir Chilanzar",
    address: "Чиланзар-3, дом 17",
    phone: "+998712233446",
    work_hours: "09:00-23:00",
    lat: 41.28,
    lng: 69.2,
    is_active: 1,
    moysklad_store_id: null,
    created_at: seededAt,
    updated_at: seededAt,
  },
  {
    id: 3,
    title: "Tomir Yashnabad",
    address: "Яшнабад, улица Паркент, 51",
    phone: "+998712233447",
    work_hours: "09:00-23:00",
    lat: 41.31,
    lng: 69.36,
    is_active: 1,
    moysklad_store_id: null,
    created_at: seededAt,
    updated_at: seededAt,
  },
];

const couriersSeed: Courier[] = [
  {
    id: 1,
    branch_id: 1,
    name: "Дилшод",
    phone: "+998901110011",
    car_number: "01A123BC",
    comment: null,
    is_active: 1,
    created_at: seededAt,
    updated_at: seededAt,
  },
  {
    id: 2,
    branch_id: 2,
    name: "Жасур",
    phone: "+998935550099",
    car_number: "01B777AA",
    comment: null,
    is_active: 1,
    created_at: seededAt,
    updated_at: seededAt,
  },
  {
    id: 3,
    branch_id: 3,
    name: "Алишер",
    phone: "+998901234999",
    car_number: "01C111DD",
    comment: null,
    is_active: 1,
    created_at: seededAt,
    updated_at: seededAt,
  },
];

const cashierAccountsSeed: CashierAccount[] = [];

const ordersSeed: Order[] = [
  {
    id: 1,
    branch_id: 1,
    customer_id: 1,
    customer_address_id: 1,
    total_amount: 120000,
    status: "paid",
    sent_to_branch_at: null,
    comment: "Позвоните за 10 минут",
    bonus_used: 0,
    bonus_earned: 0,
    courier_id: null,
    outsource_provider: null,
    payment_method: "cash",
    accepted_at: null,
    in_delivery_at: null,
    completed_at: null,
    canceled_at: null,
    cancel_reason: null,
    moysklad_customerorder_id: null,
    moysklad_retaildemand_id: null,
    moysklad_last_error: null,
    moysklad_synced_at: null,
    created_at: seededAt,
    updated_at: seededAt,
  },
  {
    id: 2,
    branch_id: 2,
    customer_id: 2,
    customer_address_id: 2,
    total_amount: 85000,
    status: "accepted",
    sent_to_branch_at: null,
    comment: null,
    bonus_used: 0,
    bonus_earned: 0,
    courier_id: 1,
    outsource_provider: null,
    payment_method: "card",
    accepted_at: seededAt,
    in_delivery_at: null,
    completed_at: null,
    canceled_at: null,
    cancel_reason: null,
    moysklad_customerorder_id: null,
    moysklad_retaildemand_id: null,
    moysklad_last_error: null,
    moysklad_synced_at: null,
    created_at: seededAt,
    updated_at: seededAt,
  },
];

const orderItemsSeed: OrderItem[] = [
  {
    id: 1,
    order_id: 1,
    product_id: 1,
    title_ru: "Шоколадница",
    title_uz: "Shokolad idishi",
    price: 45000,
    quantity: 2,
    total: 90000,
  },
  {
    id: 2,
    order_id: 1,
    product_id: 2,
    title_ru: "Гель для стирки",
    title_uz: "Kir yuvish geli",
    price: 30000,
    quantity: 1,
    total: 30000,
  },
  {
    id: 3,
    order_id: 2,
    product_id: 3,
    title_ru: "Копилка для детей",
    title_uz: "Bolalar jamgarmasi",
    price: 35000,
    quantity: 1,
    total: 35000,
  },
  {
    id: 4,
    order_id: 2,
    product_id: 2,
    title_ru: "Гель для стирки",
    title_uz: "Kir yuvish geli",
    price: 50000,
    quantity: 1,
    total: 50000,
  },
];

const globalStore = globalThis as typeof globalThis & {
  tomirStore?: Store;
  tomirDbPromise?: ReturnType<typeof open>;
};

const seededStore: Store = {
  settings: structuredClone(settingsSeed),
  categories: structuredClone(categoriesSeed),
  products: structuredClone(productsSeed),
  product_images: structuredClone(productImagesSeed),
  portion_options: structuredClone(portionOptionsSeed),
  banners: structuredClone(bannersSeed),
  customers: structuredClone(customersSeed),
  customer_addresses: structuredClone(customerAddressesSeed),
  branches: structuredClone(branchesSeed),
  couriers: structuredClone(couriersSeed),
  cashier_accounts: structuredClone(cashierAccountsSeed),
  orders: structuredClone(ordersSeed),
  order_items: structuredClone(orderItemsSeed),
  stock_adjustments: [],
  integrations: {
    moysklad: {
      enabled: false,
      base_url: "https://api.moysklad.ru/api/remap/1.2",
      auth_mode: "token",
      token_enc: null,
      login_enc: null,
      password_enc: null,
      price_type_id: null,
      price_type_name: null,
      last_sync_at: null,
      last_sync_error: null,
    },
  },
};

async function getDb() {
  if (!globalStore.tomirDbPromise) {
    mkdirSync(path.dirname(SQLITE_DB_PATH), { recursive: true });
    globalStore.tomirDbPromise = open({
      filename: SQLITE_DB_PATH,
      driver: sqlite3.Database,
    });
  }
  return globalStore.tomirDbPromise;
}

function normalizeStoreSnapshot(snapshot: Store) {
  snapshot.integrations ??= {
    moysklad: {
      enabled: false,
      base_url: "https://api.moysklad.ru/api/remap/1.2",
      auth_mode: "token",
      token_enc: null,
      login_enc: null,
      password_enc: null,
      price_type_id: null,
      price_type_name: null,
      last_sync_at: null,
      last_sync_error: null,
    },
  };

  snapshot.categories.forEach((item) => {
    if (item.moysklad_id === undefined) item.moysklad_id = null;
  });
  snapshot.products.forEach((item) => {
    if (item.moysklad_id === undefined) item.moysklad_id = null;
  });
  snapshot.customers.forEach((item) => {
    if (item.moysklad_id === undefined) item.moysklad_id = null;
  });
  snapshot.branches.forEach((item) => {
    if (item.moysklad_store_id === undefined) item.moysklad_store_id = null;
  });
  snapshot.orders.forEach((item) => {
    if (item.moysklad_customerorder_id === undefined) item.moysklad_customerorder_id = null;
    if (item.moysklad_retaildemand_id === undefined) item.moysklad_retaildemand_id = null;
    if (item.moysklad_last_error === undefined) item.moysklad_last_error = null;
    if (item.moysklad_synced_at === undefined) item.moysklad_synced_at = null;
  });

  snapshot.stock_adjustments ??= [];

  return snapshot;
}

async function loadStoreFromDb() {
  const db = await getDb();
  await db.exec(
    `CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  );
  const row = (await db.get("SELECT data FROM app_state WHERE id = 1")) as
    | { data?: string }
    | undefined;
  if (!row?.data) {
    await db.run("INSERT INTO app_state (id, data, updated_at) VALUES (1, ?, ?)", [
      JSON.stringify(seededStore),
      nowIso(),
    ]);
    return normalizeStoreSnapshot(structuredClone(seededStore));
  }

  try {
    return normalizeStoreSnapshot(JSON.parse(row.data) as Store);
  } catch {
    await db.run("UPDATE app_state SET data = ?, updated_at = ? WHERE id = 1", [
      JSON.stringify(seededStore),
      nowIso(),
    ]);
    return normalizeStoreSnapshot(structuredClone(seededStore));
  }
}

async function initStore() {
  if (globalStore.tomirStore) return globalStore.tomirStore;
  const loaded = await loadStoreFromDb();
  globalStore.tomirStore = loaded;
  return globalStore.tomirStore;
}

export async function persistStore() {
  if (!globalStore.tomirStore) return;
  const db = await getDb();
  await db.run("UPDATE app_state SET data = ?, updated_at = ? WHERE id = 1", [
    JSON.stringify(globalStore.tomirStore),
    nowIso(),
  ]);
}

function isStoreSnapshot(value: unknown): value is Store {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return Boolean(
    obj.settings &&
      Array.isArray(obj.categories) &&
      Array.isArray(obj.products) &&
      Array.isArray(obj.product_images) &&
      Array.isArray(obj.portion_options) &&
      Array.isArray(obj.banners) &&
      Array.isArray(obj.customers) &&
      Array.isArray(obj.customer_addresses) &&
      Array.isArray(obj.branches) &&
      Array.isArray(obj.couriers) &&
      Array.isArray(obj.cashier_accounts) &&
      Array.isArray(obj.orders) &&
      Array.isArray(obj.order_items),
  );
}

export async function restoreStoreSnapshot(snapshot: unknown) {
  if (!isStoreSnapshot(snapshot) || !globalStore.tomirStore) return false;
  const normalized = normalizeStoreSnapshot(structuredClone(snapshot));
  Object.assign(globalStore.tomirStore, normalized);
  await persistStore();
  return true;
}

export const store = await initStore();

function nextId<T extends { id: number }>(items: T[]) {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

export function addStockAdjustment(input: { branchId: number; productId: number; delta: number }) {
  const delta = Math.trunc(Number(input.delta ?? 0));
  if (!delta) return null;
  const branchId = Number(input.branchId);
  const productId = Number(input.productId);
  if (!branchId || !productId) return null;

  const now = nowIso();
  store.stock_adjustments ??= [];
  const id = nextId(store.stock_adjustments);
  store.stock_adjustments.push({
    id,
    branch_id: branchId,
    product_id: productId,
    delta,
    created_at: now,
  });
  void persistStore();
  return id;
}

export function sumStockAdjustments(options: { storeId?: string | null; branchId?: number | null; productId?: number }) {
  const productId = options.productId ? Number(options.productId) : null;
  const branchIds: number[] = [];

  if (options.branchId) branchIds.push(Number(options.branchId));
  if (!branchIds.length && options.storeId) {
    const storeId = options.storeId.trim();
    store.branches.forEach((branch) => {
      if (branch.moysklad_store_id && branch.moysklad_store_id === storeId) {
        branchIds.push(branch.id);
      }
    });
  }

  if (!branchIds.length) return 0;
  const set = new Set(branchIds);
  return (store.stock_adjustments ?? []).reduce((sum, row) => {
    if (!set.has(row.branch_id)) return sum;
    if (productId && row.product_id !== productId) return sum;
    return sum + Number(row.delta ?? 0);
  }, 0);
}

function resolveBranchIdByGeo(lat?: number | null, lng?: number | null) {
  const activeBranches = store.branches.filter((branch) => branch.is_active === 1);
  const validLat = parseCoordinate(lat);
  const validLng = parseCoordinate(lng);

  if (validLat === null || validLng === null) {
    return activeBranches[0]?.id ?? store.branches[0]?.id ?? 1;
  }

  const toRad = (value: number) => (value * Math.PI) / 180;
  const distance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const earthRadiusKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  };

  let nearestId = activeBranches[0]?.id ?? 1;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const branch of activeBranches) {
    const branchLat = parseCoordinate(branch.lat);
    const branchLng = parseCoordinate(branch.lng);
    if (branchLat === null || branchLng === null) continue;
    const d = distance(validLat, validLng, branchLat, branchLng);
    if (d < nearestDistance) {
      nearestDistance = d;
      nearestId = branch.id;
    }
  }

  return nearestId;
}

export function listProducts(options?: {
  onlyActive?: boolean;
  categoryId?: number;
  onlyTop?: boolean;
  onlyPromotional?: boolean;
}) {
  const filtered = store.products.filter((product) => {
    if (options?.onlyActive && product.is_active !== 1) return false;
    if (options?.categoryId && product.category_id !== options.categoryId) return false;
    const isTop = Number((product as Partial<Product>).is_top ?? 0) === 1;
    const isPromo = Number((product as Partial<Product>).is_promo ?? 0) === 1;
    const promoPrice = Number((product as Partial<Product>).promo_price ?? 0);
    if (options?.onlyTop && !isTop) return false;
    if (options?.onlyPromotional && !(isPromo && promoPrice > 0)) return false;
    return true;
  });

  return filtered.map((item) => {
    const images = store.product_images
      .filter((img) => img.product_id === item.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => img.url);

    const portionOptions = store.portion_options
      .filter((row) => row.product_id === item.id)
      .map((row) => ({
        id: row.id,
        label_ru: row.label_ru,
        label_uz: row.label_uz,
        price: row.price,
      }));

    const basePrice = Number(item.price ?? 0);
    const isTop = Number((item as Partial<Product>).is_top ?? 0) === 1;
    const isPromo = Number((item as Partial<Product>).is_promo ?? 0) === 1;
    const oldPriceRaw = Number((item as Partial<Product>).old_price ?? 0);
    const promoPriceRaw = Number((item as Partial<Product>).promo_price ?? 0);
    const legacyDiscountPercent = Number((item as unknown as { discount_percent?: number }).discount_percent ?? 0);

    const oldPrice =
      isPromo && oldPriceRaw > 0
        ? oldPriceRaw
        : legacyDiscountPercent > 0
          ? basePrice
          : null;
    const promoPrice =
      isPromo && promoPriceRaw > 0
        ? promoPriceRaw
        : legacyDiscountPercent > 0
          ? Math.max(0, Math.round(basePrice - (basePrice * legacyDiscountPercent) / 100))
          : null;
    const discountPercent =
      oldPrice && promoPrice && oldPrice > 0 && promoPrice < oldPrice
        ? Math.round(((oldPrice - promoPrice) / oldPrice) * 100)
        : legacyDiscountPercent > 0
          ? legacyDiscountPercent
          : 0;
    const discountedPrice = promoPrice ?? basePrice;

    return {
      ...item,
      is_top: isTop ? 1 : 0,
      is_promo: isPromo ? 1 : 0,
      old_price: oldPrice,
      promo_price: promoPrice,
      discount_percent: discountPercent,
      discounted_price: discountedPrice,
      images,
      portionOptions,
    };
  });
}

export function createCategory(input: {
  nameRu: string;
  nameUz: string;
  imageUrl?: string | null;
}) {
  const now = nowIso();
  const slugBase = input.nameRu
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "") || `cat-${Date.now()}`;

  let slug = slugBase;
  if (store.categories.some((category) => category.slug === slug)) {
    slug = `${slug}-${Date.now()}`;
  }

  const category: Category = {
    id: nextId(store.categories),
    name_ru: input.nameRu,
    name_uz: input.nameUz,
    slug,
    image_url: input.imageUrl ?? null,
    sort_order: (store.categories[store.categories.length - 1]?.sort_order ?? 0) + 1,
    created_at: now,
    updated_at: now,
  };

  store.categories.push(category);
  void persistStore();
  return category;
}

export function deleteCategory(categoryId: number) {
  const before = store.categories.length;
  store.categories = store.categories.filter((item) => item.id !== categoryId);
  const removed = store.categories.length < before;
  if (!removed) return false;

  const now = nowIso();
  store.products.forEach((product) => {
    if (product.category_id === categoryId) {
      product.category_id = null;
      product.updated_at = now;
    }
  });

  void persistStore();
  return true;
}

export function updateCategory(
  categoryId: number,
  input: { nameRu?: string; nameUz?: string; imageUrl?: string | null },
) {
  const category = store.categories.find((item) => item.id === categoryId);
  if (!category) return null;

  if (input.nameRu !== undefined) category.name_ru = input.nameRu.trim();
  if (input.nameUz !== undefined) category.name_uz = input.nameUz.trim();
  if (input.imageUrl !== undefined) category.image_url = input.imageUrl?.trim() || null;
  category.updated_at = nowIso();

  void persistStore();
  return category;
}

export function createProduct(input: {
  categoryId?: number | null;
  titleRu: string;
  titleUz: string;
  descriptionTitleRu?: string | null;
  descriptionTitleUz?: string | null;
  descriptionTextRu?: string | null;
  descriptionTextUz?: string | null;
  price?: number;
  priceTextRu?: string | null;
  priceTextUz?: string | null;
  pricingMode?: "quantity" | "portion";
  stock?: number;
  isActive?: boolean;
  isTop?: boolean;
  isPromo?: boolean;
  oldPrice?: number | null;
  promoPrice?: number | null;
  images?: string[];
  portionOptions?: Array<{ labelRu?: string; labelUz?: string; price?: number }>;
}) {
  const now = nowIso();
  const productId = nextId(store.products);

  const isPromo = input.isPromo === true;
  const oldPrice = isPromo ? Math.max(0, Number(input.oldPrice ?? 0)) : 0;
  const promoPrice = isPromo ? Math.max(0, Number(input.promoPrice ?? 0)) : 0;
  const product: Product = {
    id: productId,
    category_id: input.categoryId ?? null,
    title_ru: input.titleRu,
    title_uz: input.titleUz,
    description_title_ru: input.descriptionTitleRu ?? null,
    description_title_uz: input.descriptionTitleUz ?? null,
    description_text_ru: input.descriptionTextRu ?? null,
    description_text_uz: input.descriptionTextUz ?? null,
    price: Number(input.price ?? 0),
    price_text_ru: input.priceTextRu ?? null,
    price_text_uz: input.priceTextUz ?? null,
    pricing_mode: input.pricingMode === "portion" ? "portion" : "quantity",
    stock: Number(input.stock ?? 0),
    is_active: input.isActive === false ? 0 : 1,
    is_top: input.isTop ? 1 : 0,
    is_promo: isPromo && oldPrice > 0 && promoPrice > 0 && promoPrice < oldPrice ? 1 : 0,
    old_price: isPromo && oldPrice > 0 ? oldPrice : null,
    promo_price: isPromo && promoPrice > 0 ? promoPrice : null,
    created_at: now,
    updated_at: now,
  };

  store.products.push(product);

  (input.images ?? []).forEach((url, index) => {
    if (!url || !url.trim()) return;
    store.product_images.push({
      id: nextId(store.product_images),
      product_id: productId,
      url: url.trim(),
      sort_order: index,
    });
  });

  (input.portionOptions ?? []).forEach((option) => {
    const labelRu = option.labelRu?.trim();
    const labelUz = option.labelUz?.trim();
    if (!labelRu || !labelUz) return;
    store.portion_options.push({
      id: nextId(store.portion_options),
      product_id: productId,
      label_ru: labelRu,
      label_uz: labelUz,
      price: Number(option.price ?? 0),
    });
  });

  void persistStore();
  return productId;
}

export function updateProduct(
  productId: number,
  input: {
    categoryId?: number | null;
    titleRu?: string;
    titleUz?: string;
    descriptionTitleRu?: string | null;
    descriptionTitleUz?: string | null;
    descriptionTextRu?: string | null;
    descriptionTextUz?: string | null;
    price?: number;
    priceTextRu?: string | null;
    priceTextUz?: string | null;
    pricingMode?: "quantity" | "portion";
    stock?: number;
    isActive?: boolean;
    isTop?: boolean;
    isPromo?: boolean;
    oldPrice?: number | null;
    promoPrice?: number | null;
    images?: string[];
    portionOptions?: Array<{ labelRu?: string; labelUz?: string; price?: number }>;
  },
) {
  const product = store.products.find((item) => item.id === productId);
  if (!product) return null;

  if (input.categoryId !== undefined) product.category_id = input.categoryId;
  if (input.titleRu !== undefined) product.title_ru = input.titleRu.trim();
  if (input.titleUz !== undefined) product.title_uz = input.titleUz.trim();
  if (input.descriptionTitleRu !== undefined) product.description_title_ru = input.descriptionTitleRu;
  if (input.descriptionTitleUz !== undefined) product.description_title_uz = input.descriptionTitleUz;
  if (input.descriptionTextRu !== undefined) product.description_text_ru = input.descriptionTextRu;
  if (input.descriptionTextUz !== undefined) product.description_text_uz = input.descriptionTextUz;
  if (input.price !== undefined) product.price = Number(input.price ?? 0);
  if (input.priceTextRu !== undefined) product.price_text_ru = input.priceTextRu;
  if (input.priceTextUz !== undefined) product.price_text_uz = input.priceTextUz;
  if (input.pricingMode !== undefined) product.pricing_mode = input.pricingMode;
  if (input.stock !== undefined) product.stock = Number(input.stock ?? 0);
  if (input.isActive !== undefined) product.is_active = input.isActive ? 1 : 0;
  if (input.isTop !== undefined) product.is_top = input.isTop ? 1 : 0;
  if (input.isPromo !== undefined || input.oldPrice !== undefined || input.promoPrice !== undefined) {
    const isPromo = input.isPromo ?? product.is_promo === 1;
    const oldPrice = input.oldPrice !== undefined ? Number(input.oldPrice ?? 0) : Number(product.old_price ?? 0);
    const promoPrice =
      input.promoPrice !== undefined ? Number(input.promoPrice ?? 0) : Number(product.promo_price ?? 0);

    const validPromo =
      isPromo === true &&
      Number.isFinite(oldPrice) &&
      Number.isFinite(promoPrice) &&
      oldPrice > 0 &&
      promoPrice > 0 &&
      promoPrice < oldPrice;
    product.is_promo = validPromo ? 1 : 0;
    product.old_price = validPromo ? oldPrice : null;
    product.promo_price = validPromo ? promoPrice : null;
  }
  product.updated_at = nowIso();

  if (input.images !== undefined) {
    store.product_images = store.product_images.filter((img) => img.product_id !== productId);
    input.images.forEach((url, index) => {
      const safeUrl = url?.trim();
      if (!safeUrl) return;
      store.product_images.push({
        id: nextId(store.product_images),
        product_id: productId,
        url: safeUrl,
        sort_order: index,
      });
    });
  }

  if (input.portionOptions !== undefined) {
    store.portion_options = store.portion_options.filter((item) => item.product_id !== productId);
    input.portionOptions.forEach((option) => {
      const labelRu = option.labelRu?.trim();
      const labelUz = option.labelUz?.trim();
      if (!labelRu || !labelUz) return;
      store.portion_options.push({
        id: nextId(store.portion_options),
        product_id: productId,
        label_ru: labelRu,
        label_uz: labelUz,
        price: Number(option.price ?? 0),
      });
    });
  }

  void persistStore();
  return product;
}

export function deleteProduct(productId: number) {
  const before = store.products.length;
  store.products = store.products.filter((item) => item.id !== productId);
  const removed = store.products.length < before;
  if (!removed) return false;

  store.product_images = store.product_images.filter((item) => item.product_id !== productId);
  store.portion_options = store.portion_options.filter((item) => item.product_id !== productId);

  void persistStore();
  return true;
}

export function createBanner(input: {
  titleRu: string;
  titleUz: string;
  imageUrl: string;
  linkUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}) {
  const now = nowIso();
  const banner: Banner = {
    id: nextId(store.banners),
    title_ru: input.titleRu,
    title_uz: input.titleUz,
    image_url: input.imageUrl,
    link_url: input.linkUrl ?? null,
    sort_order: Number(input.sortOrder ?? 0),
    is_active: input.isActive === false ? 0 : 1,
    created_at: now,
    updated_at: now,
  };

  store.banners.push(banner);
  void persistStore();
  return banner.id;
}

export function updateBanner(
  bannerId: number,
  input: {
    titleRu?: string;
    titleUz?: string;
    imageUrl?: string;
    linkUrl?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  },
) {
  const banner = store.banners.find((item) => item.id === bannerId);
  if (!banner) return null;

  if (input.titleRu !== undefined) banner.title_ru = input.titleRu.trim();
  if (input.titleUz !== undefined) banner.title_uz = input.titleUz.trim();
  if (input.imageUrl !== undefined) banner.image_url = input.imageUrl.trim();
  if (input.linkUrl !== undefined) banner.link_url = input.linkUrl?.trim() || null;
  if (input.sortOrder !== undefined) banner.sort_order = Number(input.sortOrder ?? 0);
  if (input.isActive !== undefined) banner.is_active = input.isActive ? 1 : 0;
  banner.updated_at = nowIso();

  void persistStore();
  return banner;
}

export function deleteBanner(bannerId: number) {
  const before = store.banners.length;
  store.banners = store.banners.filter((item) => item.id !== bannerId);
  const removed = store.banners.length < before;
  if (removed) void persistStore();
  return removed;
}

export function listBranches() {
  return [...store.branches].sort((a, b) => a.title.localeCompare(b.title));
}

export function getSettings() {
  return store.settings;
}

export function getMoyskladIntegration() {
  store.integrations ??= {
    moysklad: {
      enabled: false,
      base_url: "https://api.moysklad.ru/api/remap/1.2",
      auth_mode: "token",
      token_enc: null,
      login_enc: null,
      password_enc: null,
      price_type_id: null,
      price_type_name: null,
      last_sync_at: null,
      last_sync_error: null,
    },
  };

  store.integrations.moysklad ??= {
    enabled: false,
    base_url: "https://api.moysklad.ru/api/remap/1.2",
    auth_mode: "token",
    token_enc: null,
    login_enc: null,
    password_enc: null,
    price_type_id: null,
    price_type_name: null,
    last_sync_at: null,
    last_sync_error: null,
  };

  return store.integrations.moysklad;
}

export function updateMoyskladIntegration(input: {
  enabled?: boolean;
  baseUrl?: string;
  authMode?: "token" | "basic";
  tokenEnc?: string | null;
  loginEnc?: string | null;
  passwordEnc?: string | null;
  priceTypeId?: string | null;
  priceTypeName?: string | null;
  lastSyncAt?: string | null;
  lastSyncError?: string | null;
}) {
  const integration = getMoyskladIntegration();
  if (input.enabled !== undefined) integration.enabled = input.enabled;
  if (input.baseUrl !== undefined) integration.base_url = input.baseUrl.trim();
  if (input.authMode !== undefined) integration.auth_mode = input.authMode;
  if (input.tokenEnc !== undefined) integration.token_enc = input.tokenEnc;
  if (input.loginEnc !== undefined) integration.login_enc = input.loginEnc;
  if (input.passwordEnc !== undefined) integration.password_enc = input.passwordEnc;
  if (input.priceTypeId !== undefined) integration.price_type_id = input.priceTypeId;
  if (input.priceTypeName !== undefined) integration.price_type_name = input.priceTypeName;
  if (input.lastSyncAt !== undefined) integration.last_sync_at = input.lastSyncAt;
  if (input.lastSyncError !== undefined) integration.last_sync_error = input.lastSyncError;
  void persistStore();
  return integration;
}

export function updateSettings(input: {
  cafeName: string;
  phone?: string;
  address?: string;
  workHours?: string;
  deliveryFee?: number;
  minOrder?: number;
  currency?: string;
  bonusPercent?: number;
  bonusRedeemAmount?: number;
  instagram?: string;
  telegram?: string;
}) {
  store.settings.cafe_name = input.cafeName.trim();
  store.settings.phone = input.phone?.trim() ?? "";
  store.settings.address = input.address?.trim() ?? "";
  store.settings.work_hours = input.workHours?.trim() ?? "";
  store.settings.delivery_fee = Number(input.deliveryFee ?? 0);
  store.settings.min_order = Number(input.minOrder ?? 0);
  store.settings.currency = input.currency?.trim() || "сум";
  store.settings.bonus_percent = Number(input.bonusPercent ?? 0);
  store.settings.bonus_redeem_amount = Number(input.bonusRedeemAmount ?? 25000);
  store.settings.instagram = input.instagram?.trim() ?? "";
  store.settings.telegram = input.telegram?.trim() ?? "";
  store.settings.updated_at = nowIso();
  void persistStore();
  return store.settings;
}

export function createBranch(input: {
  title: string;
  address: string;
  phone?: string | null;
  workHours?: string | null;
  lat?: number | null;
  lng?: number | null;
  isActive?: boolean;
  moyskladStoreId?: string | null;
}) {
  const now = nowIso();
  const lat = parseCoordinate(input.lat);
  const lng = parseCoordinate(input.lng);
  const branch: Branch = {
    id: nextId(store.branches),
    title: input.title.trim(),
    address: input.address.trim(),
    phone: input.phone?.trim() || null,
    work_hours: input.workHours?.trim() || null,
    lat,
    lng,
    is_active: input.isActive === false ? 0 : 1,
    moysklad_store_id: input.moyskladStoreId?.trim() || null,
    created_at: now,
    updated_at: now,
  };
  store.branches.push(branch);
  void persistStore();
  return branch;
}

export function updateBranch(
  branchId: number,
  input: {
    title?: string;
    address?: string;
    phone?: string | null;
    workHours?: string | null;
    lat?: number | null;
    lng?: number | null;
    isActive?: boolean;
    moyskladStoreId?: string | null;
  },
) {
  const branch = store.branches.find((item) => item.id === branchId);
  if (!branch) return null;

  if (input.title?.trim()) branch.title = input.title.trim();
  if (input.address?.trim()) branch.address = input.address.trim();
  if (input.phone !== undefined) branch.phone = input.phone?.trim() || null;
  if (input.workHours !== undefined) branch.work_hours = input.workHours?.trim() || null;
  if (input.lat !== undefined) branch.lat = parseCoordinate(input.lat);
  if (input.lng !== undefined) branch.lng = parseCoordinate(input.lng);
  if (input.isActive !== undefined) branch.is_active = input.isActive ? 1 : 0;
  if (input.moyskladStoreId !== undefined) {
    branch.moysklad_store_id = input.moyskladStoreId?.trim() || null;
  }
  branch.updated_at = nowIso();
  void persistStore();
  return branch;
}

export function deleteBranch(branchId: number) {
  const before = store.branches.length;
  store.branches = store.branches.filter((item) => item.id !== branchId);
  const removed = store.branches.length < before;
  if (removed) void persistStore();
  return removed;
}

export function createCustomer(input: { name: string; phone: string; password: string }) {
  const phone = normalizePhone(input.phone);
  if (!phone) {
    return { error: "Missing data", status: 400 as const };
  }

  const existing = store.customers.find((customer) => customer.phone === phone);
  if (existing) {
    return { error: "Phone already exists", status: 409 as const };
  }

  const now = nowIso();
  const customer: Customer = {
    id: nextId(store.customers),
    name: input.name,
    phone,
    password: input.password,
    bonus_balance: 0,
    created_at: now,
    updated_at: now,
  };

  store.customers.push(customer);
  void persistStore();
  return { item: customer };
}

export function updateCustomerByAdmin(
  customerId: number,
  input: { name?: string; phone?: string; password?: string },
) {
  const customer = store.customers.find((item) => item.id === customerId);
  if (!customer) {
    return { error: "Customer not found", status: 404 as const };
  }

  if (input.name !== undefined) {
    const nextName = input.name.trim();
    if (!nextName) return { error: "Missing name", status: 400 as const };
    customer.name = nextName;
  }

  if (input.phone !== undefined) {
    const phone = normalizePhone(input.phone);
    if (!phone) return { error: "Missing phone", status: 400 as const };
    const exists = store.customers.find((row) => row.phone === phone && row.id !== customerId);
    if (exists) return { error: "Phone already exists", status: 409 as const };
    customer.phone = phone;
  }

  if (input.password !== undefined) {
    const password = input.password.trim();
    if (!password) return { error: "Missing password", status: 400 as const };
    customer.password = password;
  }

  customer.updated_at = nowIso();
  void persistStore();
  return { item: customer };
}

export function deleteCustomer(customerId: number) {
  const before = store.customers.length;
  store.customers = store.customers.filter((item) => item.id !== customerId);
  const removed = store.customers.length < before;
  if (!removed) return false;

  store.customer_addresses = store.customer_addresses.filter((item) => item.customer_id !== customerId);
  store.orders.forEach((order) => {
    if (order.customer_id === customerId) {
      order.customer_id = null;
      order.customer_address_id = null;
      order.updated_at = nowIso();
    }
  });

  void persistStore();
  return true;
}

export function listCashierAccounts() {
  return [...store.cashier_accounts].sort((a, b) => a.username.localeCompare(b.username));
}

export function findCashierAccountByCredentials(username: string, password: string) {
  const safeUsername = username.trim();
  const safePassword = password.trim();
  return (
    store.cashier_accounts.find(
      (account) =>
        account.is_active === 1 &&
        account.username === safeUsername &&
        account.password === safePassword,
    ) ?? null
  );
}

export function createCashierAccount(input: {
  username: string;
  password: string;
  branchId: number;
  displayName?: string;
  isActive?: boolean;
}) {
  const username = input.username.trim();
  const password = input.password.trim();
  if (!username || !password) {
    return { error: "Missing username/password", status: 400 as const };
  }
  const branch = getBranchById(input.branchId);
  if (!branch) {
    return { error: "Branch not found", status: 404 as const };
  }
  const exists = store.cashier_accounts.find((item) => item.username === username);
  if (exists) {
    return { error: "Username already exists", status: 409 as const };
  }

  const now = nowIso();
  const account: CashierAccount = {
    id: nextId(store.cashier_accounts),
    username,
    password,
    branch_id: input.branchId,
    display_name: input.displayName?.trim() || username,
    is_active: input.isActive === false ? 0 : 1,
    created_at: now,
    updated_at: now,
  };
  store.cashier_accounts.push(account);
  void persistStore();
  return { item: account };
}

export function updateCashierAccount(
  id: number,
  input: {
    username?: string;
    password?: string;
    branchId?: number;
    displayName?: string;
    isActive?: boolean;
  },
) {
  const account = store.cashier_accounts.find((item) => item.id === id);
  if (!account) return { error: "Not found", status: 404 as const };

  if (input.branchId !== undefined) {
    const branch = getBranchById(input.branchId);
    if (!branch) return { error: "Branch not found", status: 404 as const };
    account.branch_id = input.branchId;
  }
  if (input.username !== undefined) {
    const username = input.username.trim();
    if (!username) return { error: "Missing username", status: 400 as const };
    const exists = store.cashier_accounts.find((item) => item.username === username && item.id !== id);
    if (exists) return { error: "Username already exists", status: 409 as const };
    account.username = username;
  }
  if (input.password !== undefined) {
    const password = input.password.trim();
    if (!password) return { error: "Missing password", status: 400 as const };
    account.password = password;
  }
  if (input.displayName !== undefined) {
    account.display_name = input.displayName.trim() || account.username;
  }
  if (input.isActive !== undefined) {
    account.is_active = input.isActive ? 1 : 0;
  }
  account.updated_at = nowIso();
  void persistStore();
  return { item: account };
}

export function getBranchById(branchId: number) {
  return store.branches.find((branch) => branch.id === branchId) ?? null;
}

export function loginCustomer(input: { phone: string; password: string }) {
  const phone = normalizePhone(input.phone);
  const customer = store.customers.find((row) => row.phone === phone);
  if (!customer || !customer.password || customer.password !== input.password) {
    return null;
  }

  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    bonus_balance: customer.bonus_balance,
  };
}

export function getCustomerProfile(customerId: number) {
  const customer = store.customers.find((row) => row.id === customerId);
  if (!customer) return null;
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    bonus_balance: customer.bonus_balance,
  };
}

export function updateCustomerProfile(customerId: number, input: { name?: string; phone?: string }) {
  const customer = store.customers.find((row) => row.id === customerId);
  if (!customer) return { error: "Customer not found", status: 404 as const };

  const nextPhone = input.phone ? normalizePhone(input.phone) : null;
  if (nextPhone) {
    const exists = store.customers.find((row) => row.phone === nextPhone && row.id !== customerId);
    if (exists) return { error: "Phone already in use", status: 409 as const };
  }

  if (input.name?.trim()) {
    customer.name = input.name.trim();
  }
  if (nextPhone) {
    customer.phone = nextPhone;
  }
  customer.updated_at = nowIso();
  void persistStore();

  return {
    item: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      bonus_balance: customer.bonus_balance,
    },
  };
}

export function getCustomerBonus(customerId: number) {
  const customer = store.customers.find((row) => row.id === customerId);
  if (!customer) return null;
  return {
    customer_id: customer.id,
    balance: customer.bonus_balance,
  };
}

export function listCustomerAddresses(customerId: number) {
  return store.customer_addresses
    .filter((row) => row.customer_id === customerId)
    .sort((a, b) => {
      if (a.is_default !== b.is_default) return b.is_default - a.is_default;
      return b.created_at.localeCompare(a.created_at);
    })
    .map((row) => ({
      ...row,
      lat: parseCoordinate(row.lat),
      lng: parseCoordinate(row.lng),
    }));
}

export function addCustomerAddress(
  customerId: number,
  input: {
    label?: string | null;
    addressLine: string;
    comment?: string | null;
    lat?: number | null;
    lng?: number | null;
    isDefault?: boolean;
  }
) {
  const now = nowIso();
  const lat = parseCoordinate(input.lat);
  const lng = parseCoordinate(input.lng);
  if (input.isDefault) {
    store.customer_addresses.forEach((row) => {
      if (row.customer_id === customerId) {
        row.is_default = 0;
        row.updated_at = now;
      }
    });
  }

  const address: CustomerAddress = {
    id: nextId(store.customer_addresses),
    customer_id: customerId,
    label: input.label ?? null,
    address_line: input.addressLine,
    comment: input.comment ?? null,
    lat,
    lng,
    is_default: input.isDefault ? 1 : 0,
    created_at: now,
    updated_at: now,
  };

  store.customer_addresses.push(address);
  void persistStore();
  return address.id;
}

export function deleteCustomerAddress(customerId: number, addressId: number) {
  const address = store.customer_addresses.find(
    (row) => row.id === addressId && row.customer_id === customerId,
  );
  if (!address) return { error: "Address not found", status: 404 as const };

  const wasDefault = address.is_default === 1;
  store.customer_addresses = store.customer_addresses.filter((row) => row.id !== addressId);

  if (wasDefault) {
    const nextDefault = store.customer_addresses
      .filter((row) => row.customer_id === customerId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    if (nextDefault) {
      nextDefault.is_default = 1;
      nextDefault.updated_at = nowIso();
    }
  }

  const now = nowIso();
  store.orders.forEach((order) => {
    if (order.customer_address_id === addressId) {
      order.customer_address_id = null;
      order.updated_at = now;
    }
  });

  void persistStore();
  return { ok: true };
}

export function changeCustomerPassword(
  customerId: number,
  input: { currentPassword: string; newPassword: string },
) {
  const customer = store.customers.find((row) => row.id === customerId);
  if (!customer) return { error: "Customer not found", status: 404 as const };

  const currentPassword = input.currentPassword.trim();
  const newPassword = input.newPassword.trim();

  if (!currentPassword || !newPassword) {
    return { error: "Missing password", status: 400 as const };
  }

  if (!customer.password) {
    return { error: "Password is not set for this account", status: 400 as const };
  }

  if (customer.password !== currentPassword) {
    return { error: "Invalid current password", status: 401 as const };
  }

  customer.password = newPassword;
  customer.updated_at = nowIso();
  void persistStore();

  return { ok: true };
}

export function listCustomerOrders(customerId: number) {
  const orders = store.orders
    .filter((order) => order.customer_id === customerId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return orders.map((order) => {
    const address = order.customer_address_id
      ? store.customer_addresses.find((row) => row.id === order.customer_address_id) ?? null
      : null;
    const courier = order.courier_id
      ? store.couriers.find((row) => row.id === order.courier_id) ?? null
      : null;

    const items = store.order_items.filter((row) => row.order_id === order.id);
    const status = order.canceled_at ? "canceled" : order.status;

    return {
      ...order,
      status,
      courier,
      courier_name: order.outsource_provider === "yandex" ? "Яндекс доставка" : courier?.name ?? null,
      courier_phone: order.outsource_provider === "yandex" ? null : courier?.phone ?? null,
      courier_car_number: order.outsource_provider === "yandex" ? null : courier?.car_number ?? null,
      address,
      items,
    };
  });
}

export function listCouriers(branchId?: number) {
  return [...store.couriers]
    .filter((courier) => (branchId ? courier.branch_id === branchId : true))
    .sort((a, b) => b.is_active - a.is_active || a.name.localeCompare(b.name));
}

export function createCourier(input: {
  branchId: number;
  name: string;
  phone?: string | null;
  carNumber?: string | null;
  comment?: string | null;
  isActive?: boolean;
}) {
  const branch = getBranchById(input.branchId);
  if (!branch) return { error: "Branch not found", status: 404 as const };

  const name = input.name.trim();
  if (!name) return { error: "Missing name", status: 400 as const };

  const now = nowIso();
  const courier: Courier = {
    id: nextId(store.couriers),
    branch_id: input.branchId,
    name,
    phone: normalizePhone(input.phone ?? null),
    car_number: input.carNumber?.trim() || null,
    comment: input.comment?.trim() || null,
    is_active: input.isActive === false ? 0 : 1,
    created_at: now,
    updated_at: now,
  };

  store.couriers.push(courier);
  void persistStore();
  return { item: courier };
}

export function updateCourier(
  courierId: number,
  input: {
    branchId?: number;
    name?: string;
    phone?: string | null;
    carNumber?: string | null;
    comment?: string | null;
    isActive?: boolean;
  },
) {
  const courier = store.couriers.find((item) => item.id === courierId);
  if (!courier) return { error: "Courier not found", status: 404 as const };

  if (input.branchId !== undefined) {
    const branch = getBranchById(input.branchId);
    if (!branch) return { error: "Branch not found", status: 404 as const };
    courier.branch_id = input.branchId;
  }

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) return { error: "Missing name", status: 400 as const };
    courier.name = name;
  }

  if (input.phone !== undefined) {
    courier.phone = normalizePhone(input.phone);
  }

  if (input.carNumber !== undefined) {
    courier.car_number = input.carNumber?.trim() || null;
  }

  if (input.comment !== undefined) {
    courier.comment = input.comment?.trim() || null;
  }

  if (input.isActive !== undefined) {
    courier.is_active = input.isActive ? 1 : 0;
  }

  courier.updated_at = nowIso();
  void persistStore();
  return { item: courier };
}

export function deleteCourier(courierId: number) {
  const before = store.couriers.length;
  store.couriers = store.couriers.filter((item) => item.id !== courierId);
  if (store.couriers.length === before) {
    return { error: "Courier not found", status: 404 as const };
  }

  const now = nowIso();
  store.orders.forEach((order) => {
    if (order.courier_id === courierId) {
      order.courier_id = null;
      order.updated_at = now;
    }
  });

  void persistStore();
  return { ok: true as const };
}

export function listCashierOrders(branchId?: number) {
  const sorted = [...store.orders]
    .filter((order) => (branchId ? order.branch_id === branchId : true))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return sorted.map((order) => {
    const customer = order.customer_id
      ? store.customers.find((row) => row.id === order.customer_id)
      : null;
    const address = order.customer_address_id
      ? store.customer_addresses.find((row) => row.id === order.customer_address_id)
      : null;
    const courier = order.courier_id
      ? store.couriers.find((row) => row.id === order.courier_id)
      : null;
    const items = store.order_items.filter((row) => row.order_id === order.id);

    return {
      ...order,
      customer_name: customer?.name ?? null,
      customer_phone: customer?.phone ?? null,
      address_line: address?.address_line ?? null,
      address_comment: address?.comment ?? null,
      address_label: address?.label ?? null,
      courier_name: order.outsource_provider === "yandex" ? "Яндекс доставка" : courier?.name ?? null,
      courier_phone: order.outsource_provider === "yandex" ? null : courier?.phone ?? null,
      courier_car_number: order.outsource_provider === "yandex" ? null : courier?.car_number ?? null,
      branch: store.branches.find((row) => row.id === order.branch_id) ?? null,
      items,
    };
  });
}

export function updateCashierOrder(
  orderId: number,
  branchId: number | null | undefined,
  payload: {
    courierId?: number | null;
    outsourceProvider?: "yandex" | null;
    status?: string;
    cancelReason?: string | null;
  },
) {
  const order = store.orders.find((row) => row.id === orderId);
  if (!order) return false;
  if (branchId && order.branch_id !== branchId) return false;

  const now = nowIso();
  if (payload.outsourceProvider !== undefined) {
    order.outsource_provider = payload.outsourceProvider;
    if (payload.outsourceProvider === "yandex") {
      order.courier_id = null;
    }
  }

  if (payload.courierId !== undefined) {
    if (payload.courierId !== null) {
      const courier = store.couriers.find((row) => row.id === payload.courierId);
      if (!courier) return false;
      order.outsource_provider = null;
    } else if (payload.outsourceProvider === undefined) {
      order.outsource_provider = null;
    }
    order.courier_id = payload.courierId;
  }

  if (payload.status) {
    const wasCompleted = Boolean(order.completed_at);
    order.status =
      payload.status === "accepted" ||
      payload.status === "in_delivery" ||
      payload.status === "completed" ||
      payload.status === "canceled"
        ? payload.status
        : "paid";

    if (order.status === "accepted" && !order.accepted_at) {
      order.accepted_at = now;
    }
    if (order.status === "in_delivery" && !order.in_delivery_at) {
      order.in_delivery_at = now;
    }
    if (order.status === "completed" && !order.completed_at) {
      order.completed_at = now;

      const percent = Number(store.settings.bonus_percent ?? 0);
      const fixed = Number(store.settings.bonus_redeem_amount ?? 0);
      const byPercent =
        Number.isFinite(percent) && percent > 0
          ? Math.round((order.total_amount * percent) / 100)
          : 0;
      const byFixed =
        Number.isFinite(fixed) && fixed > 0
          ? Math.round(fixed)
          : 0;
      const earned = byPercent > 0 ? byPercent : byFixed;

      order.bonus_earned = earned;

      if (!wasCompleted && earned > 0 && order.customer_id) {
        const customer = store.customers.find((row) => row.id === order.customer_id);
        if (customer) {
          customer.bonus_balance += earned;
          customer.updated_at = now;
        }
      }
    }
    if (order.status === "canceled") {
      if (!order.canceled_at) {
        order.canceled_at = now;
      }
      order.cancel_reason = payload.cancelReason?.trim() || null;
    }
  }

  order.updated_at = now;
  void persistStore();
  return true;
}

export function assignOrderToBranch(orderId: number, branchId: number) {
  const order = store.orders.find((row) => row.id === orderId);
  if (!order) return { error: "Order not found", status: 404 as const };

  const branch = getBranchById(branchId);
  if (!branch) return { error: "Branch not found", status: 404 as const };

  const now = nowIso();
  order.branch_id = branchId;
  order.courier_id = null;
  order.sent_to_branch_at = now;
  order.updated_at = now;
  void persistStore();

  return { item: order };
}

export function createPublicOrder(payload: {
  customerId?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  addressId?: number | null;
  addressLine?: string | null;
  addressLabel?: string | null;
  addressComment?: string | null;
  comment?: string | null;
  paymentMethod?: string | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  bonusUsed?: number;
  items?: Array<{
    productId?: number;
    titleRu?: string;
    titleUz?: string;
    price?: number;
    quantity?: number;
  }>;
}) {
  const paymentMethod = payload.paymentMethod?.trim();
  const items = Array.isArray(payload.items) ? payload.items : [];

  if (!items.length || !paymentMethod) {
    return { error: "Missing items", status: 400 as const };
  }

  let deliveryLat = parseCoordinate(payload.deliveryLat);
  let deliveryLng = parseCoordinate(payload.deliveryLng);

  const normalizedPhone = normalizePhone(payload.customerPhone ?? null);
  const customerName = payload.customerName?.trim();
  const bonusUsedRequested = Number(payload.bonusUsed ?? 0);

  if (bonusUsedRequested > 0 && !payload.customerId && !customerName && !normalizedPhone) {
    return { error: "Bonus requires customer", status: 400 as const };
  }

  let customerId = payload.customerId ? Number(payload.customerId) : null;
  let customerAddressId = payload.addressId ? Number(payload.addressId) : null;
  let bonusUsed = 0;
  const normalizedAddressLine = payload.addressLine?.trim()
    ? normalizeAddressLine(payload.addressLine)
    : null;

  if (customerId) {
    const existing = store.customers.find((customer) => customer.id === customerId);
    if (!existing) {
      return { error: "Customer not found", status: 404 as const };
    }

    if (customerName) existing.name = customerName;
    if (normalizedPhone) existing.phone = normalizedPhone;

    if (bonusUsedRequested > 0) {
      bonusUsed = Math.max(0, Math.min(existing.bonus_balance, bonusUsedRequested));
      existing.bonus_balance -= bonusUsed;
    }

    existing.updated_at = nowIso();

    if (!customerAddressId && normalizedAddressLine) {
      const matchedAddress = store.customer_addresses.find(
        (row) =>
          row.customer_id === customerId &&
          normalizeAddressLine(row.address_line) === normalizedAddressLine,
      );
      if (matchedAddress) {
        customerAddressId = matchedAddress.id;
      }
    }
  } else {
    const existingByPhone = normalizedPhone
      ? store.customers.find((customer) => customer.phone === normalizedPhone)
      : null;

    if (existingByPhone) {
      customerId = existingByPhone.id;
      if (customerName) {
        existingByPhone.name = customerName;
      }
      existingByPhone.updated_at = nowIso();

      if (bonusUsedRequested > 0) {
        bonusUsed = Math.max(0, Math.min(existingByPhone.bonus_balance, bonusUsedRequested));
        existingByPhone.bonus_balance -= bonusUsed;
      }

      if (!customerAddressId && normalizedAddressLine) {
        const matchedAddress = store.customer_addresses.find(
          (row) =>
            row.customer_id === existingByPhone.id &&
            normalizeAddressLine(row.address_line) === normalizedAddressLine,
        );
        if (matchedAddress) {
          customerAddressId = matchedAddress.id;
        }
      }
    } else if (customerName) {
      const now = nowIso();
      const customer: Customer = {
        id: nextId(store.customers),
        name: customerName,
        phone: normalizedPhone,
        password: null,
        bonus_balance: 0,
        created_at: now,
        updated_at: now,
      };
      store.customers.push(customer);
      customerId = customer.id;
    }
  }

  if (!customerAddressId && customerId && payload.addressLine?.trim()) {
    customerAddressId = addCustomerAddress(customerId, {
      label: payload.addressLabel ?? null,
      addressLine: payload.addressLine.trim(),
      comment: payload.addressComment ?? null,
      lat: deliveryLat,
      lng: deliveryLng,
      isDefault: false,
    });
  }

  if ((deliveryLat === null || deliveryLng === null) && customerAddressId) {
    const selectedAddress = store.customer_addresses.find((row) => row.id === customerAddressId);
    if (selectedAddress) {
      const selectedLat = parseCoordinate(selectedAddress.lat);
      const selectedLng = parseCoordinate(selectedAddress.lng);
      if (deliveryLat === null && selectedLat !== null) {
        deliveryLat = selectedLat;
      }
      if (deliveryLng === null && selectedLng !== null) {
        deliveryLng = selectedLng;
      }
    }
  }

  const totalAmount = items.reduce((sum, item) => {
    const price = Number(item.price ?? 0);
    const quantity = Number(item.quantity ?? 0);
    return sum + price * quantity;
  }, 0);

  const now = nowIso();
  const orderId = nextId(store.orders);
  const branchId = resolveBranchIdByGeo(deliveryLat, deliveryLng);
  const order: Order = {
    id: orderId,
    branch_id: branchId,
    customer_id: customerId,
    customer_address_id: customerAddressId,
    total_amount: totalAmount,
    status: "paid",
    sent_to_branch_at: null,
    comment: payload.comment?.trim() ?? null,
    bonus_used: bonusUsed,
    bonus_earned: 0,
    courier_id: null,
    outsource_provider: null,
    payment_method: paymentMethod === "card" ? "card" : "cash",
    accepted_at: null,
    in_delivery_at: null,
    completed_at: null,
    canceled_at: null,
    cancel_reason: null,
    moysklad_customerorder_id: null,
    moysklad_retaildemand_id: null,
    moysklad_last_error: null,
    moysklad_synced_at: null,
    created_at: now,
    updated_at: now,
  };

  store.orders.unshift(order);

  items.forEach((item) => {
    const price = Number(item.price ?? 0);
    const quantity = Number(item.quantity ?? 0);
    store.order_items.push({
      id: nextId(store.order_items),
      order_id: orderId,
      product_id: item.productId ? Number(item.productId) : null,
      title_ru: item.titleRu?.trim() || "Товар",
      title_uz: item.titleUz?.trim() || "Mahsulot",
      price,
      quantity,
      total: price * quantity,
    });
  });

  // Decrease local branch stock immediately so the "Остатки" window reflects mobile sales.
  items.forEach((item) => {
    const productId = item.productId ? Number(item.productId) : 0;
    const quantity = Math.max(0, Math.trunc(Number(item.quantity ?? 0)));
    if (productId && quantity) {
      addStockAdjustment({ branchId, productId, delta: -quantity });
    }
  });

  void persistStore();
  return { id: orderId, branchId };
}

export function listAdminOrders() {
  return listCashierOrders().map((order) => ({
    ...order,
    admin_status:
      order.status === "paid" && order.sent_to_branch_at ? "sent_to_branch" : order.status,
    branch_title: order.branch?.title ?? null,
  }));
}

export function resetOrderStatsAndHistory() {
  store.orders = [];
  store.order_items = [];
  void persistStore();
  return { ok: true as const };
}

