import { NextResponse } from "next/server";
import { dbRegisterWithEmail } from "@/lib/db/users";
import { isMongoConnectionError } from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await dbRegisterWithEmail(
      String(body.name ?? ""),
      String(body.email ?? ""),
      String(body.password ?? "")
    );
    if (!result.user) {
      return NextResponse.json({ error: result.error ?? "Registration failed." }, { status: 400 });
    }
    const { passwordHash: _passwordHash, ...user } = result.user;
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("[API users register]", error);
    if (isMongoConnectionError(error)) {
      const devHint =
        process.env.USE_LOCAL_DB_FALLBACK === "true"
          ? " Restart the dev server (npm run dev) so the local database fallback can activate."
          : "";
      return NextResponse.json(
        {
          error:
            `Cannot connect to MongoDB Atlas. In Atlas → Network Access, add your IP (or 0.0.0.0/0 for development) and ensure the cluster is running.${devHint}`,
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
