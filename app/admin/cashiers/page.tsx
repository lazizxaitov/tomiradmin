"use client";

import { FormEvent, useEffect, useState } from "react";

import { Card, Modal, PrimaryButton, SectionTitle } from "../_components/ui";

type Branch = { id: number; title: string };
type Cashier = { id: number; username: string; branch_id: number; display_name: string; is_active: 0 | 1 };

const empty = { username: "", password: "", branchId: "", displayName: "" };

export default function CashiersPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<Cashier[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);

  const load = () => {
    Promise.all([fetch("/api/branches"), fetch("/api/cashiers")]).then(async ([bRes, cRes]) => {
      const bData = await bRes.json();
      const cData = await cRes.json();
      setBranches((bData.items ?? []).map((i: Branch) => ({ id: i.id, title: i.title })));
      setItems(cData.items ?? []);
    });
  };

  useEffect(() => {    load();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
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
    setOpen(false);
    setEditingId(null);
    setForm(empty);
    load();
  };

  const edit = (item: Cashier) => {
    setEditingId(item.id);
    setForm({
      username: item.username,
      password: "",
      branchId: String(item.branch_id),
      displayName: item.display_name,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <SectionTitle title="Кассы" subtitle="Список касс" />
      <Card className="flex items-center justify-between">
        <p className="text-sm text-[#8d7374]">Создание и редактирование касс через модалку</p>
        <PrimaryButton onClick={() => { setEditingId(null); setForm(empty); setOpen(true); }}>Добавить</PrimaryButton>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item.id}>
            <p className="text-base font-bold text-[#3c2828]">{item.display_name}</p>
            <p className="text-sm text-[#8d7374]">Логин: {item.username}</p>
            <p className="text-sm text-[#8d7374]">Филиал: {branches.find((b) => b.id === item.branch_id)?.title ?? item.branch_id}</p>
            <PrimaryButton className="mt-3" onClick={() => edit(item)}>Редактировать</PrimaryButton>
          </Card>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editingId ? "Редактировать кассу" : "Новая касса"}>
        <form onSubmit={submit} className="grid gap-3">
          <input className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm" placeholder="Логин" value={form.username} onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))} required />
          <input type="password" className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm" placeholder="Пароль" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} required />
          <select className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm" value={form.branchId} onChange={(event) => setForm((prev) => ({ ...prev, branchId: event.target.value }))} required>
            <option value="">Выберите филиал</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.title}</option>)}
          </select>
          <input className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm" placeholder="Отображаемое имя" value={form.displayName} onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))} />
          <PrimaryButton type="submit">{editingId ? "Сохранить" : "Создать"}</PrimaryButton>
        </form>
      </Modal>
    </div>
  );
}


