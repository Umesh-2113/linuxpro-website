import { NextResponse } from "next/server";
import {
  dbConfirmWalletTopup,
  dbGetWalletBalance,
  dbGetWalletTransactions,
  dbGetWalletTopupById,
} from "@/lib/db/wallet";
import { requireClientSession } from "@/lib/server-session";

export async function POST(req: Request) {
  try {
    const auth = await requireClientSession();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const topupId = String(body.topupId ?? "");
    const cashfreeStatus = String(body.cashfreeStatus ?? "PAID");

    if (!topupId) {
      return NextResponse.json({ error: "topupId is required." }, { status: 400 });
    }

    const topup = await dbGetWalletTopupById(topupId);
    if (!topup) {
      return NextResponse.json({ error: "Top-up not found." }, { status: 404 });
    }

    if (topup.userEmail !== auth.email) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const result = await dbConfirmWalletTopup(topupId, cashfreeStatus);
    if (!result) {
      return NextResponse.json({ error: "Top-up not found." }, { status: 404 });
    }

    const transactions = await dbGetWalletTransactions(auth.email);
    return NextResponse.json({
      balance: result.balance,
      transactions,
      topup: result.topup,
    });
  } catch (error) {
    console.error("[API wallet topup confirm]", error);
    return NextResponse.json({ error: "Failed to confirm top-up." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const auth = await requireClientSession();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const topupId = searchParams.get("topup_id");
    if (!topupId) {
      return NextResponse.json({ error: "topup_id is required." }, { status: 400 });
    }

    const topup = await dbGetWalletTopupById(topupId);
    if (!topup || topup.userEmail !== auth.email) {
      return NextResponse.json({ error: "Top-up not found." }, { status: 404 });
    }

    const balance = await dbGetWalletBalance(auth.email);
    return NextResponse.json({ topup, balance });
  } catch (error) {
    console.error("[API wallet topup GET]", error);
    return NextResponse.json({ error: "Failed to load top-up." }, { status: 500 });
  }
}
