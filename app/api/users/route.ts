import { NextResponse } from "next/server";
import { dbGetUsers } from "@/lib/db/users";
import { isAdminApiRequest } from "@/lib/server-session";

export async function GET() {
  try {
    if (!(await isAdminApiRequest())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const users = await dbGetUsers();
    return NextResponse.json(
      users.map(({ passwordHash: _passwordHash, ...user }) => user)
    );
  } catch (error) {
    console.error("[API users GET]", error);
    return NextResponse.json({ error: "Failed to load users." }, { status: 500 });
  }
}
