import { NextResponse } from "next/server";
import { dbAdminAdjustWallet } from "@/lib/db/wallet";
import { isAdminApiRequest } from "@/lib/server-session";

export async function POST(req: Request) {
  try {
    if (!(await isAdminApiRequest())) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const type = body.type === "debit" ? "debit" : "credit";
    const amount = Math.round(Number(body.amount));
    const note = String(body.note ?? "").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid user email is required." }, { status: 400 });
    }

    if (!Number.isFinite(amount) || amount < 1) {
      return NextResponse.json({ error: "Amount must be at least ₹1." }, { status: 400 });
    }

    if (amount > 500000) {
      return NextResponse.json(
        { error: "Maximum adjustment is ₹5,00,000 per action." },
        { status: 400 }
      );
    }

    const result = await dbAdminAdjustWallet({
      userEmail: email,
      type,
      amount,
      note: note || "Manual adjustment by admin",
    });

    return NextResponse.json({
      success: true,
      email,
      balance: result.balance,
      transaction: result.transaction,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Wallet adjustment failed.";
    console.error("[API admin wallet adjust]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
