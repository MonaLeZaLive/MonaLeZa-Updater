/**
 * updateMatches.js
 * Fetch TODAY matches for CAF Champions League (ID = 12)
 * Save to Firebase Realtime Database
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
  databaseURL:
    "https://monaleza-live-b3e0c-default-rtdb.europe-west1.firebasedatabase.app/",
});

const db = admin.database();
console.log("🔥 Firebase Connected");

// ===== API Football =====
const API_URL = "https://v3.football.api-sports.io/fixtures";
const API_HEADERS = {
  "x-apisports-key": process.env.API_FOOTBALL_KEY,
};

// ===== CONSTANTS =====
const LEAGUE_ID = 12; // CAF Champions League
const todayUTC = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

async function updateMatches() {
  const rootRef = db.ref("matches_today/caf_champions_league");

  // امسح القديم
  await rootRef.remove();

  console.log(`📅 Date (UTC): ${todayUTC}`);
  console.log(`🏆 League ID: ${LEAGUE_ID}`);

  const res = await axios.get(API_URL, {
    headers: API_HEADERS,
    params: {
      league: LEAGUE_ID,
      date: todayUTC,
      timezone: "UTC",
    },
  });

  const matches = res.data.response || [];

  console.log(`📊 Matches found: ${matches.length}`);

  // لو مفيش مباريات
  if (matches.length === 0) {
    await rootRef.set({
      league_id: LEAGUE_ID,
      league_name: "CAF Champions League",
      date: todayUTC,
      message: "لا توجد مباريات اليوم في دوري أبطال أفريقيا",
      updated_at: new Date().toISOString(),
    });

    console.log("⚠️ No matches today");
    return;
  }

  // اكتب بيانات البطولة
  await rootRef.set({
    league_id: LEAGUE_ID,
    league_name: matches[0].league.name,
    league_logo: matches[0].league.logo,
    date: todayUTC,
    matches: {},
  });

  // اكتب المباريات
  for (const match of matches) {
    await rootRef.child(`matches/m_${match.fixture.id}`).set({
      fixture_id: match.fixture.id,
      date_utc: match.fixture.date,
      time_utc: match.fixture.date.slice(11, 16),
      status: match.fixture.status.short,

      home_team: match.teams.home.name,
      home_logo: match.teams.home.logo,

      away_team: match.teams.away.name,
      away_logo: match.teams.away.logo,

      stadium: match.fixture.venue?.name || "",
      city: match.fixture.venue?.city || "",

      goals: match.goals,
      score: match.score,
    });
  }

  console.log("✅ CAF Champions League matches saved");
}

// ===== RUN =====
updateMatches()
  .then(async () => {
    await admin.app().delete();
    console.log("👋 Firebase closed");
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("❌ Error:", err.message);
    await admin.app().delete();
    process.exit(1);
  });
