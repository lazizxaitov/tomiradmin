"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import ImageCropUpload from "../_components/image-crop-upload";
import { Card, GhostButton, Modal, PrimaryButton, SectionTitle } from "../_components/ui";

type Category = { id: number; name_ru: string; name_uz: string; image_url: string | null };

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ nameRu: "", nameUz: "", imageUrl: "" });

  const load = () =>
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setItems(data.items ?? []));

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setCreateOpen(false);
    setForm({ nameRu: "", nameUz: "", imageUrl: "" });
    load();
  };

  const startEdit = (item: Category) => {
    setEditingId(item.id);
    setForm({
      nameRu: item.name_ru,
      nameUz: item.name_uz,
      imageUrl: item.image_url ?? "",
    });
    setEditOpen(true);
  };

  const update = async () => {
    if (!editingId) return;
    const response = await fetch(`/api/categories/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      alert(data?.error ?? "Не удалось изменить категорию");
      return;
    }
    setEditOpen(false);
    setEditingId(null);
    setForm({ nameRu: "", nameUz: "", imageUrl: "" });
    load();
  };

  const remove = async (id: number) => {
    if (!window.confirm("Удалить категорию? Товары сохранятся, но без категории.")) return;
    const response = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      alert(data?.error ?? "Не удалось удалить категорию");
      return;
    }
    load();
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => `${item.name_ru} ${item.name_uz}`.toLowerCase().includes(q));
  }, [items, search]);

  return (
    <div className="space-y-6">
      <SectionTitle title="Категории" subtitle="Список категорий" />
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <input
          className="w-full max-w-md rounded-2xl border border-[#dce4ec] bg-white px-4 py-2 text-sm"
          placeholder="Поиск по категориям"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <PrimaryButton
          onClick={() => {
            setForm({ nameRu: "", nameUz: "", imageUrl: "" });
            setCreateOpen(true);
          }}
        >
          Добавить
        </PrimaryButton>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {filteredItems.map((item) => (
          <Card key={item.id}>
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt={item.name_ru}
                width={480}
                height={240}
                unoptimized
                className="mb-3 h-32 w-full rounded-2xl object-cover"
              />
            ) : null}
            <p className="text-base font-bold text-[#3c2828]">{item.name_ru}</p>
            <p className="text-sm text-[#8d7374]">{item.name_uz}</p>
            <div className="mt-3 flex gap-2">
              <GhostButton type="button" onClick={() => startEdit(item)}>
                Изменить
              </GhostButton>
              <GhostButton
                type="button"
                className="border-[#f1cdcf] text-[#8c0f16] hover:border-[#8c0f16]"
                onClick={() => void remove(item.id)}
              >
                Удалить
              </GhostButton>
            </div>
          </Card>
        ))}
      </div>
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Новая категория"
        footer={<PrimaryButton onClick={create}>Создать</PrimaryButton>}
      >
        <div className="grid gap-3">
          <input
            className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm"
            placeholder="Название RU"
            value={form.nameRu}
            onChange={(event) => setForm((prev) => ({ ...prev, nameRu: event.target.value }))}
          />
          <input
            className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm"
            placeholder="Название UZ"
            value={form.nameUz}
            onChange={(event) => setForm((prev) => ({ ...prev, nameUz: event.target.value }))}
          />
          <ImageCropUpload
            aspect={99 / 92}
            minWidth={792}
            minHeight={736}
            outputWidth={1080}
            outputHeight={1000}
            hint="Категория: 99:92, минимум 792x736, рекомендуемо 1080x1000"
            onUploaded={(url) => setForm((prev) => ({ ...prev, imageUrl: url }))}
          />
          {form.imageUrl ? (
            <Image src={form.imageUrl} alt="preview" width={480} height={240} unoptimized className="h-32 w-full rounded-2xl object-cover" />
          ) : null}
        </div>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Изменить категорию"
        footer={<PrimaryButton onClick={update}>Сохранить</PrimaryButton>}
      >
        <div className="grid gap-3">
          <input
            className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm"
            placeholder="Название RU"
            value={form.nameRu}
            onChange={(event) => setForm((prev) => ({ ...prev, nameRu: event.target.value }))}
          />
          <input
            className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm"
            placeholder="Название UZ"
            value={form.nameUz}
            onChange={(event) => setForm((prev) => ({ ...prev, nameUz: event.target.value }))}
          />
          <ImageCropUpload
            aspect={99 / 92}
            minWidth={792}
            minHeight={736}
            outputWidth={1080}
            outputHeight={1000}
            hint="Категория: 99:92, минимум 792x736, рекомендуемо 1080x1000"
            onUploaded={(url) => setForm((prev) => ({ ...prev, imageUrl: url }))}
          />
          {form.imageUrl ? (
            <Image src={form.imageUrl} alt="preview-edit" width={480} height={240} unoptimized className="h-32 w-full rounded-2xl object-cover" />
          ) : null}
        </div>
      </Modal>
    </div>
  );
}


