import { NextResponse } from "next/server";
import { dbAddTicketReply, dbGetTicketById } from "@/lib/db/tickets";
import { isAdminApiRequest, requireClientSession } from "@/lib/server-session";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const ticket = await dbGetTicketById(id);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    const body = await req.json();
    const isAdmin = await isAdminApiRequest();

    if (!isAdmin) {
      const auth = await requireClientSession(ticket.userEmail);
      if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }
      if (body.author === "admin") {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
    }

    const updated = await dbAddTicketReply(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[API tickets reply]", error);
    return NextResponse.json({ error: "Failed to add reply." }, { status: 500 });
  }
}
