"use client";

import { useEffect, useMemo, useState } from "react";

import { Card, SectionTitle } from "../_components/ui";

type MoyskladStore = { id?: string; name?: string };

type StockItem = {
  product_id: number | null;
  moysklad_product_id: string | null;
  title: string;
  free_stock: number;
  local_adjustment: number;
  final_stock: number;
};

export default function StocksPage() {
  const [stores, setStores] = useState<MoyskladStore[]>([]);
  const [storeId, setStoreId] = useState("");
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/moysklad/stores")
      .then((res) => res.json())
      .then((data) => setStores(data.items ?? []))
      .catch(() => setStores([]));
  }, []);

  const load = async (nextStoreId: string) => {
    if (!nextStoreId) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/moysklad/stock?storeId=${encodeURIComponent(nextStoreId)}`).catch(
      () => null,
    );
    setLoading(false);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setError(data?.error?.toString() || "Не удалось загрузить остатки");
      setItems([]);
      return;
    }
    const data = await res.json().catch(() => null);
    setItems(Array.isArray(data?.items) ? data.items : []);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => row.title.toLowerCase().includes(q));
  }, [items, search]);

  return (
    <div className="space-y-6">
      <SectionTitle title="Остатки" subtitle="Остатки по складу МойСклад" />

      <Card className="flex flex-wrap items-center gap-3">
        <select
          className="w-full max-w-md rounded-2xl border border-[#dce4ec] bg-white px-4 py-2 text-sm"
          value={storeId}
          onChange={(event) => {
            const next = event.target.value;
            setStoreId(next);
            void load(next);
          }}
        >
          <option value="">Выберите склад</option>
          {stores.map((store) => (
            <option key={store.id ?? store.name} value={store.id ?? ""}>
              {store.name ?? "Без названия"}
            </option>
          ))}
        </select>

        <input
          className="w-full max-w-md rounded-2xl border border-[#dce4ec] bg-white px-4 py-2 text-sm"
          placeholder="Поиск по товарам"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </Card>

      {error ? <Card className="text-sm text-[#8c0f16]">{error}</Card> : null}
      {loading ? <Card className="text-sm text-[#8d7374]">Загрузка...</Card> : null}

      {storeId && !loading ? (
        <Card className="p-0">
          <div className="grid grid-cols-[1fr_140px_140px_140px] gap-2 border-b border-[#efe4df] px-5 py-3 text-xs font-bold text-[#6f5b5c]">
            <div>Товар</div>
            <div className="text-right">МойСклад</div>
            <div className="text-right">Продано</div>
            <div className="text-right">Итог</div>
          </div>
          <div className="divide-y divide-[#f3ebe7]">
            {filtered.map((row, idx) => (
              <div
                key={`${row.moysklad_product_id ?? "x"}-${idx}`}
                className="grid grid-cols-[1fr_140px_140px_140px] gap-2 px-5 py-3 text-sm"
              >
                <div className="font-semibold text-[#3c2828]">{row.title}</div>
                <div className="text-right tabular-nums text-[#3c2828]">
                  {Number(row.free_stock ?? 0).toLocaleString("ru-RU")}
                </div>
                <div className="text-right tabular-nums text-[#8c0f16]">
                  {Number(row.local_adjustment ?? 0).toLocaleString("ru-RU")}
                </div>
                <div className="text-right tabular-nums font-bold text-[#3c2828]">
                  {Number(row.final_stock ?? 0).toLocaleString("ru-RU")}
                </div>
              </div>
            ))}
            {!filtered.length ? (
              <div className="px-5 py-6 text-sm text-[#8d7374]">Нет данных.</div>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

