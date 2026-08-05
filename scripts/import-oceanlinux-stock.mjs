/**
 * One-shot: import OceanLinux products into LinuxPro Mongo stock.
 * Run on VPS: node scripts/import-oceanlinux-stock.mjs
 * Or via tsx after build uses compiled path — this uses fetch to local admin? 
 * Better: use mongoc + OL API directly in plain JS for VPS.
 */
import { MongoClient } from "mongodb";

const OL_BASE = (process.env.OCEANLINUX_API_BASE_URL || "https://oceanlinux.com").replace(
  /\/$/,
  ""
);
const OL_KEY = process.env.OCEANLINUX_API_KEY || "";
const OL_SECRET = process.env.OCEANLINUX_API_SECRET || "";
const MONGO = process.env.MONGODB_URI || process.env.MONGODB_DIRECT_URI || "";
const DB_NAME = process.env.MONGODB_DB_NAME || "linuxpro";
const DEFAULT_QTY = Number(process.env.OL_IMPORT_DEFAULT_QTY || "0");

if (!OL_KEY || !OL_SECRET) {
  console.error("Missing OCEANLINUX_API_KEY / OCEANLINUX_API_SECRET");
  process.exit(1);
}
if (!MONGO) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

function defaultVcpu(ram) {
  if (ram >= 32) return 8;
  if (ram >= 16) return 8;
  if (ram >= 8) return 4;
  if (ram >= 4) return 2;
  return 1;
}

function memPrice(raw) {
  if (!raw || typeof raw !== "object") return 0;
  if (typeof raw.price === "number") return raw.price;
  if (typeof raw.basePrice === "number") return raw.basePrice;
  return 0;
}

function parseRam(key) {
  const m = String(key).match(/(\d+)\s*GB/i);
  return m ? Number(m[1]) : null;
}

function mapType(serverType, name) {
  const t = `${serverType || ""} ${name || ""}`.toLowerCase();
  if (t.includes("proxy")) return "proxy";
  if (t.includes("linux") && !t.includes("vps")) return "linux";
  return "vps";
}

function seriesFromName(name) {
  const cleaned = String(name).replace(/^[^\w\d(]+/u, "").trim();
  const ipish = cleaned.match(/(\d{1,3}(?:\.\d{1,3}){1,3}(?:\.?[xX]{1,3})?)/);
  if (ipish) return ipish[1].replace(/\.?[xX]+$/i, "").replace(/\.$/, "");
  const paren = cleaned.match(/\(([^)]+)\)/);
  if (paren && /\d/.test(paren[1]) && paren[1].length <= 40) return paren[1].trim();
  return cleaned.replace(/\s+/g, " ").slice(0, 48) || "oceanlinux";
}

function upstreamQty(product) {
  const opts = product.memoryOptions || {};
  let total = 0;
  let found = false;
  for (const val of Object.values(opts)) {
    const parent = val && typeof val === "object" ? val.$__parent : null;
    if (!parent?.defaultConfigurations) continue;
    for (const block of Object.values(parent.defaultConfigurations)) {
      const variants = block?.variants || {};
      for (const v of Object.values(variants)) {
        if (typeof v?.stock === "number") {
          found = true;
          total += v.stock;
        }
      }
    }
  }
  return found ? total : null;
}

function ramPlans(product) {
  const opts = product.memoryOptions || {};
  const plans = [];
  const seen = new Set();
  for (const [key, raw] of Object.entries(opts)) {
    const ram = parseRam(key);
    const price = memPrice(raw);
    if (!ram || seen.has(ram) || price <= 0) continue;
    seen.add(ram);
    plans.push({ ram, vcpu: defaultVcpu(ram), price });
  }
  return plans.sort((a, b) => a.ram - b.ram);
}

const res = await fetch(`${OL_BASE}/api/v1/reseller/products`, {
  headers: {
    Accept: "application/json",
    "x-api-key": OL_KEY,
    "x-api-secret": OL_SECRET,
  },
});
const payload = await res.json();
if (!res.ok) {
  console.error("OL products failed", res.status, payload);
  process.exit(1);
}
const products = payload.products || [];
console.log("fetched", products.length);

const client = new MongoClient(MONGO);
await client.connect();
const col = client.db(DB_NAME).collection("stock");
const existing = await col.find({ provider: "oceanlinux" }).toArray();
const linked = new Set(
  existing.map((s) => s.providerProductId).filter(Boolean)
);
console.log("existing oceanlinux stock rows", existing.length);

let created = 0;
let skipped = 0;
let noPlans = 0;
const now = new Date().toISOString();

for (const p of products) {
  const id = p.id || p._id;
  if (!id) {
    skipped++;
    continue;
  }
  if (linked.has(id)) {
    skipped++;
    continue;
  }
  const plans = ramPlans(p);
  if (plans.length === 0) {
    noPlans++;
    continue;
  }
  const qtyRaw = upstreamQty(p);
  const quantity = typeof qtyRaw === "number" ? Math.max(0, qtyRaw) : DEFAULT_QTY;
  const type = mapType(p.serverType, p.name);
  const primary = plans[0];
  const item = {
    id: `stock-ol-${Date.now()}-${created}`,
    type,
    series: seriesFromName(p.name),
    port: "",
    vcpu: primary.vcpu,
    ram: primary.ram,
    storage: type === "linux" ? 50 : 100,
    quantity,
    price: primary.price,
    ramPlans: plans,
    region: "India",
    os: "All OS Available",
    provider: "oceanlinux",
    providerProductId: String(id),
    createdAt: now,
  };
  // tiny delay id uniqueness
  await new Promise((r) => setTimeout(r, 2));
  item.id = `stock-ol-${Date.now()}-${created}`;
  await col.insertOne(item);
  created++;
  linked.add(String(id));
}

console.log(
  JSON.stringify(
    {
      fetched: products.length,
      created,
      skippedExisting: skipped,
      skippedNoPlans: noPlans,
      defaultQty: DEFAULT_QTY,
    },
    null,
    2
  )
);

await client.close();
