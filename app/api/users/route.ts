import { NextResponse } from "next/server";
import { dbGetUsers } from "@/lib/db/users";

export async function GET() {
  try {
    const users = await dbGetUsers();
    return NextResponse.json(
      users.map(({ passwordHash: _passwordHash, ...user }) => user)
    );
  } catch (error) {
    console.error("[API users GET]", error);
    return NextResponse.json({ error: "Failed to load users." }, { status: 500 });
  }
}
