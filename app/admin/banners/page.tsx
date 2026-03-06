"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Card, GhostButton, Modal, PrimaryButton, SectionTitle } from "../_components/ui";

type Banner = {
  id: number;
  title_ru: string;
  title_uz: string;
  image_url: string;
  sort_order: number;
  is_active: number;
};

const initialForm = {
  titleRu: "",
  titleUz: "",
  imageUrl: "",
  sortOrder: "0",
  isActive: true,
};

export default function BannersPage() {
  const [items, setItems] = useState<Banner[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(initialForm);
  const [uploading, setUploading] = useState(false);

  const load = () =>
    fetch("/api/banners")
      .then((res) => res.json())
      .then((data) => setItems(data.items ?? []));

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => setForm(initialForm);

  const create = async () => {
    await fetch("/api/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titleRu: form.titleRu,
        titleUz: form.titleUz,
        imageUrl: form.imageUrl,
        sortOrder: Number(form.sortOrder || 0),
        isActive: form.isActive,
      }),
    });
    setOpen(false);
    resetForm();
    load();
  };

  const startEdit = (item: Banner) => {
    setEditingId(item.id);
    setForm({
      titleRu: item.title_ru,
      titleUz: item.title_uz,
      imageUrl: item.image_url,
      sortOrder: String(item.sort_order ?? 0),
      isActive: item.is_active === 1,
    });
    setEditOpen(true);
  };

  const update = async () => {
    if (!editingId) return;

    await fetch(`/api/banners/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titleRu: form.titleRu,
        titleUz: form.titleUz,
        imageUrl: form.imageUrl,
        sortOrder: Number(form.sortOrder || 0),
        isActive: form.isActive,
      }),
    });

    setEditOpen(false);
    setEditingId(null);
    resetForm();
    load();
  };

  const remove = async (id: number) => {
    await fetch(`/api/banners/${id}`, { method: "DELETE" });
    load();
  };

  const uploadImage = async (file: File) => {
    const payload = new FormData();
    payload.append("file", file);

    setUploading(true);
    const response = await fetch("/api/admin/upload-image", { method: "POST", body: payload });
    const data = await response.json().catch(() => null);
    setUploading(false);

    if (!response.ok || !data?.url) return;
    setForm((prev) => ({ ...prev, imageUrl: data.url }));
  };

  const formBody = (
    <div className="grid gap-3">
      <input
        className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm"
        placeholder="Заголовок RU"
        value={form.titleRu}
        onChange={(event) => setForm((prev) => ({ ...prev, titleRu: event.target.value }))}
      />
      <input
        className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm"
        placeholder="Заголовок UZ"
        value={form.titleUz}
        onChange={(event) => setForm((prev) => ({ ...prev, titleUz: event.target.value }))}
      />
      <input
        type="number"
        className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm"
        placeholder="Порядок показа (sort order)"
        value={form.sortOrder}
        onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
      />
      <label className="flex items-center gap-2 text-sm font-medium text-[#3c2828]">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
        />
        Показывать в приложении
      </label>
      <input
        type="file"
        accept="image/*"
        className="rounded-2xl border border-[#ead8d1] bg-white px-4 py-3 text-sm"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          void uploadImage(file);
          event.currentTarget.value = "";
        }}
      />
      {uploading ? <p className="text-xs text-[#8d7374]">Загрузка картинки...</p> : null}
      {form.imageUrl ? (
        <Image src={form.imageUrl} alt="preview" width={600} height={280} unoptimized className="h-36 w-full rounded-2xl object-cover" />
      ) : null}
    </div>
  );

  return (
    <div className="space-y-6">
      <SectionTitle title="Баннеры" subtitle="Список баннеров" />
      <Card className="flex items-center justify-between">
        <p className="text-sm text-[#8d7374]">Создание и редактирование баннеров</p>
        <PrimaryButton
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
        >
          Добавить
        </PrimaryButton>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item.id}>
            <Image
              src={item.image_url}
              alt={item.title_ru}
              width={600}
              height={280}
              unoptimized
              className="h-36 w-full rounded-2xl object-cover"
            />
            <p className="mt-3 text-base font-bold text-[#3c2828]">{item.title_ru}</p>
            <p className="text-sm text-[#8d7374]">{item.title_uz}</p>
            <p className="mt-2 text-xs text-[#7a6061]">Порядок: {item.sort_order} · {item.is_active === 1 ? "Активен" : "Скрыт"}</p>
            <div className="mt-3 flex gap-2">
              <GhostButton type="button" onClick={() => startEdit(item)}>Изменить</GhostButton>
              <GhostButton type="button" onClick={() => remove(item.id)}>Удалить</GhostButton>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Новый баннер"
        footer={<PrimaryButton onClick={create}>Создать</PrimaryButton>}
      >
        {formBody}
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Изменить баннер"
        footer={<PrimaryButton onClick={update}>Сохранить</PrimaryButton>}
      >
        {formBody}
      </Modal>
    </div>
  );
}

