/**
 * updateMatches.js
 * Fetch matches from API-Football by LEAGUE ID (UTC)
 * Save data to Firebase Realtime Database
 */

const axios = require("axios");
const admin = require("firebase-admin");

// ================= ENV CHECK =================
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error("❌ FIREBASE_SERVICE_ACCOUNT is missing");
}
if (!process.env.API_FOOTBALL_KEY) {
  throw new Error("❌ API_FOOTBALL_KEY is missing");
}

// ================= Firebase Init =================
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://monaleza-live-b3e0c-default-rtdb.europe-west1.firebasedatabase.app",
});

const db = admin.database();

console.log("🔥 Firebase Connected");
console.log("📌 Project:", serviceAccount.project_id);

// ================= API Football =================
const API_URL = "https://v3.football.api-sports.io/fixtures";
const API_HEADERS = {
  "x-apisports-key": process.env.API_FOOTBALL_KEY,
};

// ================= LEAGUES (ID BASED) =================
const LEAGUES = [
  { key: "fifa_world_cup", name: "FIFA World Cup", id: 1 },
  { key: "uefa_champions_league", name: "UEFA Champions League", id: 2 },
  { key: "caf_champions_league", name: "CAF Champions League", id: 16 },
  { key: "afc_champions_league", name: "AFC Champions League", id: 17 },

  { key: "premier_league", name: "Premier League", id: 39 },
  { key: "la_liga", name: "La Liga", id: 140 },
  { key: "serie_a", name: "Serie A", id: 135 },
  { key: "bundesliga", name: "Bundesliga", id: 78 },
  { key: "ligue_1", name: "Ligue 1", id: 61 },

  { key: "egyptian_premier_league", name: "Egyptian Premier League", id: 233 },
  { key: "saudi_pro_league", name: "Saudi Pro League", id: 307 },
];

// ================= MAIN FUNCTION =================
async function updateMatches() {
  const rootRef = db.ref("matches_today");

  // امسح القديم
  await rootRef.remove();

  // UTC DATE (مهم)
  const todayUTC = new Date().toISOString().split("T")[0];
  console.log("📅 UTC Date:", todayUTC);

  let totalMatches = 0;

  for (const league of LEAGUES) {
    console.log(`🔍 Fetching league ${league.name} (${league.id})`);

    const res = await axios.get(API_URL, {
      headers: API_HEADERS,
      params: {
        league: league.id,
        date: todayUTC,
        timezone: "UTC",
      },
    });

    const matches = res.data.response || [];
    console.log(`➡️ ${league.name}: ${matches.length} matches`);

    if (matches.length === 0) continue;

    totalMatches += matches.length;

    const leagueRef = rootRef.child(league.key);

    await leagueRef.set({
      league_name: league.name,
      league_logo: matches[0].league.logo,
      matches: {},
    });

    for (const match of matches) {
      await leagueRef.child(`matches/m_${match.fixture.id}`).set({
        home_team: match.teams.home.name,
        home_logo: match.teams.home.logo,
        away_team: match.teams.away.name,
        away_logo: match.teams.away.logo,
        time: match.fixture.date.slice(11, 16),
        status: match.fixture.status.short,
        stadium: match.fixture.venue?.name || "",
        channel: "",
      });
    }
  }

  // لو مفيش أي ماتشات خالص
  if (totalMatches === 0) {
    await rootRef.set({
      status: "NO_MATCHES_TODAY",
      date: todayUTC,
    });
    console.log("😴 No matches today");
  } else {
    console.log(`✅ Total matches written: ${totalMatches}`);
  }
}

// ================= RUN & EXIT =================
updateMatches()
  .then(async () => {
    await admin.app().delete();
    console.log("👋 Firebase closed");
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("❌ ERROR:", err.message);
    await admin.app().delete();
    process.exit(1);
  });
