import { NextResponse } from "next/server";

import {
  buildCashierSessionCookie,
  createSessionToken,
  verifyCashierCredentials,
} from "@/app/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = body?.username?.toString() ?? "";
  const password = body?.password?.toString() ?? "";

  const account = verifyCashierCredentials(username, password);
  if (!account) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = createSessionToken(username, "cashier", account.branch_id);
  const response = NextResponse.json({
    ok: true,
    cashier: {
      id: account.id,
      displayName: account.display_name,
      branchId: account.branch_id,
    },
  });
  response.cookies.set(buildCashierSessionCookie(token));
  return response;
}
