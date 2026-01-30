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

if (!process.env.API_FOOTBALL_KEY) {
  console.error("❌ API_FOOTBALL_KEY secret is missing");
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
 * CONFIG
 * البطولات المسموح بيها فقط
 * ===============================
 */

const ALLOWED_LEAGUES = [
  39,  // Premier League
  140, // La Liga
  135, // Serie A
  78,  // Bundesliga
  61,  // Ligue 1
  307, // Saudi League
  233, // Egyptian League
];

/**
 * ===============================
 * Update Today's Matches
 * ===============================
 */

async function updateMatchesToday() {
  try {
    const today = new Date().toISOString().split("T")[0];

    const res = await API.get("/fixtures", {
      params: { date: today },
    });

    const fixtures = res.data.response.filter(f =>
      ALLOWED_LEAGUES.includes(f.league.id)
    );

    const updates = {};

    fixtures.forEach(match => {
      updates[match.fixture.id] = {
        fixtureId: match.fixture.id,
        leagueId: match.league.id,
        leagueName: match.league.name,
        home: match.teams.home.name,
        away: match.teams.away.name,
        goals: match.goals,
        status: match.fixture.status.short,
        time: match.fixture.date,
      };
    });

    await db.ref("matches_today").set(updates);

    console.log(`✅ matches_today updated (${fixtures.length} matches)`);
  } catch (err) {
    console.error("❌ Update Error:", err.response?.data || err.message);
  } finally {
    // مهم جدًا عشان GitHub Action يقفل
    process.exit(0);
  }
}

updateMatchesToday();
