import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "fs";
import path from "path";

type Doc = Record<string, unknown>;

type Store = Record<string, Doc[]>;

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "local-db.json");

let cache: Store | null = null;
let cacheMtime = 0;
let usingLocal = false;

export function isUsingLocalDb(): boolean {
  return usingLocal;
}

function loadStore(): Store {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) {
    cache = {};
    cacheMtime = 0;
    writeFileSync(DATA_FILE, JSON.stringify(cache, null, 2), "utf8");
    return cache;
  }

  const mtime = statSync(DATA_FILE).mtimeMs;
  if (cache && mtime === cacheMtime) return cache;

  try {
    cache = JSON.parse(readFileSync(DATA_FILE, "utf8")) as Store;
    cacheMtime = mtime;
  } catch {
    cache = {};
    cacheMtime = mtime;
  }
  return cache!;
}

function saveStore(store: Store): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
  cache = store;
  cacheMtime = existsSync(DATA_FILE) ? statSync(DATA_FILE).mtimeMs : 0;
}

function matchDoc(doc: Doc, filter: Doc): boolean {
  for (const [key, value] of Object.entries(filter)) {
    if (value && typeof value === "object" && "$regex" in (value as object)) {
      const regex = (value as { $regex: RegExp }).$regex;
      const field = String(doc[key] ?? "");
      if (!regex.test(field)) return false;
      continue;
    }
    if (doc[key] !== value) return false;
  }
  return true;
}

function sortDocs(docs: Doc[], sort: Record<string, 1 | -1>): Doc[] {
  const entries = Object.entries(sort);
  if (entries.length === 0) return docs;
  const [field, dir] = entries[0];
  return [...docs].sort((a, b) => {
    const av = String(a[field] ?? "");
    const bv = String(b[field] ?? "");
    return dir === -1 ? bv.localeCompare(av) : av.localeCompare(bv);
  });
}

class LocalCollection {
  constructor(private name: string) {}

  private docs(): Doc[] {
    const store = loadStore();
    if (!store[this.name]) store[this.name] = [];
    return store[this.name];
  }

  private persist(docs: Doc[]): void {
    const store = loadStore();
    store[this.name] = docs;
    saveStore(store);
  }

  find(filter: Doc = {}) {
    const self = this;
    let sortSpec: Record<string, 1 | -1> = {};
    let limitCount: number | null = null;
    const cursor = {
      sort(spec: Record<string, 1 | -1>) {
        sortSpec = spec;
        return cursor;
      },
      limit(count: number) {
        limitCount = count;
        return cursor;
      },
      async toArray(): Promise<Doc[]> {
        const matched = self.docs().filter((doc) => matchDoc(doc, filter));
        const sorted = sortDocs(matched, sortSpec);
        return limitCount != null ? sorted.slice(0, limitCount) : sorted;
      },
    };
    return cursor;
  }

  async findOne(filter: Doc): Promise<Doc | null> {
    return this.docs().find((doc) => matchDoc(doc, filter)) ?? null;
  }

  async insertOne(doc: Doc): Promise<void> {
    const docs = this.docs();
    docs.unshift(doc);
    this.persist(docs);
  }

  async insertMany(items: Doc[]): Promise<void> {
    const docs = this.docs();
    docs.unshift(...items);
    this.persist(docs);
  }

  async updateOne(filter: Doc, update: { $set: Doc }): Promise<void> {
    const docs = this.docs();
    const index = docs.findIndex((doc) => matchDoc(doc, filter));
    if (index === -1) return;
    docs[index] = { ...docs[index], ...update.$set };
    this.persist(docs);
  }

  async updateMany(filter: Doc, update: { $set: Doc }): Promise<void> {
    const docs = this.docs();
    let changed = false;
    for (let i = 0; i < docs.length; i++) {
      if (matchDoc(docs[i], filter)) {
        docs[i] = { ...docs[i], ...update.$set };
        changed = true;
      }
    }
    if (changed) this.persist(docs);
  }

  async deleteOne(filter: Doc): Promise<{ deletedCount: number }> {
    const docs = this.docs();
    const next = docs.filter((doc) => !matchDoc(doc, filter));
    const deleted = docs.length - next.length;
    if (deleted > 0) this.persist(next);
    return { deletedCount: deleted };
  }

  async deleteMany(filter: Doc): Promise<void> {
    const docs = this.docs();
    const next = docs.filter((doc) => !matchDoc(doc, filter));
    this.persist(next);
  }

  async countDocuments(): Promise<number> {
    return this.docs().length;
  }
}

class LocalDb {
  collection(name: string) {
    return new LocalCollection(name);
  }

  async command(_cmd: { ping: number }): Promise<{ ok: number }> {
    return { ok: 1 };
  }
}

let localDb: LocalDb | null = null;

export function getLocalDb(): LocalDb {
  usingLocal = true;
  if (!localDb) localDb = new LocalDb();
  return localDb;
}
