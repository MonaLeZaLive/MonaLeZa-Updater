/**
 * updateMatches.js
 * Fetch today's matches from API-Football
 * Save data to Firebase Realtime Database
 */

const axios = require("axios");
const admin = require("firebase-admin");

// ===== ENV CHECK =====
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT is missing");
}
if (!process.env.API_FOOTBALL_KEY) {
  throw new Error("API_FOOTBALL_KEY is missing");
}

// ===== Firebase Init =====
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://monaleza-live-default-rtdb.firebaseio.com",
});

const db = admin.database();

console.log("🔥 Firebase Connected");
console.log("🔥 Project:", serviceAccount.project_id);

// ===== API Football =====
const API_URL = "https://v3.football.api-sports.io/fixtures";
const API_HEADERS = {
  "x-apisports-key": process.env.API_FOOTBALL_KEY,
};

// ===== Leagues =====
const LEAGUES = [
  { name: "Premier League", id: 39 },
  { name: "La Liga", id: 140 },
  { name: "Serie A", id: 135 },
  { name: "Bundesliga", id: 78 },
  { name: "Ligue 1", id: 61 },
  { name: "Egyptian Premier League", id: 233 },
  { name: "Saudi Pro League", id: 307 },
];

async function updateMatches() {
  const rootRef = db.ref("matches_today");

  // clear old
  await rootRef.remove();

  const today = new Date().toISOString().split("T")[0];

  for (const league of LEAGUES) {
    const res = await axios.get(API_URL, {
      headers: API_HEADERS,
      params: { league: league.id, date: today },
    });

    if (!res.data.response?.length) continue;

    const leagueRef = rootRef.child(league.name);

    await leagueRef.set({
      league_logo: res.data.response[0].league.logo,
      matches: {},
    });

    for (const match of res.data.response) {
      await leagueRef.child(`matches/m_${match.fixture.id}`).set({
        home_team: match.teams.home.name,
        home_logo: match.teams.home.logo,
        away_team: match.teams.away.name,
        away_logo: match.teams.away.logo,
        time: match.fixture.date.slice(11, 16),
        status: match.fixture.status.short,
        stadium: match.fixture.venue?.name || "",
      });
    }
  }

  console.log("✅ Matches written to Firebase");
}

// ===== RUN & FORCE EXIT =====
updateMatches()
  .then(async () => {
    await admin.app().delete(); // 🔥 ده السطر السحري
    console.log("👋 Firebase app closed");
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("❌ Error:", err);
    await admin.app().delete();
    process.exit(1);
  });
