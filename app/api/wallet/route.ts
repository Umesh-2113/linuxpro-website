import { NextResponse } from "next/server";
import {
  dbGetWalletBalance,
  dbGetWalletTransactions,
} from "@/lib/db/wallet";
import { requireClientSession } from "@/lib/server-session";

export async function GET() {
  try {
    const auth = await requireClientSession();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const [balance, transactions] = await Promise.all([
      dbGetWalletBalance(auth.email),
      dbGetWalletTransactions(auth.email),
    ]);

    return NextResponse.json({ balance, transactions });
  } catch (error) {
    console.error("[API wallet GET]", error);
    return NextResponse.json({ error: "Failed to load wallet." }, { status: 500 });
  }
}
