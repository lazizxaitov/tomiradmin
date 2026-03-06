"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { Card, GhostButton, Modal, PrimaryButton, SectionTitle } from "../_components/ui";

type Product = {
  id: number;
  category_id: number | null;
  title_ru: string;
  title_uz: string;
  description_text_ru: string | null;
  description_text_uz: string | null;
  price: number;
  stock: number;
  images?: string[];
};
type Category = { id: number; name_ru: string };

const initialForm = {
  titleRu: "",
  titleUz: "",
  descriptionTextRu: "",
  descriptionTextUz: "",
  categoryId: "",
  price: "",
  stock: "",
  imageUrlDraft: "",
  images: [] as string[],
};

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState(initialForm);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    Promise.all([fetch("/api/products"), fetch("/api/categories")]).then(async ([productsRes, categoriesRes]) => {
      const productsData = await productsRes.json();
      const categoriesData = await categoriesRes.json();
      setItems(productsData.items ?? []);
      setCategories(categoriesData.items ?? []);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.title_ru, item.title_uz, item.description_text_ru ?? "", item.description_text_uz ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [items, search]);

  const resetForm = () => setForm(initialForm);

  const create = async () => {
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titleRu: form.titleRu,
        titleUz: form.titleUz,
        descriptionTextRu: form.descriptionTextRu,
        descriptionTextUz: form.descriptionTextUz,
        categoryId: Number(form.categoryId),
        price: Number(form.price),
        stock: Number(form.stock),
        images: form.images,
      }),
    });
    setCreateOpen(false);
    resetForm();
    load();
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      titleRu: product.title_ru,
      titleUz: product.title_uz,
      descriptionTextRu: product.description_text_ru ?? "",
      descriptionTextUz: product.description_text_uz ?? "",
      categoryId: product.category_id ? String(product.category_id) : "",
      price: String(product.price ?? 0),
      stock: String(product.stock ?? 0),
      imageUrlDraft: "",
      images: product.images ?? [],
    });
    setEditOpen(true);
  };

  const update = async () => {
    if (!editingId) return;
    await fetch(`/api/products/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titleRu: form.titleRu,
        titleUz: form.titleUz,
        descriptionTextRu: form.descriptionTextRu,
        descriptionTextUz: form.descriptionTextUz,
        categoryId: Number(form.categoryId),
        price: Number(form.price),
        stock: Number(form.stock),
        images: form.images,
      }),
    });
    setEditOpen(false);
    setEditingId(null);
    resetForm();
    load();
  };

  const remove = async (id: number) => {
    if (!window.confirm("Удалить товар? Это действие нельзя отменить.")) return;
    const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      alert(data?.error ?? "Не удалось удалить товар");
      return;
    }
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
    setForm((prev) => ({ ...prev, images: [...prev.images, data.url] }));
  };

  const addImageUrl = () => {
    const url = form.imageUrlDraft.trim();
    if (!url) return;
    setForm((prev) => ({ ...prev, images: [...prev.images, url], imageUrlDraft: "" }));
  };

  const removeImage = (index: number) => {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, idx) => idx !== index) }));
  };

  const formBody = (
    <div className="grid gap-3">
      <input className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm" placeholder="Название RU" value={form.titleRu} onChange={(event) => setForm((prev) => ({ ...prev, titleRu: event.target.value }))} />
      <input className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm" placeholder="Название UZ" value={form.titleUz} onChange={(event) => setForm((prev) => ({ ...prev, titleUz: event.target.value }))} />
      <textarea className="min-h-24 rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm" placeholder="Описание RU" value={form.descriptionTextRu} onChange={(event) => setForm((prev) => ({ ...prev, descriptionTextRu: event.target.value }))} />
      <textarea className="min-h-24 rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm" placeholder="Описание UZ" value={form.descriptionTextUz} onChange={(event) => setForm((prev) => ({ ...prev, descriptionTextUz: event.target.value }))} />
      <select className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm" value={form.categoryId} onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}>
        <option value="">Категория</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name_ru}
          </option>
        ))}
      </select>
      <input className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm" placeholder="Цена" value={form.price} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} />
      <input className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm" placeholder="Остаток" value={form.stock} onChange={(event) => setForm((prev) => ({ ...prev, stock: event.target.value }))} />

      <div className="grid gap-2 rounded-2xl border border-[#ead8d1] p-3">
        <p className="text-sm font-semibold text-[#3c2828]">Картинки товара</p>
        <div className="flex gap-2">
          <input
            className="w-full rounded-xl border border-[#ead8d1] px-3 py-2 text-sm"
            placeholder="URL картинки"
            value={form.imageUrlDraft}
            onChange={(event) => setForm((prev) => ({ ...prev, imageUrlDraft: event.target.value }))}
          />
          <GhostButton onClick={addImageUrl} type="button">Добавить URL</GhostButton>
        </div>
        <input
          type="file"
          accept="image/*"
          className="rounded-xl border border-[#ead8d1] bg-white px-3 py-2 text-sm"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void uploadImage(file);
            event.currentTarget.value = "";
          }}
        />
        {uploading ? <p className="text-xs text-[#8d7374]">Загрузка картинки...</p> : null}
        {form.images.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {form.images.map((url, index) => (
              <div key={`${url}-${index}`} className="rounded-xl border border-[#ead8d1] p-2">
                <Image src={url} alt={`product-${index}`} width={280} height={180} className="h-24 w-full rounded-lg object-cover" />
                <button type="button" className="mt-2 text-xs font-semibold text-[#8c0f16]" onClick={() => removeImage(index)}>
                  Удалить
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <SectionTitle title="Товары" subtitle="Список товаров" />
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <input
          className="w-full max-w-md rounded-2xl border border-[#dce4ec] bg-white px-4 py-2 text-sm"
          placeholder="Поиск по товарам"
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
            {item.images?.[0] ? (
              <Image src={item.images[0]} alt={item.title_ru} width={520} height={280} className="mb-3 h-36 w-full rounded-2xl object-cover" />
            ) : null}
            <p className="text-base font-bold text-[#3c2828]">{item.title_ru}</p>
            <p className="text-sm text-[#8d7374]">{item.title_uz}</p>
            {item.description_text_ru ? <p className="mt-2 text-sm text-[#6b5253]">{item.description_text_ru}</p> : null}
            <p className="mt-2 text-sm text-[#8d7374]">{item.price.toLocaleString("ru-RU")} сум · Остаток: {item.stock}</p>
            <div className="mt-3 flex gap-2">
              <GhostButton type="button" onClick={() => startEdit(item)}>Изменить</GhostButton>
              <GhostButton type="button" className="border-[#f1cdcf] text-[#8c0f16] hover:border-[#8c0f16]" onClick={() => void remove(item.id)}>
                Удалить
              </GhostButton>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новый товар" footer={<PrimaryButton onClick={create}>Создать</PrimaryButton>}>
        {formBody}
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Изменить товар" footer={<PrimaryButton onClick={update}>Сохранить</PrimaryButton>}>
        {formBody}
      </Modal>
    </div>
  );
}

