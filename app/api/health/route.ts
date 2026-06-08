import { NextResponse } from "next/server";
import { getDb, getDbMode } from "@/lib/mongodb";

export async function GET() {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    const users = await db.collection("users").countDocuments();
    const mode = getDbMode();

    return NextResponse.json({
      ok: true,
      database: mode === "local" ? "local-file" : "mongodb-atlas",
      users,
      message:
        mode === "local"
          ? "Using local file DB. Add your IP in MongoDB Atlas Network Access to use cloud database."
          : "Connected to MongoDB Atlas.",
    });
  } catch (error) {
    console.error("[API health]", error);
    return NextResponse.json(
      {
        ok: false,
        database: "disconnected",
        error:
          "Database unavailable. In MongoDB Atlas: enable Network Access for your IP (0.0.0.0/0 for dev) and ensure the cluster is running.",
      },
      { status: 503 }
    );
  }
}
