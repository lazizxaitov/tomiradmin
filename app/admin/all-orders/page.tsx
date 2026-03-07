"use client";

import { useEffect, useMemo, useState } from "react";

import { Card, SectionTitle } from "../_components/ui";

type OrderItem = {
  title_ru: string;
  price: number;
  quantity: number;
};

type Order = {
  id: number;
  branch_id: number;
  branch_title?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  address_line?: string | null;
  address_comment?: string | null;
  address_label?: string | null;
  total_amount: number;
  status: "paid" | "accepted" | "in_delivery" | "completed" | "canceled";
  payment_method?: string | null;
  created_at: string;
  items: OrderItem[];
};

const statusLabels: Record<Order["status"], string> = {
  paid: "Новый",
  accepted: "Принят",
  in_delivery: "В доставке",
  completed: "Доставлен",
  canceled: "Не принят",
};

export default function AllOrdersPage() {
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => setItems(data.items ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, []);

  const activeOrders = useMemo(
    () => items.filter((order) => order.status !== "completed" && order.status !== "canceled"),
    [items],
  );

  return (
    <div className="space-y-6">
      <SectionTitle title="Заказы" subtitle="Все заказы из приложения по всем филиалам" />

      {loading ? (
        <Card>Загрузка...</Card>
      ) : activeOrders.length === 0 ? (
        <Card>Новых заказов пока нет.</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {activeOrders.map((order) => (
            <Card key={order.id}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8d7374]">
                    Заказ #{order.id}
                  </p>
                  <p className="text-lg font-extrabold text-[#3c2828]">
                    {order.total_amount.toLocaleString("ru-RU")} сум
                  </p>
                  <p className="text-sm text-[#8d7374]">{statusLabels[order.status] ?? order.status}</p>
                </div>
                <div className="text-right text-xs text-[#8d7374]">
                  <p className="font-semibold text-[#3c2828]">{order.branch_title ?? `Филиал #${order.branch_id}`}</p>
                  <p>{new Date(order.created_at).toLocaleString("ru-RU")}</p>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-[#e7d5cf] bg-white px-4 py-3 text-sm text-[#604a4b]">
                <p className="font-semibold text-[#3c2828]">{order.customer_name ?? "Гость"}</p>
                <p>{order.customer_phone ?? "Телефон не указан"}</p>
                <p className="mt-1">
                  {order.address_label ? `${order.address_label} · ` : ""}
                  {order.address_line ?? "Адрес не указан"}
                </p>
                {order.address_comment ? <p>Комментарий: {order.address_comment}</p> : null}
                <p>Оплата: {order.payment_method ?? "-"}</p>
              </div>

              <div className="mt-3 space-y-1">
                {order.items?.map((item, index) => (
                  <div key={`${order.id}-${index}`} className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-[#3c2828]">{item.title_ru}</span>
                    <span className="text-[#8d7374]">
                      {item.quantity} x {item.price.toLocaleString("ru-RU")}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
