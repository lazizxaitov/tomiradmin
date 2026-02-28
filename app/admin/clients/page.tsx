"use client";

import { useEffect, useMemo, useState } from "react";

import { Card, GhostButton, Modal, PrimaryButton, SectionTitle } from "../_components/ui";

type Client = { id: number; name: string; phone: string | null };

const initialForm = { name: "", phone: "", password: "" };

export default function ClientsPage() {
  const [items, setItems] = useState<Client[]>([]);
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState(initialForm);

  const load = () =>
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => setItems(data.items ?? []));

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => setForm(initialForm);

  const create = async () => {
    await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setCreateOpen(false);
    resetForm();
    load();
  };

  const startEdit = (client: Client) => {
    setEditingId(client.id);
    setForm({ name: client.name, phone: client.phone ?? "", password: "" });
    setEditOpen(true);
  };

  const update = async () => {
    if (!editingId) return;

    await fetch(`/api/clients/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setEditOpen(false);
    setEditingId(null);
    resetForm();
    load();
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => `${item.name} ${item.phone ?? ""}`.toLowerCase().includes(q));
  }, [items, search]);

  const formBody = (
    <div className="grid gap-3">
      <input className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm" placeholder="Имя" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
      <input className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm" placeholder="Телефон" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
      <input type="password" className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm" placeholder="Пароль (если нужно сменить)" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} />
    </div>
  );

  return (
    <div className="space-y-6">
      <SectionTitle title="Клиенты" subtitle="Список клиентов" />
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <input
          className="w-full max-w-md rounded-2xl border border-[#dce4ec] bg-white px-4 py-2 text-sm"
          placeholder="Поиск по клиентам"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <PrimaryButton
          onClick={() => {
            resetForm();
            setCreateOpen(true);
          }}
        >
          Добавить
        </PrimaryButton>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {filteredItems.map((item) => (
          <Card key={item.id}>
            <p className="text-base font-bold text-[#3c2828]">{item.name}</p>
            <p className="text-sm text-[#8d7374]">{item.phone ?? "-"}</p>
            <div className="mt-3">
              <GhostButton type="button" onClick={() => startEdit(item)}>Изменить</GhostButton>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новый клиент" footer={<PrimaryButton onClick={create}>Создать</PrimaryButton>}>
        {formBody}
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Изменить клиента" footer={<PrimaryButton onClick={update}>Сохранить</PrimaryButton>}>
        {formBody}
      </Modal>
    </div>
  );
}

