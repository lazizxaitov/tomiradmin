"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Courier = {
  id: number;
  name: string;
  phone?: string | null;
  car_number?: string | null;
};

type OrderItem = {
  title_ru: string;
  price: number;
  quantity: number;
};

type Order = {
  id: number;
  total_amount: number;
  status: string;
  comment?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  address_line?: string | null;
  address_comment?: string | null;
  address_label?: string | null;
  courier_id?: number | null;
  payment_method?: string | null;
  items: OrderItem[];
};

type Branch = {
  id: number;
  title: string;
};

const statusLabels: Record<string, string> = {
  paid: "Новый",
  accepted: "Принят",
  in_delivery: "В доставке",
  completed: "Доставлен",
  canceled: "Не принят",
};

export default function CashierPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([fetch("/api/cashier/orders"), fetch("/api/couriers")])
      .then(async ([ordersRes, couriersRes]) => {
        const ordersData = await ordersRes.json();
        const couriersData = await couriersRes.json();
        setOrders(ordersData.items ?? []);
        setBranch(ordersData.branch ?? null);
        setCouriers(couriersData.items ?? []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, []);

  const updateOrder = async (orderId: number, payload: Record<string, unknown>) => {
    await fetch(`/api/cashier/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    load();
  };

  const logout = async () => {
    await fetch("/api/auth/cashier-logout", { method: "POST" });
    router.push("/login");
  };

  const activeOrders = orders.filter((order) => order.status !== "completed" && order.status !== "canceled");

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/20 bg-[#f7f3f1] p-5 shadow-2xl">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8d7374]">Tomir Kassa</p>
            <p className="text-sm text-[#8d7374]">
              {branch ? `Филиал: ${branch.title}` : "Новые заказы из мобильного приложения."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/cashier/history" className="rounded-2xl border border-[#e7d5cf] bg-white px-4 py-2 text-sm font-bold text-[#3c2828] shadow-sm">
              История
            </Link>
            <button onClick={logout} className="rounded-2xl border border-[#e7d5cf] bg-white px-4 py-2 text-sm font-bold text-[#3c2828] shadow-sm">
              Выйти
            </button>
          </div>
        </header>

        {loading ? (
          <div className="rounded-3xl border border-white/20 bg-[#f7f3f1] p-6 shadow-2xl">Загрузка...</div>
        ) : activeOrders.length === 0 ? (
          <div className="rounded-3xl border border-white/20 bg-[#f7f3f1] p-6 shadow-2xl">Пока нет заказов.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeOrders.map((order) => (
              <div key={order.id} className="rounded-3xl border border-white/20 bg-[#f7f3f1] p-6 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8d7374]">Заказ #{order.id}</p>
                    <p className="text-lg font-extrabold text-[#3c2828]">{order.total_amount.toLocaleString("ru-RU")} сум</p>
                    <p className="text-sm text-[#8d7374]">Статус: {statusLabels[order.status] ?? order.status}</p>
                  </div>
                  <div className="text-right text-sm text-[#8d7374]">
                    {order.customer_name ?? "Гость"}
                    <br />
                    {order.customer_phone ?? ""}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-[#e7d5cf] bg-white px-4 py-3 text-sm text-[#604a4b]">
                  <p className="font-semibold text-[#3c2828]">{order.address_label ? `${order.address_label} · ` : ""}{order.address_line ?? "—"}</p>
                  <p>Оплата: {order.payment_method ?? "—"}</p>
                  {order.address_comment ? <p>Комментарий адреса: {order.address_comment}</p> : null}
                  {order.comment ? <p>Комментарий заказа: {order.comment}</p> : null}
                </div>

                <div className="mt-4 space-y-2">
                  {order.items.map((item, index) => (
                    <div key={`${order.id}-${index}`} className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-[#3c2828]">{item.title_ru}</span>
                      <span className="text-[#8d7374]">{item.quantity} × {item.price.toLocaleString("ru-RU")}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <label className="text-sm font-semibold text-[#3c2828]">
                    Доставщик
                    <select
                      value={order.courier_id ?? ""}
                      onChange={(event) =>
                        updateOrder(order.id, {
                          courierId: event.target.value ? Number(event.target.value) : null,
                        })
                      }
                      className="mt-2 w-full rounded-2xl border border-[#e7d5cf] bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Не назначен</option>
                      {couriers.map((courier) => (
                        <option key={courier.id} value={courier.id}>
                          {courier.name}
                          {courier.phone ? ` · ${courier.phone}` : ""}
                          {courier.car_number ? ` · ${courier.car_number}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {order.status === "paid" ? (
                    <>
                      <button onClick={() => updateOrder(order.id, { status: "accepted" })} className="rounded-2xl bg-[#8c0f16] px-4 py-2 text-sm font-bold text-white">
                        Принять заказ
                      </button>
                      <button onClick={() => updateOrder(order.id, { status: "canceled", cancelReason: "Отклонено кассой" })} className="rounded-2xl border border-[#e7d5cf] bg-white px-4 py-2 text-sm font-bold text-[#3c2828]">
                        Не принять
                      </button>
                    </>
                  ) : null}
                  {order.status === "accepted" ? (
                    <button
                      onClick={() => updateOrder(order.id, { status: "in_delivery" })}
                      disabled={!order.courier_id}
                      className="rounded-2xl border border-[#e7d5cf] bg-white px-4 py-2 text-sm font-bold text-[#3c2828] disabled:opacity-60"
                    >
                      Доставляется
                    </button>
                  ) : null}
                  {order.status === "in_delivery" ? (
                    <button onClick={() => updateOrder(order.id, { status: "completed" })} className="rounded-2xl border border-[#e7d5cf] bg-white px-4 py-2 text-sm font-bold text-[#3c2828]">
                      Доставлен
                    </button>
                  ) : null}
                  {order.status !== "canceled" && order.status !== "completed" ? (
                    <button
                      onClick={() => {
                        if (!window.confirm("Отменить этот заказ?")) return;
                        void updateOrder(order.id, { status: "canceled", cancelReason: "Отменено кассой" });
                      }}
                      className="rounded-2xl border border-[#f1cdcf] bg-white px-4 py-2 text-sm font-bold text-[#8c0f16]"
                    >
                      Отменить заказ
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
