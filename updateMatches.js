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
 * Get LIVE Fixtures
 * ===============================
 */

async function updateLiveMatches() {
  try {
    const res = await API.get("/fixtures", {
      params: { live: "all" },
    });

    const matches = res.data.response;
    console.log(`⚽ Live Matches Count: ${matches.length}`);

    const updates = {};

    matches.forEach((match) => {
      const fixtureId = match.fixture.id;

      updates[`liveMatches/${fixtureId}`] = {
        fixtureId,
        league: match.league,
        teams: match.teams,
        goals: match.goals,
        status: match.fixture.status,
        updatedAt: Date.now(),
      };
    });

    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
      console.log("✅ Live matches updated in Firebase");
    } else {
      console.log("😴 No live matches to update");
    }
  } catch (err) {
    console.error("❌ API ERROR (LIVE):");
    console.error(err.response?.data || err.message);
    process.exit(1);
  }
}

updateLiveMatches();
