"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { GhostButton } from "./ui";

const navItems = [
  { href: "/admin/categories", label: "Категории" },
  { href: "/admin/products", label: "Товары" },
  { href: "/admin/branches", label: "Заведения" },
  { href: "/admin/banners", label: "Баннеры" },
  { href: "/admin/cashiers", label: "Кассы" },
  { href: "/admin/stocks", label: "Остатки" },
  { href: "/admin/couriers", label: "Доставщики" },
  { href: "/admin/clients", label: "Клиенты" },
  { href: "/admin/all-orders", label: "Заказы" },
  { href: "/admin/orders", label: "Аналитика заказов" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  return (
    <div className="tomir-admin min-h-screen pb-8">
      <header className="tomir-admin-head sticky top-0 z-20 border-b border-[#dbe4ed] backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="rounded-2xl border border-[#d9e3ec] bg-white px-4 py-2 text-[#1f2a37] shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#738397]">Tomir</p>
                <h1 className="text-lg font-bold leading-tight text-[#1f2a37]">Админ-панель</h1>
              </div>
              <Link
                href="/admin"
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  pathname === "/admin"
                    ? "border-[#8c0f16] bg-[#8c0f16] text-white"
                    : "border-[#d6e0ea] bg-white text-[#243447] hover:bg-[#f3f7fb]"
                }`}
              >
                Главная
              </Link>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="rounded-xl border border-[#d6e0ea] bg-white px-3 py-2 text-sm font-semibold text-[#243447] transition hover:bg-[#f3f7fb]"
                >
                  Меню
                </button>

                {menuOpen ? (
                  <div className="absolute left-0 top-full z-30 mt-2 w-56 rounded-2xl border border-[#e7d7d1] bg-white p-2 shadow-2xl">
                    <nav className="grid gap-1">
                      {navItems.map((item) => {
                        const active = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMenuOpen(false)}
                            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                              active
                                ? "bg-[#8c0f16] text-white"
                                : "text-[#2b3a4d] hover:bg-[#f3f7fb]"
                            }`}
                          >
                            {item.label}
                          </Link>
                        );
                      })}
                    </nav>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/settings"
                className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                  pathname === "/admin/settings"
                    ? "border-[#8c0f16] bg-[#8c0f16] text-white"
                    : "border-[#e3d3cd] bg-white text-[#3c2828] hover:border-[#8c0f16]"
                }`}
              >
                Настройки
              </Link>
              <GhostButton onClick={logout}>Выйти</GhostButton>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 pt-6">
        <main>{children}</main>
      </div>
    </div>
  );
}
