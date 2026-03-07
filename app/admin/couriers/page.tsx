"use client";

import { FormEvent, useEffect, useState } from "react";

import { Card, GhostButton, Modal, PrimaryButton, SectionTitle } from "../_components/ui";

type Branch = { id: number; title: string };
type Courier = {
  id: number;
  branch_id: number;
  name: string;
  phone: string | null;
  car_number: string | null;
  comment: string | null;
  is_active: 0 | 1;
};

const emptyForm = {
  branchId: "",
  name: "",
  phone: "",
  carNumber: "",
  comment: "",
  isActive: true,
};

export default function CouriersPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<Courier[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    Promise.all([fetch("/api/branches"), fetch("/api/couriers")]).then(async ([bRes, cRes]) => {
      const bData = await bRes.json();
      const cData = await cRes.json();
      setBranches((bData.items ?? []).map((i: Branch) => ({ id: i.id, title: i.title })));
      setItems(cData.items ?? []);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (item: Courier) => {
    setEditingId(item.id);
    setForm({
      branchId: String(item.branch_id),
      name: item.name,
      phone: item.phone ?? "",
      carNumber: item.car_number ?? "",
      comment: item.comment ?? "",
      isActive: item.is_active === 1,
    });
    setOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      branchId: Number(form.branchId),
      name: form.name,
      phone: form.phone || null,
      carNumber: form.carNumber || null,
      comment: form.comment || null,
      isActive: form.isActive,
    };

    if (editingId) {
      await fetch(`/api/couriers/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/couriers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    load();
  };

  const remove = async (id: number) => {
    const ok = window.confirm("Удалить доставщика?");
    if (!ok) return;
    await fetch(`/api/couriers/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-6">
      <SectionTitle title="Доставщики" subtitle="Добавление, редактирование и удаление доставщиков" />

      <Card className="flex items-center justify-between">
        <p className="text-sm text-[#8d7374]">Управление доставщиками в модалке</p>
        <PrimaryButton onClick={openCreate}>Добавить</PrimaryButton>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item.id}>
            <p className="text-base font-bold text-[#3c2828]">{item.name}</p>
            <p className="text-sm text-[#8d7374]">
              Филиал: {branches.find((branch) => branch.id === item.branch_id)?.title ?? item.branch_id}
            </p>
            <p className="text-sm text-[#8d7374]">Телефон: {item.phone || "Не указан"}</p>
            <p className="text-sm text-[#8d7374]">Машина: {item.car_number || "Не указана"}</p>
            <p className="text-sm text-[#8d7374]">Статус: {item.is_active ? "Активен" : "Неактивен"}</p>
            {item.comment ? <p className="mt-1 text-sm text-[#8d7374]">Комментарий: {item.comment}</p> : null}
            <div className="mt-3 flex gap-2">
              <PrimaryButton onClick={() => openEdit(item)}>Редактировать</PrimaryButton>
              <GhostButton onClick={() => remove(item.id)}>Удалить</GhostButton>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Редактировать доставщика" : "Новый доставщик"}
      >
        <form onSubmit={submit} className="grid gap-3">
          <select
            className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm"
            value={form.branchId}
            onChange={(event) => setForm((prev) => ({ ...prev, branchId: event.target.value }))}
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
            className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm"
            placeholder="Имя доставщика"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />

          <input
            className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm"
            placeholder="Телефон"
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
          />

          <input
            className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm"
            placeholder="Номер машины"
            value={form.carNumber}
            onChange={(event) => setForm((prev) => ({ ...prev, carNumber: event.target.value }))}
          />

          <textarea
            className="min-h-[90px] rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm"
            placeholder="Комментарий"
            value={form.comment}
            onChange={(event) => setForm((prev) => ({ ...prev, comment: event.target.value }))}
          />

          <label className="flex items-center gap-2 text-sm text-[#5b4647]">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            Активен
          </label>

          <PrimaryButton type="submit">{editingId ? "Сохранить" : "Создать"}</PrimaryButton>
        </form>
      </Modal>
    </div>
  );
}
