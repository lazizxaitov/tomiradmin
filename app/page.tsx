import { redirect } from "next/navigation";

import { requireAdmin } from "@/app/lib/auth";

export default async function Home() {
  await requireAdmin();
  redirect("/admin");
}
