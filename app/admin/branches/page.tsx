"use client";

import { FormEvent, useEffect, useState } from "react";

import { Card, Modal, PrimaryButton, SectionTitle } from "../_components/ui";
import { YandexMapPicker } from "../_components/yandex-map-picker";

type Branch = {
  id: number;
  title: string;
  address: string;
  phone: string | null;
  work_hours: string | null;
  lat: number | null;
  lng: number | null;
};

const empty = { title: "", address: "", phone: "", workHours: "", lat: "", lng: "" };

export default function BranchesPage() {
  const [items, setItems] = useState<Branch[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);

  const load = () =>
    fetch("/api/branches")
      .then((res) => res.json())
      .then((data) => setItems(data.items ?? []));

  useEffect(() => {
    load();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      title: form.title,
      address: form.address,
      phone: form.phone,
      workHours: form.workHours,
      lat: form.lat ? Number(form.lat) : null,
      lng: form.lng ? Number(form.lng) : null,
    };

    if (editingId) {
      await fetch(`/api/branches/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/branches", {
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

  const edit = (item: Branch) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      address: item.address,
      phone: item.phone ?? "",
      workHours: item.work_hours ?? "",
      lat: item.lat?.toString() ?? "",
      lng: item.lng?.toString() ?? "",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <SectionTitle title="Заведения" subtitle="Список филиалов" />
      <Card className="flex items-center justify-between">
        <p className="text-sm text-[#8d7374]">Добавляйте филиалы с точкой на карте Яндекс</p>
        <PrimaryButton
          onClick={() => {
            setEditingId(null);
            setForm(empty);
            setOpen(true);
          }}
        >
          Добавить
        </PrimaryButton>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item.id}>
            <p className="text-base font-bold text-[#3c2828]">{item.title}</p>
            <p className="text-sm text-[#8d7374]">{item.address}</p>
            <p className="text-xs text-[#8d7374]">{item.lat}, {item.lng}</p>
            <PrimaryButton className="mt-3" onClick={() => edit(item)}>Редактировать</PrimaryButton>
          </Card>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editingId ? "Редактировать филиал" : "Новый филиал"}>
        <form onSubmit={submit} className="grid gap-3">
          <input className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm" placeholder="Название" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} required />
          <input className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm" placeholder="Адрес" value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} required />
          <input className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm" placeholder="Телефон" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
          <input className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm" placeholder="Часы работы" value={form.workHours} onChange={(event) => setForm((prev) => ({ ...prev, workHours: event.target.value }))} />

          <YandexMapPicker
            address={form.address}
            lat={form.lat}
            lng={form.lng}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          />

          <PrimaryButton type="submit">{editingId ? "Сохранить" : "Создать"}</PrimaryButton>
        </form>
      </Modal>
    </div>
  );
}

