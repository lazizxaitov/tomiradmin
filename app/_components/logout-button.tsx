"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onLogout = async () => {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={loading}
      className="rounded-xl border border-[#d6e0ea] bg-white px-3 py-2 text-xs font-semibold text-[#243447] transition hover:bg-[#f3f7fb] disabled:opacity-60"
    >
      {loading ? "Выход..." : "Выйти"}
    </button>
  );
}
