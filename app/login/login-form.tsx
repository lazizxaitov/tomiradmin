"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"admin" | "cashier">("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch(mode === "admin" ? "/api/auth/login" : "/api/auth/cashier-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      setError("Неверный логин или пароль.");
      setLoading(false);
      return;
    }

    router.push(mode === "admin" ? "/admin" : "/cashier");
    router.refresh();
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl border border-white/20 bg-[#f7f3f1] p-6 shadow-2xl"
    >
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-[#efe4df] p-1">
        <button
          type="button"
          onClick={() => setMode("admin")}
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${
            mode === "admin" ? "bg-white text-[#8c0f16]" : "text-[#8d7374]"
          }`}
        >
          Админ
        </button>
        <button
          type="button"
          onClick={() => setMode("cashier")}
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${
            mode === "cashier" ? "bg-white text-[#8c0f16]" : "text-[#8d7374]"
          }`}
        >
          Tomir Касса
        </button>
      </div>

      <label className="mb-4 block text-sm font-semibold text-[#3c2828]">
        Логин
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-[#ead8d1] bg-white px-4 py-3 text-base font-medium text-[#3c2828] focus:border-[#8c0f16] focus:outline-none"
          placeholder="Введите логин"
        />
      </label>

      <label className="mb-5 block text-sm font-semibold text-[#3c2828]">
        Пароль
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          className="mt-2 w-full rounded-2xl border border-[#ead8d1] bg-white px-4 py-3 text-base font-medium text-[#3c2828] focus:border-[#8c0f16] focus:outline-none"
          placeholder="Введите пароль"
        />
      </label>
      {mode === "cashier" ? (
        <p className="mb-4 text-xs text-[#8d7374]">
          Доступ касс создается в админке в блоке `Кассы / Аккаунты`.
        </p>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-[#8c0f16] px-5 py-3 text-base font-bold text-white transition hover:bg-[#741018] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Входим..." : "Войти"}
      </button>
    </form>
  );
}

