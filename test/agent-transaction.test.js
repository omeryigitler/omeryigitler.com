const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

class FakeTimestamp {
  constructor(milliseconds) { this.milliseconds = milliseconds; this.seconds = Math.floor(milliseconds / 1000); }
  toMillis() { return this.milliseconds; }
  toDate() { return new Date(this.milliseconds); }
  static fromMillis(milliseconds) { return new FakeTimestamp(milliseconds); }
  static now() { return new FakeTimestamp(Date.now()); }
}

const FieldValue = {
  serverTimestamp: () => ({ __operation: "serverTimestamp" }),
  increment: (value) => ({ __operation: "increment", value }),
  arrayUnion: (...values) => ({ __operation: "arrayUnion", values })
};

function resolveValue(value, previous) {
  if (value && value.__operation === "serverTimestamp") return FakeTimestamp.now();
  if (value && value.__operation === "increment") return Number(previous || 0) + value.value;
  if (value && value.__operation === "arrayUnion") {
    const result = Array.isArray(previous) ? [...previous] : [];
    for (const item of value.values) {
      if (!result.some((existing) => JSON.stringify(existing) === JSON.stringify(item))) result.push(item);
    }
    return result;
  }
  if (Array.isArray(value)) return value.map((item) => resolveValue(item));
  if (value && typeof value === "object" && !(value instanceof FakeTimestamp)) {
    const output = {};
    for (const [key, nested] of Object.entries(value)) output[key] = resolveValue(nested, previous?.[key]);
    return output;
  }
  return value;
}

function createFakeFirestore(initialEntries) {
  const store = new Map(initialEntries);
  let generatedId = 0;

  class Ref {
    constructor(collection, id) { this.collectionName = collection; this.id = id; this.path = `${collection}/${id}`; }
  }

  const db = {
    collection(name) {
      return { doc: (id = `generated_${++generatedId}`) => new Ref(name, id) };
    },
    async runTransaction(callback) {
      const writes = [];
      const transaction = {
        async get(ref) {
          const value = store.get(ref.path);
          return { exists: value !== undefined, data: () => value };
        },
        set(ref, data, options = {}) { writes.push({ type: "set", ref, data, options }); },
        update(ref, data) { writes.push({ type: "set", ref, data, options: { merge: true } }); },
        create(ref, data) { writes.push({ type: "create", ref, data, options: {} }); }
      };
      const result = await callback(transaction);
      for (const write of writes) {
        if (write.type === "create" && store.has(write.ref.path)) throw new Error("already exists");
        const previous = store.get(write.ref.path) || {};
        const resolved = resolveValue(write.data, previous);
        store.set(write.ref.path, write.options.merge ? { ...previous, ...resolved } : resolved);
      }
      return result;
    }
  };

  return { db, store };
}

test("approval execution is atomic and idempotent for repeated requests", async () => {
  const future = FakeTimestamp.fromMillis(Date.now() + 60_000);
  const { db, store } = createFakeFirestore([
    ["agent_approvals/approval_123", {
      status: "pending",
      requestedAction: "create_proposal",
      commandId: "command_1",
      runId: "run_1",
      risk: "medium",
      expiresAt: future,
      payloadPreview: {
        messageId: "message_1",
        country: "TR",
        siteType: "LANDING",
        designType: "TEMPLATE",
        pageCount: 10,
        features: [],
        selectedAddons: [],
        deliverySpeed: "STANDARD",
        maintenanceLevel: "NONE"
      }
    }],
    ["agent_commands/command_1", { status: "waiting_approval" }],
    ["agent_runs/run_1", { status: "waiting_approval", toolCalls: [] }],
    ["messages/message_1", {
      name: "Test Client",
      email: "test@example.com",
      message: "Landing page request",
      config: { country: "TR", siteType: "CORPORATE", designType: "CUSTOM", pageCount: 50 },
      createdAt: FakeTimestamp.now()
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

  const input = { approvalId: "approval_123", decision: "approve", actor: { id: "admin_1" } };
  const first = await agent.decideApproval(input);
  const second = await agent.decideApproval(input);

  assert.equal(first.status, "approved");
  assert.match(first.result.quoteNumber, /^QA-\d{4}-APPROVAL$/);
  assert.equal(second.idempotent, true);
  assert.equal([...store.keys()].filter((key) => key.startsWith("quotes/")).length, 1);
  assert.equal(store.get("messages/message_1").quoteId, "agent_approval_123");
  assert.equal(store.get("quotes/agent_approval_123").siteType, "LANDING");
  assert.equal(store.get("quotes/agent_approval_123").totalPrice, 18000);
  assert.equal(store.get("clients/dGVzdEBleGFtcGxlLmNvbQ__").totalQuotes, 1);
  assert.equal(store.get("agent_approvals/approval_123").status, "approved");
});

test("visitor commands remain pending until an explicit approval transaction", async () => {
  const future = FakeTimestamp.fromMillis(Date.now() + 60_000);
  const { db, store } = createFakeFirestore([
    ["agent_approvals/visitor_approval", {
      status: "pending",
      requestedAction: "visitor_command",
      commandId: "command_visitor",
      runId: "run_visitor",
      source: "telegram",
      risk: "high",
      expiresAt: future,
      payloadPreview: {
        sessionId: "sess_TEST123",
        command: "FREEZE",
        message: "bakımdayız"
      }
    }],
    ["agent_commands/command_visitor", { status: "waiting_approval" }],
    ["agent_runs/run_visitor", { status: "waiting_approval", toolCalls: [] }],
    ["visitors_v1/sess_TEST123", { action: null, message: null }]
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

  assert.equal(store.get("visitors_v1/sess_TEST123").action, null);
  const result = await agent.decideApproval({
    approvalId: "visitor_approval",
    decision: "approve",
    actor: { id: "telegram:1", source: "telegram" }
  });

  assert.equal(result.status, "approved");
  assert.deepEqual(result.result, { sessionId: "sess_TEST123", command: "FREEZE", message: "bakımdayız" });
  assert.equal(store.get("visitors_v1/sess_TEST123").action, "freeze");
  assert.equal(store.get("visitors_v1/sess_TEST123").message, "bakımdayız");
  assert.equal(store.get("agent_commands/command_visitor").status, "completed");
  assert.equal(store.get("agent_approvals/visitor_approval").status, "approved");
});
