import { readFileSync, existsSync, unlinkSync } from "fs";
import path from "path";
import { MongoClient } from "mongodb";

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const dataPath = path.join(root, "data", "local-db.json");
const markerPath = path.join(root, "data", ".mongo-unavailable");

function loadEnv() {
  if (!existsSync(envPath)) throw new Error(".env.local not found");
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}

function getMongoUriCandidates(env) {
  const uris = [];
  const direct = env.MONGODB_DIRECT_URI?.trim();
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
  const srv = env.MONGODB_URI?.trim();
  if (srv) uris.push(srv);
  return [...new Set(uris)];
}

async function connectWritableClient(env) {
  const uris = getMongoUriCandidates(env);
  let lastError;
  for (const uri of uris) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 20000 });
    try {
      await client.connect();
      if (uri.includes("directConnection=true")) {
        const hello = await client.db("admin").command({ hello: 1 });
        if (!(hello.isWritablePrimary || hello.ismaster)) {
          await client.close();
          continue;
        }
      }
      await client.db(env.MONGODB_DB_NAME || "linuxpro").command({ ping: 1 });
      return client;
    } catch (error) {
      lastError = error;
      await client.close().catch(() => undefined);
    }
  }
  throw lastError ?? new Error("Could not connect to MongoDB Atlas.");
}

function idFilter(collection, doc) {
  if (collection === "users") return { email: doc.email };
  return { id: doc.id };
}

async function upsertCollection(db, name, docs) {
  if (!Array.isArray(docs) || docs.length === 0) {
    console.log(`  ${name}: skipped (empty)`);
    return 0;
  }
  const col = db.collection(name);
  let count = 0;
  for (const doc of docs) {
    const filter = idFilter(name, doc);
    await col.updateOne(filter, { $set: doc }, { upsert: true });
    count += 1;
  }
  console.log(`  ${name}: migrated ${count} document(s)`);
  return count;
}

async function main() {
  const env = loadEnv();
  const dbName = env.MONGODB_DB_NAME || "linuxpro";
  if (!env.MONGODB_DIRECT_URI && !env.MONGODB_URI) {
    throw new Error("Set MONGODB_DIRECT_URI or MONGODB_URI in .env.local");
  }

  if (!existsSync(dataPath)) {
    console.log("No data/local-db.json found. Nothing to migrate.");
    return;
  }

  const store = JSON.parse(readFileSync(dataPath, "utf8"));

  console.log("Connecting to MongoDB Atlas...");
  const client = await connectWritableClient(env);
  const db = client.db(dbName);
  await db.command({ ping: 1 });
  console.log(`Connected to database "${dbName}". Migrating local data...`);

  const collections = [
    "users",
    "stock",
    "orders",
    "servers",
    "tickets",
    "server_actions",
  ];

  let total = 0;
  for (const name of collections) {
    total += await upsertCollection(db, name, store[name]);
  }

  await client.close();

  if (existsSync(markerPath)) {
    unlinkSync(markerPath);
    console.log("Removed data/.mongo-unavailable — app will use Atlas on next restart.");
  }

  console.log(`Done. Migrated ${total} document(s) to MongoDB Atlas.`);
  console.log("Restart dev server: npm run dev");
  console.log("Then check: http://localhost:3000/api/health (should show mongodb-atlas)");
}

main().catch((error) => {
  console.error("Migration failed:", error.message);
  console.error(
    "Check Atlas Network Access (0.0.0.0/0), cluster is Active, and MONGODB_DIRECT_URI is correct."
  );
  process.exit(1);
});
