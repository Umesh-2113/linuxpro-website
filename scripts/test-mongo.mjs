import { readFileSync } from "fs";
import { MongoClient } from "mongodb";

function loadEnv() {
  const lines = readFileSync(".env.local", "utf8").split(/\r?\n/);
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

async function tryConnect(label, uri) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  try {
    await client.connect();
    const ping = await client.db("linuxpro").command({ ping: 1 });
    const users = await client.db("linuxpro").collection("users").countDocuments();
    const stock = await client.db("linuxpro").collection("stock").countDocuments();
    console.log(`OK ${label}: ping=${ping.ok} users=${users} stock=${stock}`);
    await client.close();
    return true;
  } catch (error) {
    console.log(`FAIL ${label}: ${error.message}`);
    try {
      await client.close();
    } catch {
      /* ignore */
    }
    return false;
  }
}

const env = loadEnv();
console.log("Testing MongoDB Atlas connections...\n");

const srv = env.MONGODB_URI;
const direct = env.MONGODB_DIRECT_URI;

let ok = false;
if (srv) ok = (await tryConnect("MONGODB_URI (SRV)", srv)) || ok;
if (direct) ok = (await tryConnect("MONGODB_DIRECT_URI", direct)) || ok;

if (!ok && direct?.includes("directConnection=true")) {
  const match = direct.match(/@([^/:]+)/);
  const baseHost = match?.[1]?.replace(/\d{2}$/, "");
  if (baseHost) {
    console.log("\nChecking which shard is primary (for writes)...");
    for (const n of ["00", "01", "02"]) {
      const host = baseHost.replace(/-\d{2}$/, `-${n}`);
      const uri = direct.replace(/@[^/]+/, `@${host}`);
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 12000 });
      try {
        await client.connect();
        const hello = await client.db("admin").command({ hello: 1 });
        const isPrimary = Boolean(hello.isWritablePrimary || hello.ismaster);
        console.log(`  ${host} → ${isPrimary ? "PRIMARY (use this host)" : "secondary"}`);
        await client.close();
      } catch (error) {
        console.log(`  ${host} → unreachable (${error.message})`);
        try {
          await client.close();
        } catch {
          /* ignore */
        }
      }
    }
  }
}

process.exit(ok ? 0 : 1);
