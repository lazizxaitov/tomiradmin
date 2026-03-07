"use client";

import { useEffect, useMemo, useState } from "react";

import { Card, GhostButton, Modal, PrimaryButton, SectionTitle } from "../_components/ui";

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

type Branch = {
  id: number;
  title: string;
};

const statusLabels: Record<Order["status"], string> = {
  paid: "Новый",
  accepted: "Принят",
  in_delivery: "В доставке",
  completed: "Доставлен",
  canceled: "Отменен",
};

export default function AllOrdersPage() {
  const [items, setItems] = useState<Order[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  const [sendOpen, setSendOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [targetBranchId, setTargetBranchId] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([fetch("/api/orders"), fetch("/api/branches")])
      .then(async ([ordersRes, branchesRes]) => {
        const ordersData = await ordersRes.json();
        const branchesData = await branchesRes.json();
        setItems(ordersData.items ?? []);
        setBranches(branchesData.items ?? []);
      })
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

  const openSendModal = (order: Order) => {
    setSelectedOrderId(order.id);
    setTargetBranchId(String(order.branch_id));
    setSendOpen(true);
  };

  const sendToBranch = async () => {
    if (!selectedOrderId || !targetBranchId) return;
    setSending(true);
    const response = await fetch(`/api/orders/${selectedOrderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId: Number(targetBranchId) }),
    });
    setSending(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      alert(data?.error ?? "Не удалось отправить заказ в филиал");
      return;
    }

    setSendOpen(false);
    setSelectedOrderId(null);
    setTargetBranchId("");
    load();
  };

  const cancelOrder = async (orderId: number) => {
    if (!window.confirm("Отменить этот заказ?")) return;
    const response = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "canceled",
        cancelReason: "Отменено администратором",
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      alert(data?.error ?? "Не удалось отменить заказ");
      return;
    }
    load();
  };

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

              <div className="mt-4 flex gap-2">
                <GhostButton type="button" onClick={() => openSendModal(order)}>
                  Отправить в филиал
                </GhostButton>
                <GhostButton
                  type="button"
                  className="border-[#f1cdcf] text-[#8c0f16] hover:border-[#8c0f16]"
                  onClick={() => void cancelOrder(order.id)}
                >
                  Отменить заказ
                </GhostButton>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title="Отправить заказ в филиал"
        footer={(
          <PrimaryButton onClick={() => void sendToBranch()} disabled={sending || !targetBranchId}>
            {sending ? "Отправка..." : "Отправить"}
          </PrimaryButton>
        )}
      >
        <div className="grid gap-3">
          <select
            className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm"
            value={targetBranchId}
            onChange={(event) => setTargetBranchId(event.target.value)}
          >
            <option value="">Выбери филиал</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.title}
              </option>
            ))}
          </select>
        </div>
      </Modal>
    </div>
  );
}
