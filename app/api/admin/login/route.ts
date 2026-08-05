import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  createAdminSessionToken,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "");
    const password = String(body.password ?? "");

    if (!verifyAdminPassword(email, password)) {
      return NextResponse.json({ error: "Invalid admin credentials." }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(
      ADMIN_SESSION_COOKIE,
      createAdminSessionToken(),
      adminSessionCookieOptions()
    );
    return res;
  } catch (error) {
    console.error("[API admin login]", error);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
