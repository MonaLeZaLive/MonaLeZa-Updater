/**
 * updateMatches.js
 * FINAL + DEBUG VERSION
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
  databaseURL: "https://monaleza-live-b3e0c-default-rtdb.europe-west1.firebasedatabase.app",
});

const db = admin.database();

console.log("🔥 Firebase Connected");
console.log("🔥 Project:", serviceAccount.project_id);

// ===== API Football =====
const API_URL = "https://v3.football.api-sports.io/fixtures";
const API_HEADERS = {
  "x-apisports-key": process.env.API_FOOTBALL_KEY,
};

// ===== Leagues (IDs ONLY) =====
const LEAGUES = [
  { key: "fifa_world_cup", name: "FIFA World Cup", id: 1 },
  { key: "uefa_euro", name: "UEFA Euro", id: 4 },
  { key: "copa_america", name: "Copa America", id: 9 },
  { key: "africa_cup_of_nations", name: "Africa Cup of Nations", id: 6 },
  { key: "afc_asian_cup", name: "AFC Asian Cup", id: 7 },

  { key: "uefa_champions_league", name: "UEFA Champions League", id: 2 },
  { key: "caf_champions_league", name: "CAF Champions League", id: 16 },
  { key: "afc_champions_league", name: "AFC Champions League", id: 17 },
  { key: "copa_libertadores", name: "Copa Libertadores", id: 13 },
  { key: "fifa_club_world_cup", name: "FIFA Club World Cup", id: 15 },

  { key: "premier_league", name: "Premier League", id: 39 },
  { key: "la_liga", name: "La Liga", id: 140 },
  { key: "serie_a", name: "Serie A", id: 135 },
  { key: "bundesliga", name: "Bundesliga", id: 78 },
  { key: "ligue_1", name: "Ligue 1", id: 61 },

  { key: "egyptian_premier_league", name: "Egyptian Premier League", id: 233 },
  { key: "saudi_pro_league", name: "Saudi Pro League", id: 307 },
];

async function updateMatches() {
  const rootRef = db.ref("matches_today");

  // reset
  await rootRef.set({
    updated_at: Date.now(),
    timezone: "UTC",
  });

  const todayUTC = new Date().toISOString().slice(0, 10);
  console.log("📅 Fetching matches for UTC date:", todayUTC);

  let totalMatches = 0;

  for (const league of LEAGUES) {
    console.log(`\n🔍 Fetching ${league.name} (ID: ${league.id})`);

    try {
      const res = await axios.get(API_URL, {
        headers: API_HEADERS,
        params: {
          league: league.id,
          date: todayUTC,
          timezone: "UTC",
        },
      });

      console.log("🧾 Raw API response keys:", Object.keys(res.data));

      const matches = res.data.response || [];
      console.log(`➡️ ${league.name}: ${matches.length} matches`);

      const leagueRef = rootRef.child(league.key);

      if (matches.length === 0) {
        await leagueRef.set({
          league_name: league.name,
          message: "No matches today",
        });
        continue;
      }

      totalMatches += matches.length;

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
        });
      }
    } catch (err) {
      console.error(`❌ Error in ${league.name}:`, err.response?.data || err.message);

      await rootRef.child(league.key).set({
        league_name: league.name,
        error: "API error",
      });
    }
  }

  console.log(`\n✅ Finished. Total matches written: ${totalMatches}`);
}

// ===== RUN =====
updateMatches()
  .then(async () => {
    await admin.app().delete();
    console.log("👋 Firebase closed");
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("❌ Fatal Error:", err);
    await admin.app().delete();
    process.exit(1);
  });
