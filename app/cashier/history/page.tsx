"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type OrderItem = { title_ru: string; price: number; quantity: number };

type Order = {
  id: number;
  total_amount: number;
  status: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  address_line?: string | null;
  address_label?: string | null;
  payment_method?: string | null;
  created_at?: string | null;
  accepted_at?: string | null;
  in_delivery_at?: string | null;
  completed_at?: string | null;
  canceled_at?: string | null;
  cancel_reason?: string | null;
  courier_name?: string | null;
  courier_phone?: string | null;
  courier_car_number?: string | null;
  items: OrderItem[];
};

type Branch = {
  id: number;
  title: string;
};

const statusLabels: Record<string, string> = {
  paid: "Новый",
  accepted: "Принят",
  in_delivery: "Доставляется",
  completed: "Доставлен",
  canceled: "Не принят",
};

function formatTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CashierHistoryPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("completed");

  const load = () => {
    setLoading(true);
    fetch("/api/cashier/orders")
      .then((res) => res.json())
      .then((data) => {
        setOrders(data.items ?? []);
        setBranch(data.branch ?? null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((order) => {
      const statusOk = statusFilter === "all" || order.status === statusFilter;
      if (!statusOk) return false;
      if (!q) return true;
      const target = `${order.id} ${order.customer_name ?? ""} ${order.customer_phone ?? ""}`.toLowerCase();
      return target.includes(q);
    });
  }, [orders, query, statusFilter]);

  const logout = async () => {
    await fetch("/api/auth/cashier-logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/20 bg-[#f7f3f1] p-5 shadow-2xl">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8d7374]">Tomir Kassa</p>
            <p className="text-sm text-[#8d7374]">{branch ? `История: ${branch.title}` : "История заказов."}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/cashier" className="rounded-2xl border border-[#e7d5cf] bg-white px-4 py-2 text-sm font-bold text-[#3c2828] shadow-sm">
              Заказы
            </Link>
            <button onClick={logout} className="rounded-2xl border border-[#e7d5cf] bg-white px-4 py-2 text-sm font-bold text-[#3c2828] shadow-sm">
              Выйти
            </button>
          </div>
        </header>

        <div className="rounded-3xl border border-white/20 bg-[#f7f3f1] p-5 shadow-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск: № заказа, имя, телефон"
              className="h-10 w-full max-w-sm rounded-2xl border border-[#e7d5cf] bg-white px-3 text-sm"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-2xl border border-[#e7d5cf] bg-white px-3 text-sm"
            >
              <option value="completed">Доставлен</option>
              <option value="canceled">Не принят</option>
              <option value="all">Все</option>
            </select>
            <button onClick={load} className="rounded-2xl border border-[#e7d5cf] bg-white px-4 py-2 text-sm font-bold text-[#3c2828] shadow-sm">
              Обновить
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-white/20 bg-[#f7f3f1] p-6 shadow-2xl">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-white/20 bg-[#f7f3f1] p-6 shadow-2xl">История пока пустая.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => (
              <div key={order.id} className="rounded-3xl border border-white/20 bg-[#f7f3f1] px-5 py-4 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8d7374]">Заказ #{order.id}</p>
                    <p className="text-lg font-extrabold text-[#3c2828]">{order.total_amount.toLocaleString("ru-RU")} сум</p>
                    <p className="text-sm text-[#8d7374]">{order.customer_name ?? "Гость"} · {order.customer_phone ?? ""}</p>
                  </div>
                  <div className="text-right text-sm text-[#8d7374]">
                    <p className="font-semibold">{statusLabels[order.status] ?? order.status}</p>
                    <p>{formatTime(order.completed_at || order.canceled_at || order.created_at)}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-2xl border border-[#e7d5cf] bg-white p-3 text-sm text-[#604a4b]">
                  <p>{order.address_label ? `${order.address_label} · ` : ""}{order.address_line ?? "—"}</p>
                  <p>Курьер: {order.courier_name ?? "Не назначен"}</p>
                  <p>Оплата: {order.payment_method ?? "—"}</p>
                  {order.status === "canceled" ? <p>Причина: {order.cancel_reason || "—"}</p> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
