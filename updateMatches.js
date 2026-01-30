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

/**
 * ===============================
 * API Football Configuration
 * ===============================
 */

const axios = require("axios");

const API = axios.create({
  baseURL: "https://v3.football.api-sports.io",
  headers: {
    "x-apisports-key": process.env.API_FOOTBALL_KEY,
  },
});

/**
 * ===============================
 * Test API Connection
 * ===============================
 */

async function testApi() {
  try {
    const res = await API.get("/fixtures", {
      params: {
        date: new Date().toISOString().split("T")[0],
      },
    });

    console.log("⚽ Fixtures Today:", res.data.response.length);
  } catch (err) {
    console.error("❌ API Error:", err.response?.data || err.message);
  }
}

testApi();

