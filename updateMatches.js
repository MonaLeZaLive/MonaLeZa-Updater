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

const API = axios.create({
  baseURL: "https://v3.football.api-sports.io",
  headers: {
    "x-apisports-key": process.env.API_FOOTBALL_KEY,
  },
});

/**
 * ===============================
 * Get LIVE Fixtures
 * ===============================
 */

async function getLiveFixtures() {
  try {
    const res = await API.get("/fixtures", {
      params: {
        live: "all",
      },
    });

    console.log("⚽ Live Matches Count:", res.data.response.length);

    // مؤقتًا نطبع أول ماتش بس
    if (res.data.response.length > 0) {
      console.log("📌 Sample Match:", {
        league: res.data.response[0].league.name,
        teams: res.data.response[0].teams,
        goals: res.data.response[0].goals,
        status: res.data.response[0].fixture.status,
      });
    } else {
      console.log("😴 No live matches right now");
    }
  } catch (err) {
    console.error("❌ API ERROR (LIVE):");
    console.error(err.response?.data || err.message);
  }
}

getLiveFixtures();
