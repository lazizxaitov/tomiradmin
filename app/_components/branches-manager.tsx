"use client";

import { FormEvent, useEffect, useState } from "react";

type Branch = {
  id: number;
  title: string;
  address: string;
  phone: string | null;
  work_hours: string | null;
  lat: number | null;
  lng: number | null;
  is_active: 0 | 1;
};

const emptyForm = {
  title: "",
  address: "",
  phone: "",
  workHours: "",
  lat: "",
  lng: "",
};

export function BranchesManager() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    const response = await fetch("/api/branches");
    const data = await response.json();
    setBranches(data.items ?? []);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const onSubmit = async (event: FormEvent) => {
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

    setEditingId(null);
    setForm(emptyForm);
    await load();
  };

  const startEdit = (branch: Branch) => {
    setEditingId(branch.id);
    setForm({
      title: branch.title,
      address: branch.address,
      phone: branch.phone ?? "",
      workHours: branch.work_hours ?? "",
      lat: branch.lat?.toString() ?? "",
      lng: branch.lng?.toString() ?? "",
    });
  };

  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-xl text-[#5d151b]">Заведения / Филиалы</h2>
      <p className="mt-1 text-xs text-[#8d7374]">Маршрутизация заказов идет по геолокации (lat/lng) ближайшего филиала.</p>

      <form onSubmit={onSubmit} className="mt-3 grid gap-2 md:grid-cols-2">
        <input
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          placeholder="Название филиала"
          className="rounded-xl border border-[#ecdcd6] px-3 py-2 text-sm"
          required
        />
        <input
          value={form.address}
          onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
          placeholder="Адрес"
          className="rounded-xl border border-[#ecdcd6] px-3 py-2 text-sm"
          required
        />
        <input
          value={form.phone}
          onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
          placeholder="Телефон"
          className="rounded-xl border border-[#ecdcd6] px-3 py-2 text-sm"
        />
        <input
          value={form.workHours}
          onChange={(event) => setForm((prev) => ({ ...prev, workHours: event.target.value }))}
          placeholder="Часы работы"
          className="rounded-xl border border-[#ecdcd6] px-3 py-2 text-sm"
        />
        <input
          value={form.lat}
          onChange={(event) => setForm((prev) => ({ ...prev, lat: event.target.value }))}
          placeholder="Широта (lat)"
          className="rounded-xl border border-[#ecdcd6] px-3 py-2 text-sm"
          required
        />
        <input
          value={form.lng}
          onChange={(event) => setForm((prev) => ({ ...prev, lng: event.target.value }))}
          placeholder="Долгота (lng)"
          className="rounded-xl border border-[#ecdcd6] px-3 py-2 text-sm"
          required
        />
        <div className="flex gap-2 md:col-span-2">
          <button type="submit" className="rounded-xl bg-[#8c0f16] px-3 py-2 text-sm font-semibold text-white">
            {editingId ? "Сохранить филиал" : "Создать филиал"}
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
          branches.map((branch) => (
            <div key={branch.id} className="rounded-xl border border-[#f1e3de] p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[#3d2b2b]">{branch.title}</p>
                  <p className="text-xs text-[#8d7374]">{branch.address}</p>
                  <p className="text-xs text-[#8d7374]">Lat/Lng: {branch.lat ?? "-"}, {branch.lng ?? "-"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(branch)}
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
