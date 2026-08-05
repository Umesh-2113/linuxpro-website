import { NextResponse } from "next/server";
import { dbDeleteTicket, dbGetTicketById, dbUpdateTicket } from "@/lib/db/tickets";
import { isAdminApiRequest, requireClientSession } from "@/lib/server-session";

type Params = { params: Promise<{ id: string }> };

async function assertTicketAccess(ticketId: string) {
  const ticket = await dbGetTicketById(ticketId);
  if (!ticket) {
    return { ok: false as const, status: 404, error: "Ticket not found." };
  }
  if (await isAdminApiRequest()) {
    return { ok: true as const, ticket, isAdmin: true as const };
  }
  const auth = await requireClientSession(ticket.userEmail);
  if (!auth.ok) {
    return { ok: false as const, status: auth.status, error: auth.error };
  }
  return { ok: true as const, ticket, isAdmin: false as const };
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const access = await assertTicketAccess(id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    return NextResponse.json(access.ticket);
  } catch (error) {
    console.error("[API tickets GET id]", error);
    return NextResponse.json({ error: "Failed to load ticket." }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const access = await assertTicketAccess(id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const body = await req.json();

    if (!access.isAdmin) {
      return NextResponse.json(
        { error: "Use the reply endpoint to message support." },
        { status: 403 }
      );
    }

    const ticket = await dbUpdateTicket(id, body);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }
    return NextResponse.json(ticket);
  } catch (error) {
    console.error("[API tickets PATCH]", error);
    return NextResponse.json({ error: "Failed to update ticket." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    if (!(await isAdminApiRequest())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const { id } = await params;
    const ticket = await dbGetTicketById(id);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }
    await dbDeleteTicket(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API tickets DELETE]", error);
    return NextResponse.json({ error: "Failed to delete ticket." }, { status: 500 });
  }
}
