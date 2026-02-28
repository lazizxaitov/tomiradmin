"use client";

import { FormEvent, useEffect, useState } from "react";

type Branch = { id: number; title: string };
type BranchApiItem = { id: number; title: string };

type Cashier = {
  id: number;
  username: string;
  branch_id: number;
  display_name: string;
  is_active: 0 | 1;
};

const emptyForm = {
  username: "",
  password: "",
  branchId: "",
  displayName: "",
};

export function CashiersManager() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    const [branchesRes, cashiersRes] = await Promise.all([
      fetch("/api/branches"),
      fetch("/api/cashiers"),
    ]);
    const branchesData = await branchesRes.json();
    const cashiersData = await cashiersRes.json();
    setBranches(
      (branchesData.items ?? []).map((item: BranchApiItem) => ({ id: item.id, title: item.title })),
    );
    setCashiers(cashiersData.items ?? []);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.branchId) return;

    const payload = {
      username: form.username,
      password: form.password,
      branchId: Number(form.branchId),
      displayName: form.displayName,
      isActive: true,
    };

    if (editingId) {
      await fetch(`/api/cashiers/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/cashiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    setEditingId(null);
    setForm(emptyForm);
    await load();
  };

  const startEdit = (cashier: Cashier) => {
    setEditingId(cashier.id);
    setForm({
      username: cashier.username,
      password: "",
      branchId: String(cashier.branch_id),
      displayName: cashier.display_name,
    });
  };

  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-xl text-[#5d151b]">Кассы / Аккаунты</h2>
      <p className="mt-1 text-xs text-[#8d7374]">Создайте аккаунты касс для филиалов. Они используются на экране Tomir Касса.</p>

      <form onSubmit={onSubmit} className="mt-3 grid gap-2 md:grid-cols-2">
        <input
          value={form.username}
          onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
          placeholder="Логин кассы"
          className="rounded-xl border border-[#ecdcd6] px-3 py-2 text-sm"
          required
        />
        <input
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          placeholder={editingId ? "Новый пароль (обязательно)" : "Пароль"}
          className="rounded-xl border border-[#ecdcd6] px-3 py-2 text-sm"
          required
        />
        <select
          value={form.branchId}
          onChange={(event) => setForm((prev) => ({ ...prev, branchId: event.target.value }))}
          className="rounded-xl border border-[#ecdcd6] px-3 py-2 text-sm"
          required
        >
          <option value="">Выберите филиал</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.title}
            </option>
          ))}
        </select>
        <input
          value={form.displayName}
          onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
          placeholder="Отображаемое имя"
          className="rounded-xl border border-[#ecdcd6] px-3 py-2 text-sm"
        />

        <div className="flex gap-2 md:col-span-2">
          <button type="submit" className="rounded-xl bg-[#8c0f16] px-3 py-2 text-sm font-semibold text-white">
            {editingId ? "Сохранить аккаунт" : "Создать аккаунт"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
              className="rounded-xl border border-[#ecdcd6] px-3 py-2 text-sm font-semibold text-[#5d151b]"
            >
              Отмена
            </button>
          ) : null}
        </div>
      </form>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-sm text-[#8d7374]">Загрузка...</p>
        ) : (
          cashiers.map((cashier) => (
            <div key={cashier.id} className="rounded-xl border border-[#f1e3de] p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[#3d2b2b]">{cashier.display_name || cashier.username}</p>
                  <p className="text-xs text-[#8d7374]">Логин: {cashier.username}</p>
                  <p className="text-xs text-[#8d7374]">
                    Филиал: {branches.find((branch) => branch.id === cashier.branch_id)?.title ?? cashier.branch_id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(cashier)}
                  className="rounded-lg border border-[#ecdcd6] px-2 py-1 text-xs font-semibold text-[#5d151b]"
                >
                  Редактировать
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
