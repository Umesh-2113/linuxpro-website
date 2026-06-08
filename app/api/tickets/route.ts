import { NextResponse } from "next/server";
import { dbCreateTicket, dbGetTickets, dbGetTicketsByUser } from "@/lib/db/tickets";
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
      return NextResponse.json(await dbGetTickets());
    }

    const tickets = await dbGetTicketsByUser(email || auth.email);
    return NextResponse.json(tickets);
  } catch (error) {
    console.error("[API tickets GET]", error);
    return NextResponse.json({ error: "Failed to load tickets." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireClientSession();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const ticket = await dbCreateTicket({
      subject: String(body.subject ?? ""),
      message: String(body.message ?? ""),
      userName: String(body.userName ?? auth.email.split("@")[0]),
      userEmail: auth.email,
      priority: body.priority ?? "medium",
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error("[API tickets POST]", error);
    return NextResponse.json({ error: "Failed to create ticket." }, { status: 500 });
  }
}
