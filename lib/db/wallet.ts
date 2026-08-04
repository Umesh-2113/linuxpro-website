import { getCollection } from "@/lib/mongodb";

export type WalletTopupStatus = "pending" | "completed" | "failed";

export type WalletTopup = {
  id: string;
  userEmail: string;
  amount: number;
  status: WalletTopupStatus;
  cashfreeOrderStatus: string;
  createdAt: string;
  updatedAt: string;
};

export type WalletTransactionType = "credit" | "debit";

export type WalletTransaction = {
  id: string;
  userEmail: string;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  refId?: string;
  createdAt: string;
};

type WalletAccount = {
  email: string;
  balance: number;
  updatedAt: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function accountsCollection() {
  return getCollection<WalletAccount>("wallet_accounts");
}

async function topupsCollection() {
  return getCollection<WalletTopup>("wallet_topups");
}

async function transactionsCollection() {
  return getCollection<WalletTransaction>("wallet_transactions");
}

export async function dbGetWalletBalance(email: string): Promise<number> {
  const normalized = normalizeEmail(email);
  const account = await (await accountsCollection()).findOne({ email: normalized });
  return account?.balance ?? 0;
}

export async function dbGetWalletTransactions(
  email: string,
  limit = 50
): Promise<WalletTransaction[]> {
  const normalized = normalizeEmail(email);
  const rows = await (await transactionsCollection())
    .find({ userEmail: normalized })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return rows;
}

export async function dbGetWalletTopupById(id: string): Promise<WalletTopup | null> {
  return (await topupsCollection()).findOne({ id });
}

export async function dbCreateWalletTopup(data: {
  userEmail: string;
  amount: number;
}): Promise<WalletTopup> {
  const now = new Date().toISOString();
  const topup: WalletTopup = {
    id: `WALLET-${Date.now()}`,
    userEmail: normalizeEmail(data.userEmail),
    amount: data.amount,
    status: "pending",
    cashfreeOrderStatus: "",
    createdAt: now,
    updatedAt: now,
  };
  await (await topupsCollection()).insertOne(topup);
  return topup;
}

async function ensureAccount(email: string): Promise<WalletAccount> {
  const normalized = normalizeEmail(email);
  const col = await accountsCollection();
  const existing = await col.findOne({ email: normalized });
  if (existing) return existing;

  const account: WalletAccount = {
    email: normalized,
    balance: 0,
    updatedAt: new Date().toISOString(),
  };
  await col.insertOne(account);
  return account;
}

async function recordTransaction(data: {
  userEmail: string;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  refId?: string;
}): Promise<WalletTransaction> {
  const tx: WalletTransaction = {
    id: `WTX-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userEmail: normalizeEmail(data.userEmail),
    type: data.type,
    amount: data.amount,
    balanceAfter: data.balanceAfter,
    description: data.description,
    refId: data.refId,
    createdAt: new Date().toISOString(),
  };
  await (await transactionsCollection()).insertOne(tx);
  return tx;
}

export async function dbCreditWallet(data: {
  userEmail: string;
  amount: number;
  description: string;
  refId?: string;
}): Promise<{ balance: number; transaction: WalletTransaction }> {
  if (data.amount <= 0) {
    throw new Error("Credit amount must be positive.");
  }

  const normalized = normalizeEmail(data.userEmail);
  await ensureAccount(normalized);

  const updated = await (await accountsCollection()).findOneAndUpdate(
    { email: normalized },
    {
      $inc: { balance: data.amount },
      $set: { updatedAt: new Date().toISOString() },
    },
    { returnDocument: "after" }
  );

  const balance = updated?.balance ?? data.amount;
  const transaction = await recordTransaction({
    userEmail: normalized,
    type: "credit",
    amount: data.amount,
    balanceAfter: balance,
    description: data.description,
    refId: data.refId,
  });

  return { balance, transaction };
}

export async function dbDebitWallet(data: {
  userEmail: string;
  amount: number;
  description: string;
  refId?: string;
}): Promise<{ balance: number; transaction: WalletTransaction }> {
  if (data.amount <= 0) {
    throw new Error("Debit amount must be positive.");
  }

  const normalized = normalizeEmail(data.userEmail);
  await ensureAccount(normalized);

  const updated = await (await accountsCollection()).findOneAndUpdate(
    { email: normalized, balance: { $gte: data.amount } },
    {
      $inc: { balance: -data.amount },
      $set: { updatedAt: new Date().toISOString() },
    },
    { returnDocument: "after" }
  );

  if (!updated) {
    throw new Error("Insufficient wallet balance.");
  }

  const transaction = await recordTransaction({
    userEmail: normalized,
    type: "debit",
    amount: data.amount,
    balanceAfter: updated.balance,
    description: data.description,
    refId: data.refId,
  });

  return { balance: updated.balance, transaction };
}

export async function dbConfirmWalletTopup(
  topupId: string,
  cashfreeStatus: string
): Promise<{ topup: WalletTopup; balance: number } | null> {
  const col = await topupsCollection();
  const topup = await col.findOne({ id: topupId });
  if (!topup) return null;

  if (topup.status === "completed") {
    const balance = await dbGetWalletBalance(topup.userEmail);
    return { topup, balance };
  }

  const now = new Date().toISOString();
  await col.updateOne(
    { id: topupId },
    { $set: { status: "completed", cashfreeOrderStatus: cashfreeStatus, updatedAt: now } }
  );

  const { balance } = await dbCreditWallet({
    userEmail: topup.userEmail,
    amount: topup.amount,
    description: `Wallet top-up via Cashfree`,
    refId: topupId,
  });

  const updatedTopup = await col.findOne({ id: topupId });
  return { topup: updatedTopup!, balance };
}

export type WalletAccountSummary = {
  email: string;
  balance: number;
  updatedAt: string;
};

export async function dbGetAllWalletAccounts(): Promise<WalletAccountSummary[]> {
  return (await accountsCollection()).find({}).sort({ balance: -1 }).toArray();
}

export async function dbGetAllWalletTransactions(
  limit = 100
): Promise<WalletTransaction[]> {
  return (await transactionsCollection())
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function dbGetWalletOverview(limit = 100) {
  const accounts = await dbGetAllWalletAccounts();
  const transactions = await dbGetAllWalletTransactions(limit);
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  return {
    accounts,
    transactions,
    totalBalance,
    accountCount: accounts.length,
  };
}

export async function dbAdminAdjustWallet(data: {
  userEmail: string;
  type: WalletTransactionType;
  amount: number;
  note: string;
}): Promise<{ balance: number; transaction: WalletTransaction }> {
  const note = data.note.trim() || "Admin adjustment";
  const description =
    data.type === "credit" ? `Admin credit: ${note}` : `Admin debit: ${note}`;

  if (data.type === "credit") {
    return dbCreditWallet({
      userEmail: data.userEmail,
      amount: data.amount,
      description,
      refId: "ADMIN",
    });
  }

  return dbDebitWallet({
    userEmail: data.userEmail,
    amount: data.amount,
    description,
    refId: "ADMIN",
  });
}
