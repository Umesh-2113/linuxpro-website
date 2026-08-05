import { readFileSync } from "fs";

for (const line of readFileSync(".env", "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  const k = t.slice(0, i).trim();
  const v = t.slice(i + 1).trim();
  if (!process.env[k]) process.env[k] = v;
}

const base = (process.env.HOSTHEAVEN_API_BASE_URL || "https://vps.hostheaven.in").replace(/\/$/, "");
const login = await (
  await fetch(`${base}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.HOSTHEAVEN_EMAIL,
      password: process.env.HOSTHEAVEN_PASSWORD,
    }),
  })
).json();

const token = login.token;
const ov = await (
  await fetch(
    `${base}/api/users/orders/overview?page=0&size=500&sortBy=createdAt&sortDir=desc`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
).json();

const active = (ov.orders || []).filter(
  (o) => (o.dbStatus || "ACTIVE").toUpperCase() === "ACTIVE"
);

const byPrefix = {};
for (const o of active) {
  const ip = o.ipAddress || "";
  const parts = ip.split(".");
  const key = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : ip || "none";
  if (!byPrefix[key]) byPrefix[key] = { total: 0, free: 0, assigned: 0, locked: 0, ips: [] };
  byPrefix[key].total += 1;
  if (o.locked) byPrefix[key].locked += 1;
  else if (o.assigned || o.assignedToEmail) byPrefix[key].assigned += 1;
  else {
    byPrefix[key].free += 1;
    if (byPrefix[key].ips.length < 5) byPrefix[key].ips.push(ip);
  }
}

console.log(
  JSON.stringify(
    {
      totalActive: active.length,
      prefixes: byPrefix,
    },
    null,
    2
  )
);
