import { fetchOrders } from "@/lib/orders";
import { fetchWallet } from "@/lib/wallet";
import { fetchServerActions } from "@/lib/server-actions";
import { fetchStock } from "@/lib/stock";
import { fetchServers } from "@/lib/user-servers";
import { fetchTickets } from "@/lib/tickets";
import { fetchUsers } from "@/lib/users";

export async function bootstrapClientData(email?: string): Promise<void> {
  await Promise.all([
    fetchStock(),
    fetchOrders(email),
    fetchWallet(),
    fetchServers(email),
    fetchTickets(email),
    fetchServerActions(email),
  ]);
}

export async function bootstrapAdminData(): Promise<void> {
  await Promise.all([
    fetchStock(),
    fetchOrders(),
    fetchServers(),
    fetchTickets(),
    fetchServerActions(),
    fetchUsers(),
  ]);
}
