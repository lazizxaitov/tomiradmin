"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import ImageCropUpload from "../_components/image-crop-upload";
import { Card, GhostButton, Modal, PrimaryButton, SectionTitle } from "../_components/ui";

type Product = {
  id: number;
  category_id: number | null;
  title_ru: string;
  title_uz: string;
  description_text_ru: string | null;
  description_text_uz: string | null;
  price: number;
  discounted_price?: number;
  discount_percent?: number;
  is_top?: 0 | 1;
  is_promo?: 0 | 1;
  old_price?: number | null;
  promo_price?: number | null;
  stock: number;
  images?: string[];
};
type Category = { id: number; name_ru: string };
type ProductCropMode = "square" | "detail45" | "detail34";

const productCropPresets: Record<
  ProductCropMode,
  {
    label: string;
    aspect: number;
    minWidth: number;
    minHeight: number;
    outputWidth: number;
    outputHeight: number;
    hint: string;
  }
> = {
  square: {
    label: "Карточки/корзина (1:1)",
    aspect: 1,
    minWidth: 800,
    minHeight: 800,
    outputWidth: 1200,
    outputHeight: 1200,
    hint: "Товар: 1:1, минимум 800x800, рекомендуемо 1200x1200",
  },
  detail45: {
    label: "Большой экран (4:5)",
    aspect: 4 / 5,
    minWidth: 800,
    minHeight: 1000,
    outputWidth: 1200,
    outputHeight: 1500,
    hint: "Detail: 4:5, минимум 800x1000, рекомендуемо 1200x1500",
  },
  detail34: {
    label: "Большой экран (3:4)",
    aspect: 3 / 4,
    minWidth: 810,
    minHeight: 1080,
    outputWidth: 1080,
    outputHeight: 1440,
    hint: "Detail: 3:4, минимум 810x1080, рекомендуемо 1080x1440",
  },
};

const initialForm = {
  titleRu: "",
  titleUz: "",
  descriptionTextRu: "",
  descriptionTextUz: "",
  categoryId: "",
  price: "",
  isTop: false,
  isPromo: false,
  oldPrice: "",
  promoPrice: "",
  stock: "",
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
  const [cropMode, setCropMode] = useState<ProductCropMode>("square");

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
        isTop: form.isTop,
        isPromo: form.isPromo,
        oldPrice: form.isPromo ? Number(form.oldPrice) : null,
        promoPrice: form.isPromo ? Number(form.promoPrice) : null,
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
      isTop: product.is_top === 1,
      isPromo: product.is_promo === 1,
      oldPrice: product.old_price ? String(product.old_price) : "",
      promoPrice: product.promo_price ? String(product.promo_price) : "",
      stock: String(product.stock ?? 0),
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
        isTop: form.isTop,
        isPromo: form.isPromo,
        oldPrice: form.isPromo ? Number(form.oldPrice) : null,
        promoPrice: form.isPromo ? Number(form.promoPrice) : null,
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
      <label className="flex items-center gap-2 text-sm text-[#5b4647]">
        <input type="checkbox" checked={form.isTop} onChange={(event) => setForm((prev) => ({ ...prev, isTop: event.target.checked }))} />
        Топ товар
      </label>
      <label className="flex items-center gap-2 text-sm text-[#5b4647]">
        <input
          type="checkbox"
          checked={form.isPromo}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              isPromo: event.target.checked,
              oldPrice: event.target.checked ? prev.oldPrice : "",
              promoPrice: event.target.checked ? prev.promoPrice : "",
            }))
          }
        />
        Товар в скидке
      </label>
      {form.isPromo ? (
        <>
          <input
            className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm"
            placeholder="Старая цена"
            value={form.oldPrice}
            onChange={(event) => setForm((prev) => ({ ...prev, oldPrice: event.target.value }))}
          />
          <input
            className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm"
            placeholder="Цена со скидкой"
            value={form.promoPrice}
            onChange={(event) => setForm((prev) => ({ ...prev, promoPrice: event.target.value }))}
          />
        </>
      ) : null}
      <input className="rounded-2xl border border-[#ead8d1] px-4 py-3 text-sm" placeholder="Остаток" value={form.stock} onChange={(event) => setForm((prev) => ({ ...prev, stock: event.target.value }))} />

      <div className="grid gap-2 rounded-2xl border border-[#ead8d1] p-3">
        <p className="text-sm font-semibold text-[#3c2828]">Картинки товара</p>
        <select
          className="rounded-xl border border-[#ead8d1] px-3 py-2 text-sm"
          value={cropMode}
          onChange={(event) => setCropMode(event.target.value as ProductCropMode)}
        >
          {Object.entries(productCropPresets).map(([key, preset]) => (
            <option key={key} value={key}>
              {preset.label}
            </option>
          ))}
        </select>
        <ImageCropUpload
          aspect={productCropPresets[cropMode].aspect}
          minWidth={productCropPresets[cropMode].minWidth}
          minHeight={productCropPresets[cropMode].minHeight}
          outputWidth={productCropPresets[cropMode].outputWidth}
          outputHeight={productCropPresets[cropMode].outputHeight}
          hint={productCropPresets[cropMode].hint}
          onUploaded={(url) => setForm((prev) => ({ ...prev, images: [...prev.images, url] }))}
        />
        {form.images.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {form.images.map((url, index) => (
              <div key={`${url}-${index}`} className="rounded-xl border border-[#ead8d1] p-2">
                <Image src={url} alt={`product-${index}`} width={280} height={180} unoptimized className="h-24 w-full rounded-lg object-cover" />
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
      <div className="grid gap-3">
        {filteredItems.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              {item.images?.[0] ? (
                <Image
                  src={item.images[0]}
                  alt={item.title_ru}
                  width={84}
                  height={84}
                  unoptimized
                  className="h-[72px] w-[72px] rounded-xl object-cover"
                />
              ) : (
                <div className="h-[72px] w-[72px] rounded-xl border border-[#ead8d1] bg-white" />
              )}
              <div className="min-w-[220px] flex-1">
                <p className="text-base font-bold text-[#3c2828]">{item.title_ru}</p>
                <p className="text-sm text-[#8d7374]">{item.title_uz}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {item.is_top === 1 ? (
                    <span className="rounded-full bg-[#8c0f16] px-2 py-1 text-xs font-bold text-white">
                      Топ
                    </span>
                  ) : null}
                  {item.is_promo === 1 && Number(item.promo_price ?? 0) > 0 ? (
                    <span className="rounded-full bg-[#6fb833] px-2 py-1 text-xs font-bold text-white">
                      Акция
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-[#8d7374]">
                  {item.is_promo === 1 && Number(item.old_price ?? 0) > 0 && Number(item.promo_price ?? 0) > 0 ? (
                    <>
                      <span className="line-through">{Number(item.old_price).toLocaleString("ru-RU")} сум</span>
                      {" -> "}
                      <span className="font-bold text-[#3c2828]">{Number(item.promo_price).toLocaleString("ru-RU")} сум</span>
                    </>
                  ) : (
                    <>{item.price.toLocaleString("ru-RU")} сум</>
                  )}
                  {" · "}Остаток: {item.stock}
                </p>
              </div>
              <div className="ml-auto flex gap-2">
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

