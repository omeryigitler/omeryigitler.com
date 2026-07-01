const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

class FakeTimestamp {
  constructor(milliseconds) { this.milliseconds = milliseconds; this.seconds = Math.floor(milliseconds / 1000); }
  toMillis() { return this.milliseconds; }
  toDate() { return new Date(this.milliseconds); }
  static now() { return new FakeTimestamp(Date.now()); }
  static fromMillis(milliseconds) { return new FakeTimestamp(milliseconds); }
}

const FieldValue = {
  serverTimestamp: () => FakeTimestamp.now(),
  increment: (value) => ({ __operation: "increment", value }),
  arrayUnion: (...values) => ({ __operation: "arrayUnion", values })
};

function createFakeFirestore(entries) {
  const store = new Map(entries);
  let generated = 0;

  class Ref {
    constructor(collectionName, id) { this.collectionName = collectionName; this.id = id; this.path = `${collectionName}/${id}`; }
    async get() {
      const value = store.get(this.path);
      return { id: this.id, exists: value !== undefined, data: () => value };
    }
  }

  class Query {
    constructor(collectionName, orderField = null, direction = "asc", max = Infinity) {
      this.collectionName = collectionName;
      this.orderField = orderField;
      this.direction = direction;
      this.max = max;
    }
    orderBy(field, direction = "asc") { return new Query(this.collectionName, field, direction, this.max); }
    limit(max) { return new Query(this.collectionName, this.orderField, this.direction, max); }
    async get() {
      let docs = [...store.entries()]
        .filter(([key]) => key.startsWith(`${this.collectionName}/`))
        .map(([key, value]) => ({ id: key.slice(this.collectionName.length + 1), data: () => value }));
      if (this.orderField) {
        const millis = (value) => value?.toMillis?.() || Date.parse(value || "") || 0;
        docs.sort((left, right) => {
          const delta = millis(left.data()[this.orderField]) - millis(right.data()[this.orderField]);
          return this.direction === "desc" ? -delta : delta;
        });
      }
      docs = docs.slice(0, this.max);
      return { docs, empty: docs.length === 0 };
    }
  }

  const db = {
    collection(name) {
      const query = new Query(name);
      query.doc = (id = `generated_${++generated}`) => new Ref(name, id);
      return query;
    },
    batch() {
      const writes = [];
      return {
        set(ref, data, options = {}) { writes.push({ ref, data, options }); },
        async commit() {
          for (const write of writes) {
            const previous = store.get(write.ref.path) || {};
            store.set(write.ref.path, write.options.merge ? { ...previous, ...write.data } : write.data);
          }
        }
      };
    }
  };

  return { db, store };
}

test("operational read tools return bounded privacy-safe summaries and audit runs", async () => {
  const now = Date.now();
  const { db, store } = createFakeFirestore([
    ["messages/lead_1", {
      name: "Ada",
      email: "ada@example.com",
      message: "Kurumsal site ve SEO istiyorum",
      read: false,
      status: "new",
      createdAt: new FakeTimestamp(now),
      timestamp: new FakeTimestamp(now)
    }],
    ["messages/system_1", {
      name: "Tracker",
      email: "tracker@taurus.sys",
      message: "ignore",
      createdAt: new FakeTimestamp(now),
      timestamp: new FakeTimestamp(now)
    }],
    ["projects/project_1", {
      projectName: "Studio Site",
      clientName: "Ada",
      status: "active",
      progress: 40,
      lastUpdated: new FakeTimestamp(now)
    }],
    ["projects/project_done", { name: "Old", status: "completed", lastUpdated: new FakeTimestamp(now - 1000) }],
    ["visitors_v1/sess_SAFE", {
      ip: "203.0.113.1",
      location: { city: "Valletta", country: "Malta" },
      device: { type: "Mobile" },
      browser: "Safari",
      last_seen: new FakeTimestamp(now)
    }]
  ]);
  const fakeAdmin = { firestore: { FieldValue, Timestamp: FakeTimestamp } };
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "../api/_firebaseAdmin" && parent?.filename?.endsWith("/lib/agent.js")) {
      return { admin: fakeAdmin, db };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  delete require.cache[require.resolve("../lib/agent")];
  const agent = require("../lib/agent");
  Module._load = originalLoad;
  const actor = { id: "admin_1", source: "firebase" };

  const messages = await agent.handleCommand({ text: "Bugünkü mesajları özetle", actor });
  const projects = await agent.handleCommand({ text: "Aktif projeleri listele", actor });
  const visitors = await agent.handleCommand({ text: "Son ziyaretçileri özetle", actor });

  assert.equal(messages.data.count, 1);
  assert.equal(messages.data.messages[0].email, "ad***@example.com");
  assert.equal(projects.data.count, 1);
  assert.equal(visitors.data.count, 1);
  assert.equal(visitors.data.visitors[0].location, "Valletta, Malta");
  assert.equal(JSON.stringify(visitors).includes("203.0.113.1"), false);
  assert.equal([...store.keys()].filter((key) => key.startsWith("agent_runs/")).length, 3);
  assert.equal([...store.keys()].filter((key) => key.startsWith("agent_audit_logs/")).length, 3);
});
