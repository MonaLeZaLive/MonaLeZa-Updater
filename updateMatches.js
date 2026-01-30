/**
 * ===============================
 * Firebase Admin Initialization
 * ===============================
 */

const admin = require("firebase-admin");

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT secret is missing");
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://monaleza-live-default-rtdb.firebaseio.com",
});

const db = admin.database();

console.log("🔥 Firebase Admin Connected Successfully");

/**
 * ===============================
 * API Football Configuration
 * ===============================
 */

const axios = require("axios");

if (!process.env.API_FOOTBALL_KEY) {
  console.error("❌ API_FOOTBALL_KEY secret is missing");
  process.exit(1);
}

const API = axios.create({
  baseURL: "https://v3.football.api-sports.io",
  headers: {
    "x-apisports-key": process.env.API_FOOTBALL_KEY,
  },
});

/**
 * ===============================
 * Test API STATUS (Basic Check)
 * ===============================
 */

async function testApiStatus() {
  try {
    const res = await API.get("/status");

    console.log("✅ API STATUS RESPONSE:");
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("❌ API STATUS ERROR:");
    console.error(
      err.response?.data || err.message
    );
  }
}

testApiStatus();
