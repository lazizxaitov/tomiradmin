import Link from "next/link";

import { store } from "@/app/lib/data-store";

import { Card, SectionTitle } from "./_components/ui";

function sum(value: number) {
  return `${value.toLocaleString("ru-RU")} сум`;
}

export default function AdminDashboardPage() {
  const revenue = store.orders.reduce((acc, order) => acc + order.total_amount, 0);

  return (
    <div className="space-y-6">
      <SectionTitle title="Обзор" subtitle="Основные показатели" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-[#8d7374]">Заказы</p>
          <p className="mt-2 text-3xl font-extrabold text-[#3c2828]">{store.orders.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-[#8d7374]">Филиалы</p>
          <p className="mt-2 text-3xl font-extrabold text-[#3c2828]">{store.branches.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-[#8d7374]">Клиенты</p>
          <p className="mt-2 text-3xl font-extrabold text-[#3c2828]">{store.customers.length}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-[#8d7374]">Выручка</p>
          <p className="mt-2 text-3xl font-extrabold text-[#3c2828]">{sum(revenue)}</p>
        </Card>
      </div>
      <Card className="flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-bold text-[#3c2828]">Заказы</p>
          <p className="mt-1 text-sm text-[#8d7374]">Живая лента заказов по всем филиалам</p>
        </div>
        <Link
          href="/admin/all-orders"
          className="rounded-xl border border-[#7e0d14] bg-[#8c0f16] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#740b11]"
        >
          Открыть
        </Link>
      </Card>
      <Card className="flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-bold text-[#3c2828]">Аналитика заказов</p>
          <p className="mt-1 text-sm text-[#8d7374]">История и метрики заказов по филиалам</p>
        </div>
        <Link
          href="/admin/orders"
          className="rounded-xl border border-[#7e0d14] bg-[#8c0f16] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#740b11]"
        >
          Открыть
        </Link>
      </Card>
    </div>
  );
}

