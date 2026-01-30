/**
 * updateMatches.js
 * Fetch today's matches from API-Football
 * Save data to Firebase Realtime Database
 * WITH FULL DEBUG
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
  databaseURL:
    "https://monaleza-live-b3e0c-default-rtdb.europe-west1.firebasedatabase.app",
});

const db = admin.database();

// ================= DEBUG: CONNECTION =================
(async () => {
  const connectedSnap = await db.ref(".info/connected").once("value");

  console.log("🧭 ===== FIREBASE DEBUG =====");
  console.log("🔥 Project ID:", serviceAccount.project_id);
  console.log("🌍 Database URL:", admin.app().options.databaseURL);
  console.log("📡 Connected:", connectedSnap.val());
  console.log("🧭 =========================");
})();

// ================= API Football =================
const API_URL = "https://v3.football.api-sports.io/fixtures";
const API_HEADERS = {
  "x-apisports-key": process.env.API_FOOTBALL_KEY,
};

// ================= Leagues (FINAL) =================
const LEAGUES = [
  // 🌍 National teams
  { key: "fifa_world_cup", name: "FIFA World Cup", id: 1 },
  { key: "uefa_euro", name: "UEFA Euro", id: 4 },
  { key: "copa_america", name: "Copa America", id: 9 },
  { key: "africa_cup_of_nations", name: "Africa Cup of Nations", id: 6 },
  { key: "afc_asian_cup", name: "AFC Asian Cup", id: 7 },

  // 🏆 Continental clubs
  { key: "uefa_champions_league", name: "UEFA Champions League", id: 2 },
  { key: "caf_champions_league", name: "CAF Champions League", id: 16 },
  { key: "afc_champions_league", name: "AFC Champions League", id: 17 },
  { key: "copa_libertadores", name: "Copa Libertadores", id: 13 },
  { key: "fifa_club_world_cup", name: "FIFA Club World Cup", id: 15 },

  // 🇪🇺 Top leagues
  { key: "premier_league", name: "Premier League", id: 39 },
  { key: "la_liga", name: "La Liga", id: 140 },
  { key: "serie_a", name: "Serie A", id: 135 },
  { key: "bundesliga", name: "Bundesliga", id: 78 },
  { key: "ligue_1", name: "Ligue 1", id: 61 },

  // 🇪🇬🇸🇦 Local
  { key: "egyptian_premier_league", name: "Egyptian Premier League", id: 233 },
  { key: "saudi_pro_league", name: "Saudi Pro League", id: 307 },
];

// ================= MAIN FUNCTION =================
async function updateMatches() {
  const rootRef = db.ref("matches_today");

  console.log("✍️ Writing root path:", rootRef.toString());

  // ===== TEST WRITE (CRITICAL) =====
  await db.ref("__where_am_i").set({
    ok: true,
    project: serviceAccount.project_id,
    databaseURL: admin.app().options.databaseURL,
    time: new Date().toISOString(),
  });

  console.log("🧪 Test write __where_am_i DONE");

  // ===== Clear old data =====
  await rootRef.remove();
  console.log("🧹 Old matches_today cleared");

  const today = new Date().toISOString().split("T")[0];
  console.log("📅 Fetching matches for:", today);

  for (const league of LEAGUES) {
    console.log(`🔎 League: ${league.name} (${league.id})`);

    const res = await axios.get(API_URL, {
      headers: API_HEADERS,
      params: {
        league: league.id,
        date: today,
      },
    });

    if (!res.data.response || res.data.response.length === 0) {
      console.log(`⚠️ No matches for ${league.name}`);
      continue;
    }

    const leagueRef = rootRef.child(league.key);

    await leagueRef.set({
      league_name: league.name,
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

    console.log(`✅ Saved ${res.data.response.length} matches for ${league.name}`);
  }

  console.log("✅ Matches written to Firebase SUCCESS");
}

// ================= RUN & CLEAN EXIT =================
updateMatches()
  .then(async () => {
    await admin.app().delete();
    console.log("👋 Firebase app closed");
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("❌ ERROR:", err);
    await admin.app().delete();
    process.exit(1);
  });
