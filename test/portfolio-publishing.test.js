const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const { fetchPublicRepositories } = require("../lib/portfolio-github");

function setup(initial = {}, repos = []) {
  const records = new Map(Object.entries(initial));
  const audits = [];
  const doc = (id) => ({ id, ref: ref(id), exists: records.has(id), data: () => records.get(id) });
  const ref = (id) => ({ id, async get() { return doc(id); }, async set(data) { records.set(id, { ...records.get(id), ...data }); }, async delete() { records.delete(id); } });
  function writer() {
    const pending = [];
    return {
      async get(target) { return target.collection ? { docs: [...records.keys()].map(doc) } : doc(target.id); },
      set(target, data) { pending.push(() => target.audit ? audits.push(data) : records.set(target.id, { ...records.get(target.id), ...data })); },
      update(target, data) { this.set(target, data); },
      create(target, data) { this.set(target, data); },
      async commit() { pending.forEach((fn) => fn()); }
    };
  }
  const db = {
    collection(name) { return { collection: name, doc: (id) => name === "agent_audit_logs" ? { audit: true } : ref(id), async get() { return { docs: [...records.keys()].map(doc) }; } }; },
    async getAll(...refs) { return refs.map((r) => doc(r.id)); },
    batch: writer,
    async runTransaction(fn) { const tx = writer(); const result = await fn(tx); await tx.commit(); return result; }
  };
  const context = {
    module: { exports: {} }, Buffer, URL, console: { error() {} },
    require(name) {
      if (name === "./_firebaseAdmin") return { db, admin: { firestore: { FieldValue: { serverTimestamp: () => "now" } } } };
      if (name === "../lib/agent") return { verifyAgentRequest: async (req) => { if (!req.authorized) throw Object.assign(new Error("unauthorized"), { statusCode: 401 }); return { id: "admin" }; } };
      if (name === "../lib/portfolio-github") return { ...require(name), fetchPublicRepositories: async () => repos };
      throw new Error(name);
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../api/portfolio.js"), "utf8"), context);
  async function call(body, authorized = true, query = {}) {
    const res = { setHeader() {}, end(text) { this.body = JSON.parse(text); } };
    await context.module.exports({ method: body ? "POST" : "GET", body, query, authorized }, res);
    return res;
  }
  return { records, audits, call };
}
const repo = { id: 42, name: "new-tool", description: "Example", private: false, owner: { login: "omeryigitler" }, language: "TypeScript", homepage: "", archived: false, fork: false };

test("GitHub import creates unpublished drafts, remains idempotent and preserves editorial changes", async () => {
  const { records, call, audits } = setup({}, [repo]);
  assert.equal((await call({ op: "sync-github" })).body.added, 1);
  assert.equal(records.get("github-42").published, false);
  assert.equal((await call(null)).body.projects.length, 0);
  Object.assign(records.get("github-42"), { title: "My title", desktopImage: "custom.png", published: true, sortOrder: 10, featured: true, featuredOrder: 30 });
  repo.name = "renamed-tool";
  const response = await call({ op: "sync-github" });
  assert.equal(response.body.added, 0);
  assert.equal(records.size, 1);
  const saved = records.get("github-42");
  assert.equal(saved.title, "My title");
  assert.equal(saved.desktopImage, "custom.png");
  assert.equal(saved.sortOrder, 10);
  assert.equal(saved.featuredOrder, 30);
  assert.equal(saved.published, true);
  assert.equal(audits.length, 2);
});

test("admin authentication protects import, visibility and hidden listing", async () => {
  const { call, records } = setup();
  for (const op of ["sync-github", "visibility", "reorder", "upsert"]) assert.equal((await call({ op, id: "a" }, false)).statusCode, 401);
  assert.equal((await call(null, false, { includeHidden: "1" })).statusCode, 401);
  assert.equal(records.size, 0);
});

test("unpublishing the last project returns an empty public list; featured cannot override publishing", async () => {
  const { call, records } = setup({ a: { title: "A", published: true, featured: true } });
  assert.equal((await call(null)).body.projects.length, 1);
  assert.equal((await call({ op: "visibility", id: "a", published: false })).statusCode, 200);
  assert.equal((await call(null)).body.projects.length, 0);
  assert.equal(records.get("a").featured, true);
});

test("archive and home ordering are independent and invalid orders make no writes", async () => {
  const { call, records } = setup({ a: { title: "A", sortOrder: 10, featuredOrder: 10 }, b: { title: "B", sortOrder: 20, featuredOrder: 20 } });
  await call({ op: "reorder", ids: ["b", "a"], scope: "featured" });
  assert.equal(records.get("b").featuredOrder, 10);
  assert.equal(records.get("b").sortOrder, 20);
  assert.equal((await call({ op: "reorder", ids: ["a", "a"] })).statusCode, 400);
  assert.equal((await call({ op: "reorder", ids: ["a", "missing"] })).statusCode, 404);
  assert.equal(records.get("a").sortOrder, 10);
});

test("repository-only projects save as drafts and edits preserve featured rank and source metadata", async () => {
  const { call, records } = setup({ a: { title: "A", published: true, featured: true, featuredOrder: 40, githubRepoId: 42 } });
  assert.equal((await call({ op: "upsert", id: "a", project: { title: "Updated", githubUrl: "https://github.com/omeryigitler/tool" } })).statusCode, 200);
  assert.equal(records.get("a").featuredOrder, 40);
  assert.equal(records.get("a").githubRepoId, 42);
  assert.equal(records.get("a").published, true);
  await call({ op: "upsert", id: "b", project: { title: "Draft" } });
  assert.equal(records.get("b").published, false);
  assert.equal((await call({ op: "upsert", id: "c", project: { title: "Bad", githubUrl: "javascript:alert(1)" } })).statusCode, 400);
});

test("public GitHub inventory follows pagination and excludes private or foreign repositories", async () => {
  const pages = [];
  const result = await fetchPublicRepositories(async (url) => {
    pages.push(url);
    return { ok: true, json: async () => pages.length === 1 ? Array.from({ length: 100 }, (_, i) => ({ ...repo, id: i })) : [{ ...repo, id: 101 }, { ...repo, private: true }, { ...repo, owner: { login: "other" } }] };
  });
  assert.equal(result.length, 101);
  assert.equal(pages.length, 2);
  await assert.rejects(fetchPublicRepositories(async () => ({ ok: false })), /GitHub/);
});
