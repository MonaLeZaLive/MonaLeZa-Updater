/**
 * ===============================
 * Firebase Admin Initialization
 * ===============================
 */

const admin = require("firebase-admin");

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://monaleza-live-default-rtdb.firebaseio.com",
});

const db = admin.database();

console.log("🔥 Firebase Admin Connected Successfully");

