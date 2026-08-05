import dns from "dns";
import { existsSync, writeFileSync, unlinkSync, mkdirSync } from "fs";
import path from "path";
import {
  MongoClient,
  type Collection,
  type Db,
  type Document,
  type MongoClientOptions,
} from "mongodb";
import { getLocalDb, isUsingLocalDb } from "@/lib/local-db";

dns.setDefaultResultOrder("ipv4first");

const DATA_DIR = path.join(process.cwd(), "data");
const MONGO_UNAVAILABLE_FILE = path.join(DATA_DIR, ".mongo-unavailable");

function getClientOptions(): MongoClientOptions {
  const fastFallback = shouldUseLocalFallback();
  const timeout = fastFallback ? 3000 : 8000;
  return {
    serverSelectionTimeoutMS: timeout,
    connectTimeoutMS: timeout,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    retryWrites: true,
    // Writes must hit primary — fixes NotWritablePrimary after Atlas failover.
    readPreference: "primary",
  };
}

let client: MongoClient | undefined;
let clientPromise: Promise<MongoClient> | undefined;
let mongoFailed = false;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _mongoFailed: boolean | undefined;
}

function resetClientPromise() {
  if (process.env.NODE_ENV === "development") {
    global._mongoClientPromise = undefined;
  } else {
    clientPromise = undefined;
  }
}

function shouldUseLocalFallback(): boolean {
  if (process.env.USE_LOCAL_DB_FALLBACK === "false") return false;
  if (process.env.NODE_ENV === "production") return false;
  return process.env.USE_LOCAL_DB_FALLBACK === "true" || process.env.NODE_ENV === "development";
}

function isMongoMarkedUnavailable(): boolean {
  return existsSync(MONGO_UNAVAILABLE_FILE);
}

function markMongoUnavailable(): void {
  mongoFailed = true;
  global._mongoFailed = true;
  resetClientPromise();
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(MONGO_UNAVAILABLE_FILE, new Date().toISOString(), "utf8");
}

function clearMongoUnavailable(): void {
  mongoFailed = false;
  global._mongoFailed = false;
  if (existsSync(MONGO_UNAVAILABLE_FILE)) unlinkSync(MONGO_UNAVAILABLE_FILE);
}

export function hasMongoEnv(): boolean {
  return Boolean(
    process.env.MONGODB_URI?.trim() || process.env.MONGODB_DIRECT_URI?.trim()
  );
}

function getMongoUriCandidates(): string[] {
  const uris: string[] = [];

  // Prefer SRV first so the driver can rediscover the writable primary after failover.
  const srv = process.env.MONGODB_URI?.trim();
  if (srv) uris.push(srv);

  const direct = process.env.MONGODB_DIRECT_URI?.trim();
  if (direct) {
    uris.push(direct);
    const hostMatch = direct.match(/@(ac-[^./]+-shard-00)-(\d{2})\./);
    if (hostMatch && direct.includes("directConnection=true")) {
      for (const suffix of ["00", "01", "02"]) {
        if (suffix !== hostMatch[2]) {
          uris.push(direct.replace(`${hostMatch[1]}-${hostMatch[2]}.`, `${hostMatch[1]}-${suffix}.`));
        }
      }
    }
  }

  if (uris.length === 0) {
    throw new Error("MONGODB_URI or MONGODB_DIRECT_URI must be set in environment variables.");
  }

  return [...new Set(uris)];
}

async function isWritablePrimary(mongoClient: MongoClient): Promise<boolean> {
  const hello = await mongoClient.db("admin").command({ hello: 1 });
  return Boolean(hello.isWritablePrimary || hello.ismaster);
}

export async function resetMongoClient(): Promise<void> {
  const previous = client;
  client = undefined;
  resetClientPromise();
  if (previous) {
    await previous.close().catch(() => undefined);
  }
}

export function isNotWritablePrimaryError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: number; codeName?: string; message?: string };
  return (
    err.code === 10107 ||
    err.codeName === "NotWritablePrimary" ||
    err.message?.includes("not primary") === true ||
    err.message?.includes("NotWritablePrimary") === true
  );
}

async function connectMongoClient(): Promise<MongoClient> {
  let lastError: unknown;
  for (const uri of getMongoUriCandidates()) {
    const candidate = new MongoClient(uri, getClientOptions());
    try {
      await candidate.connect();
      if (!(await isWritablePrimary(candidate))) {
        await candidate.close();
        continue;
      }
      await candidate.db(process.env.MONGODB_DB_NAME || "linuxpro").command({ ping: 1 });
      client = candidate;
      return candidate;
    } catch (error) {
      lastError = error;
      await candidate.close().catch(() => undefined);
    }
  }
  throw lastError ?? new Error("Could not connect to MongoDB Atlas.");
}

function createClientPromise(): Promise<MongoClient> {
  return connectMongoClient().catch((error) => {
    resetClientPromise();
    throw error;
  });
}

function getClientPromise(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = createClientPromise();
    }
    return global._mongoClientPromise;
  }

  if (!clientPromise) {
    clientPromise = createClientPromise();
  }
  return clientPromise;
}

async function getMongoDb(): Promise<Db> {
  const connected = await getClientPromise();
  const dbName = process.env.MONGODB_DB_NAME || "linuxpro";
  return connected.db(dbName);
}

/** Typed collection accessor (works for Atlas and local file DB). */
export async function getCollection<T extends Document>(
  name: string
): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection(name) as Collection<T>;
}

/**
 * Run a Mongo write with one reconnect retry when Atlas returns NotWritablePrimary
 * (stale direct connection / primary election).
 */
export async function withMongoWriteRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isNotWritablePrimaryError(error)) throw error;
    console.warn("[MongoDB] NotWritablePrimary — reconnecting to writable primary…");
    await resetMongoClient();
    return await operation();
  }
}

export async function getDb(): Promise<Db | ReturnType<typeof getLocalDb>> {
  if (shouldUseLocalFallback() && (mongoFailed || global._mongoFailed || isMongoMarkedUnavailable())) {
    return getLocalDb();
  }

  try {
    const db = await getMongoDb();
    clearMongoUnavailable();
    return db;
  } catch (error) {
    resetClientPromise();
    if (shouldUseLocalFallback()) {
      markMongoUnavailable();
      console.warn(
        "[MongoDB] Atlas unreachable — using local file database (data/local-db.json).",
        "Fix Atlas Network Access (0.0.0.0/0) to use cloud database."
      );
      return getLocalDb();
    }
    throw error;
  }
}

export function getDbMode(): "mongodb" | "local" {
  return isUsingLocalDb() || mongoFailed || global._mongoFailed || isMongoMarkedUnavailable()
    ? "local"
    : "mongodb";
}

export function isMongoConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string; name?: string };
  return (
    err.name === "MongoServerSelectionError" ||
    err.code === "ECONNREFUSED" ||
    err.code === "ENOTFOUND" ||
    err.code === "ETIMEDOUT" ||
    err.message?.includes("querySrv") === true ||
    err.message?.includes("Server selection timed out") === true ||
    isNotWritablePrimaryError(error)
  );
}
