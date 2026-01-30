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

async function getLiveFixtures() {
  try {
    const res = await API.get("/fixtures", {
      params: {
        live: "all",
      },
    });

    const matches = res.data.response || [];

    console.log(`⚽ Live Matches Count: ${matches.length}`);

    if (matches.length === 0) {
      console.log("😴 No live matches right now");
      return;
    }

    const match = matches[0];

    console.log("📌 Sample Live Match:", {
      fixtureId: match.fixture.id,
      league: match.league.name,
      teams: {
        home: match.teams.home.name,
        away: match.teams.away.name,
      },
      goals: match.goals,
      status: match.fixture.status.long,
    });

    // جاهزين للخطوة الجاية (Firebase write)
    // await db.ref(`liveMatches/${match.fixture.id}`).set(match);

  } catch (err) {
    console.error("❌ API ERROR (LIVE FIXTURES):");
    console.error(err.response?.data || err.message);
  }
}

// Entry point
getLiveFixtures();
