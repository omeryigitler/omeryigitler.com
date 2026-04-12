const admin = require("firebase-admin");

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getFirebasePrivateKey() {
  return requireEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");
}

function initFirebaseAdmin() {
  if (admin.apps.length) {
    return admin.app();
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: requireEnv("FIREBASE_PROJECT_ID"),
      clientEmail: requireEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: getFirebasePrivateKey(),
    }),
  });
}

const app = initFirebaseAdmin();
const db = app.firestore();

module.exports = {
  admin,
  db,
  requireEnv,
};
