/**
 * updateMatches.js
 * Fetch LIVE matches from API-Football (Free Plan)
 * Save to Firebase Realtime Database
 */

const axios = require("axios");
const admin = require("firebase-admin");

// ===== ENV CHECK =====
if (!process.env.FIREBASE_SERVICE_ACCOUNT)
  throw new Error("FIREBASE_SERVICE_ACCOUNT is missing");

if (!process.env.API_FOOTBALL_KEY)
  throw new Error("API_FOOTBALL_KEY is missing");

// ===== Firebase Init =====
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://monaleza-live-b3e0c-default-rtdb.europe-west1.firebasedatabase.app",
});

const db = admin.database();
console.log("🔥 Firebase Connected");

// ===== API Football =====
const API_URL = "https://v3.football.api-sports.io/fixtures";
const API_HEADERS = {
  "x-apisports-key": process.env.API_FOOTBALL_KEY,
};

// ===== LEAGUES =====
const LEAGUES = [
  { key: "fifa_world_cup", name: "FIFA World Cup", id: 1 },
  { key: "uefa_euro", name: "UEFA Euro", id: 4 },
  { key: "copa_america", name: "Copa America", id: 9 },
  { key: "africa_cup_of_nations", name: "Africa Cup of Nations", id: 6 },
  { key: "afc_asian_cup", name: "AFC Asian Cup", id: 7 },

  { key: "uefa_champions_league", name: "UEFA Champions League", id: 2 },
  { key: "caf_champions_league", name: "CAF Champions League", id: 12 },
  { key: "caf_confederation_cup", name: "CAF Confederation Cup", id: 20 },
  { key: "afc_champions_league", name: "AFC Champions League", id: 17 },
  { key: "copa_libertadores", name: "Copa Libertadores", id: 13 },
  { key: "fifa_club_world_cup", name: "FIFA Club World Cup", id: 15 },
  { key: "fifa_intercontinental_cup", name: "FIFA Intercontinental Cup", id: 1168 },

  { key: "premier_league", name: "Premier League", id: 39 },
  { key: "la_liga", name: "La Liga", id: 140 },
  { key: "serie_a", name: "Serie A", id: 135 },
  { key: "bundesliga", name: "Bundesliga", id: 78 },
  { key: "ligue_1", name: "Ligue 1", id: 61 },

  { key: "egyptian_premier_league", name: "Egyptian Premier League", id: 233 },
  { key: "saudi_pro_league", name: "Saudi Pro League", id: 307 },
];

async function updateLiveMatches() {
  const rootRef = db.ref("live_matches");
  await rootRef.remove();

  console.log("🔴 Fetching LIVE matches...");

  const res = await axios.get(API_URL, {
    headers: API_HEADERS,
    params: { live: "all" },
  });

  const allLive = res.data.response || [];

  if (!allLive.length) {
    await rootRef.set({
      message: "❌ لا توجد مباريات مباشرة حاليًا",
      updated_at: new Date().toISOString(),
    });
    console.log("⚠️ No live matches");
    return;
  }

  let total = 0;

  for (const league of LEAGUES) {
    const matches = allLive.filter(
      (m) => m.league.id === league.id
    );

    if (!matches.length) continue;

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
        goals_home: match.goals.home,
        goals_away: match.goals.away,
        status: match.fixture.status.short,
        elapsed: match.fixture.status.elapsed,
        stadium: match.fixture.venue?.name || "",
      });
      total++;
    }
  }

  console.log(`✅ Saved ${total} live matches`);
}

// ===== RUN =====
updateLiveMatches()
  .then(async () => {
    await admin.app().delete();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("❌ Error:", err.message);
    await admin.app().delete();
    process.exit(1);
  });
