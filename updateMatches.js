/**
 * updateMatches.js
 * FINAL STABLE VERSION
 * - No date
 * - No timezone bugs
 * - Season based
 * - Ready for LIVE / NS / FT
 */

const axios = require("axios");
const admin = require("firebase-admin");

/* ================= ENV CHECK ================= */
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT is missing");
}
if (!process.env.API_FOOTBALL_KEY) {
  throw new Error("API_FOOTBALL_KEY is missing");
}

/* ================= FIREBASE INIT ================= */
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://monaleza-live-b3e0c-default-rtdb.europe-west1.firebasedatabase.app",
});

const db = admin.database();

console.log("🔥 Firebase connected:", serviceAccount.project_id);

/* ================= API FOOTBALL ================= */
const API_URL = "https://v3.football.api-sports.io/fixtures";
const HEADERS = {
  "x-apisports-key": process.env.API_FOOTBALL_KEY,
};

/* ================= LEAGUES ================= */
const LEAGUES = [
  { name: "FIFA World Cup", id: 1 },
  { name: "UEFA Euro", id: 4 },
  { name: "Copa America", id: 9 },
  { name: "Africa Cup of Nations", id: 6 },
  { name: "AFC Asian Cup", id: 7 },

  { name: "UEFA Champions League", id: 2 },
  { name: "CAF Champions League", id: 16 },
  { name: "AFC Champions League", id: 17 },
  { name: "Copa Libertadores", id: 13 },
  { name: "FIFA Club World Cup", id: 15 },

  { name: "Premier League", id: 39 },
  { name: "La Liga", id: 140 },
  { name: "Serie A", id: 135 },
  { name: "Bundesliga", id: 78 },
  { name: "Ligue 1", id: 61 },

  { name: "Egyptian Premier League", id: 233 },
  { name: "Saudi Pro League", id: 307 },
];

/* ================= MAIN FUNCTION ================= */
async function updateMatches() {
  const rootRef = db.ref("matches_today");

  await rootRef.set({
    updated_at: Date.now(),
  });

  let total = 0;

  for (const league of LEAGUES) {
    console.log(`\n⚽ Fetching ${league.name}`);

    try {
      const res = await axios.get(API_URL, {
        headers: HEADERS,
        params: {
          league: league.id,
          season: 2025,
        },
      });

      const fixtures = res.data.response || [];

      if (fixtures.length === 0) {
        console.log("➖ No matches");
        continue;
      }

      const leagueRef = rootRef.child(league.name.replace(/ /g, "_"));

      await leagueRef.set({
        league_name: league.name,
        league_logo: fixtures[0].league.logo,
        matches: [],
      });

      const matches = fixtures.map(f => ({
        fixture_id: f.fixture.id,
        home_team: f.teams.home.name,
        home_logo: f.teams.home.logo,
        away_team: f.teams.away.name,
        away_logo: f.teams.away.logo,
        home_score: f.goals.home,
        away_score: f.goals.away,
        status: f.fixture.status.short,
        minute: f.fixture.status.elapsed,
        time: f.fixture.date.slice(11, 16),
      }));

      // ترتيب: لايف → لم تبدأ → انتهت
      matches.sort((a, b) => {
        const order = { "1H": 1, "2H": 1, "HT": 1, "ET": 1, "P": 1, "NS": 2, "FT": 3 };
        return (order[a.status] || 4) - (order[b.status] || 4);
      });

      await leagueRef.child("matches").set(matches);

      total += matches.length;
      console.log(`✅ ${matches.length} matches saved`);
    } catch (err) {
      console.error(`❌ ${league.name} error`, err.response?.data || err.message);
    }
  }

  console.log(`\n🎉 DONE – Total matches: ${total}`);
}

/* ================= RUN ================= */
updateMatches()
  .then(async () => {
    await admin.app().delete();
    console.log("👋 Firebase closed");
    process.exit(0);
  })
  .catch(async err => {
    console.error("❌ Fatal error", err);
    await admin.app().delete();
    process.exit(1);
  });
