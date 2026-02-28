import { redirect } from "next/navigation";

import { getCashierSession, getSession } from "@/app/lib/auth";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  const cashier = await getCashierSession();
  if (session?.r === "admin") {
    redirect("/admin");
  }
  if (cashier?.r === "cashier") {
    redirect("/cashier");
  }

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
        <div className="mb-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#738397]">Tomir</p>
          <h1 className="mt-2 text-4xl font-semibold text-[#1f2a37]">Admin Login</h1>
          <p className="mt-2 text-sm text-[#617084]">Вход в админ-панель магазина</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
