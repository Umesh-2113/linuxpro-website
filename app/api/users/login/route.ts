import { NextResponse } from "next/server";
import { dbLoginWithEmail } from "@/lib/db/users";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await dbLoginWithEmail(String(body.email ?? ""), String(body.password ?? ""));
    if (!result.user) {
      return NextResponse.json({ error: result.error ?? "Login failed." }, { status: 401 });
    }
    const { passwordHash: _passwordHash, ...user } = result.user;
    return NextResponse.json({ user });
  } catch (error) {
    console.error("[API users login]", error);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
