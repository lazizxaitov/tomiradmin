import { requireCashier } from "@/app/lib/auth";

export default async function CashierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCashier();
  return <>{children}</>;
}
