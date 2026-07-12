const { admin, db } = require("../api/_firebaseAdmin");

const COLLECTION = "portfolio_projects";
const TARGET_ID = "built-with-seyhan";
const TARGET_CATEGORY = "Fitness - Health - Lifestyle";

async function main() {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    console.log("Skipping portfolio order migration outside production.");
    return;
  }

  const snapshot = await db.collection(COLLECTION).get();
  const projects = snapshot.docs
    .map((doc) => ({
      id: doc.id,
      ref: doc.ref,
      title: String(doc.data()?.title || doc.id),
      sortOrder: Number.isFinite(Number(doc.data()?.sortOrder)) ? Number(doc.data().sortOrder) : 999
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));

  const target = projects.find((project) => project.id === TARGET_ID);
  if (!target) throw new Error(`Portfolio project ${TARGET_ID} was not found.`);

  const reordered = [target, ...projects.filter((project) => project.id !== TARGET_ID)];
  const batch = db.batch();
  const timestamp = admin.firestore.FieldValue.serverTimestamp();

  reordered.forEach((project, index) => {
    const data = {
      sortOrder: (index + 1) * 10,
      updatedAt: timestamp
    };
    if (project.id === TARGET_ID) data.category = TARGET_CATEGORY;
    batch.set(project.ref, data, { merge: true });
  });

  await batch.commit();
  console.log(JSON.stringify({
    ok: true,
    firstProject: TARGET_ID,
    category: TARGET_CATEGORY,
    order: reordered.map((project, index) => ({ id: project.id, sortOrder: (index + 1) * 10 }))
  }));
}

main().catch((error) => {
  console.error("Portfolio order migration failed:", error);
  process.exit(1);
});
