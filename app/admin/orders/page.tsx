"use client";

import { useEffect, useMemo, useState } from "react";

import { Card, GhostButton, Modal, SectionTitle } from "../_components/ui";

type Order = {
  id: number;
  branch_id: number;
  branch_title?: string | null;
  customer_name?: string | null;
  total_amount: number;
  status: "paid" | "accepted" | "in_delivery" | "completed" | "canceled";
  payment_method?: string | null;
  created_at: string;
};

const statusLabel: Record<Order["status"], string> = {
  paid: "Оплачен",
  accepted: "Принят",
  in_delivery: "В доставке",
  completed: "Завершен",
  canceled: "Отменен",
};

export default function OrdersPage() {
  const [items, setItems] = useState<Order[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => setItems(data.items ?? []));
  }, []);

  const analytics = useMemo(() => {
    const totalOrders = items.length;
    const totalRevenue = items.reduce((sum, order) => sum + order.total_amount, 0);

    const today = new Date();
    const todayOrders = items.filter((order) => {
      const date = new Date(order.created_at);
      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );
    }).length;

    const byStatus = items.reduce<Record<string, number>>((acc, order) => {
      acc[order.status] = (acc[order.status] ?? 0) + 1;
      return acc;
    }, {});

    const byBranch = items.reduce<
      Array<{ branchId: number; branchTitle: string; ordersCount: number; revenue: number }>
    >((acc, order) => {
      const branchId = order.branch_id;
      const branchTitle = order.branch_title ?? `Филиал #${branchId}`;
      const existing = acc.find((row) => row.branchId === branchId);
      if (existing) {
        existing.ordersCount += 1;
        existing.revenue += order.total_amount;
      } else {
        acc.push({ branchId, branchTitle, ordersCount: 1, revenue: order.total_amount });
      }
      return acc;
    }, []);

    byBranch.sort((a, b) => b.ordersCount - a.ordersCount || b.revenue - a.revenue);

    return { totalOrders, totalRevenue, todayOrders, byStatus, byBranch };
  }, [items]);

  const branchHistory = useMemo(() => {
    if (!selectedBranchId) return [];
    return items
      .filter((order) => order.branch_id === selectedBranchId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [items, selectedBranchId]);

  return (
    <div className="space-y-6">
      <SectionTitle title="Аналитика заказов" subtitle="Отчеты по заказам" />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-[#8d7374]">Всего заказов</p>
          <p className="mt-2 text-3xl font-extrabold text-[#3c2828]">{analytics.totalOrders}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-[#8d7374]">За сегодня</p>
          <p className="mt-2 text-3xl font-extrabold text-[#3c2828]">{analytics.todayOrders}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-[#8d7374]">Общая выручка</p>
          <p className="mt-2 text-3xl font-extrabold text-[#3c2828]">{analytics.totalRevenue.toLocaleString("ru-RU")} сум</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {(Object.keys(statusLabel) as Order["status"][]).map((key) => (
          <Card key={key}>
            <p className="text-xs uppercase tracking-[0.2em] text-[#8d7374]">{statusLabel[key]}</p>
            <p className="mt-2 text-2xl font-extrabold text-[#3c2828]">{analytics.byStatus[key] ?? 0}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-x-auto">
        <p className="mb-4 text-base font-bold text-[#3c2828]">Филиалы</p>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[#eee1dc] text-left text-xs uppercase tracking-wide text-[#8d7374]">
              <th className="pb-2 pr-3">Филиал</th>
              <th className="pb-2 pr-3">Заказы</th>
              <th className="pb-2 pr-3">Выручка</th>
              <th className="pb-2">История</th>
            </tr>
          </thead>
          <tbody>
            {analytics.byBranch.map((branch) => (
              <tr key={branch.branchId} className="border-b border-[#f3e8e2]">
                <td className="py-3 pr-3 font-semibold text-[#3d2b2b]">{branch.branchTitle}</td>
                <td className="py-3 pr-3 text-[#5a4848]">{branch.ordersCount}</td>
                <td className="py-3 pr-3 text-[#5a4848]">{branch.revenue.toLocaleString("ru-RU")} сум</td>
                <td className="py-3">
                  <GhostButton
                    type="button"
                    onClick={() => {
                      setSelectedBranchId(branch.branchId);
                      setHistoryOpen(true);
                    }}
                  >
                    История заказов
                  </GhostButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="История заказов филиала"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[#eee1dc] text-left text-xs uppercase tracking-wide text-[#8d7374]">
                <th className="pb-2 pr-3">ID</th>
                <th className="pb-2 pr-3">Клиент</th>
                <th className="pb-2 pr-3">Сумма</th>
                <th className="pb-2 pr-3">Статус</th>
                <th className="pb-2">Дата</th>
              </tr>
            </thead>
            <tbody>
              {branchHistory.map((order) => (
                <tr key={order.id} className="border-b border-[#f3e8e2]">
                  <td className="py-3 pr-3 font-semibold text-[#3d2b2b]">#{order.id}</td>
                  <td className="py-3 pr-3 text-[#5a4848]">{order.customer_name ?? "Клиент"}</td>
                  <td className="py-3 pr-3 text-[#5a4848]">{order.total_amount.toLocaleString("ru-RU")} сум</td>
                  <td className="py-3 pr-3 text-[#5a4848]">{statusLabel[order.status]}</td>
                  <td className="py-3 text-[#5a4848]">{new Date(order.created_at).toLocaleString("ru-RU")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}

