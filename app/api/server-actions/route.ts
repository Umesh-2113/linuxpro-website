import { NextResponse } from "next/server";
import {
  dbCreateServerAction,
  dbGetActionsByUser,
  dbGetServerActions,
} from "@/lib/db/server-actions";
import { requireClientSession, requireDataAccess } from "@/lib/server-session";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const auth = await requireDataAccess(email);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (auth.isAdmin && !email) {
      return NextResponse.json(await dbGetServerActions());
    }

    const actions = await dbGetActionsByUser(email || auth.email);
    return NextResponse.json(actions);
  } catch (error) {
    console.error("[API server-actions GET]", error);
    return NextResponse.json({ error: "Failed to load server actions." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireClientSession();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const action = await dbCreateServerAction({
      ...body,
      userEmail: auth.email,
      userName: body.userName || auth.email.split("@")[0],
    });

    return NextResponse.json(action, { status: 201 });
  } catch (error) {
    console.error("[API server-actions POST]", error);
    return NextResponse.json({ error: "Failed to create server action." }, { status: 500 });
  }
}
