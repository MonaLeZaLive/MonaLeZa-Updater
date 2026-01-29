import fetch from "node-fetch";
import admin from "firebase-admin";
import fs from "fs";

console.log("🚀 Starting updater...");

// ================= ENV =================
const API_KEY = process.env.FOOTBALL_API_KEY;
if (!API_KEY) {
  console.error("❌ FOOTBALL_API_KEY is missing");
  process.exit(1);
}

// ================= FIREBASE =================
const serviceAccount = JSON.parse(
  fs.readFileSync("serviceAccountKey.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://monaleza-live-default-rtdb.firebaseio.com"
});

const db = admin.database();

// ================= HELPERS =================
function getMatchPhase(status) {
  switch (status) {
    case "1H": return "الشوط الأول";
    case "HT": return "استراحة";
    case "2H": return "الشوط الثاني";
    case "ET": return "وقت إضافي";
    case "P":  return "ركلات جزاء";
    case "FT": return "انتهت";
    case "NS": return "لم تبدأ";
    default:   return "غير معروف";
  }
}

// ================= FETCH MATCHES =================
async function fetchMatches() {
  const today = new Date().toISOString().split("T")[0];

  const url = `https://v3.football.api-sports.io/fixtures?date=${today}`;

  const res = await fetch(url, {
    headers: {
      "x-apisports-key": API_KEY
    }
  });

  if (!res.ok) {
    throw new Error(`API Error ${res.status}`);
  }

  const data = await res.json();
  return data.response || [];
}

// ================= UPDATE FIREBASE =================
async function updateFirebase(matches) {
  const ref = db.ref("matches_today");
  const output = {};

  matches.forEach((m, i) => {
    const statusShort = m.fixture.status.short;

    output[`match_${i + 1}`] = {
      league: m.league.name,
      league_logo: m.league.logo,

      home_team: m.teams.home.name,
      home_logo: m.teams.home.logo,
      home_score: m.goals.home,

      away_team: m.teams.away.name,
      away_logo: m.teams.away.logo,
      away_score: m.goals.away,

      status: statusShort,              // LIVE / NS / FT
      phase: getMatchPhase(statusShort),// شوط أول / تاني ...
      minute: m.fixture.status.elapsed || null,
      is_live: ["1H","HT","2H","ET","P"].includes(statusShort),

      start_time: m.fixture.date.substring(11,16)
    };
  });

  await ref.set(output);
  console.log(`✅ Updated ${matches.length} matches`);
}

// ================= MAIN =================
(async () => {
  try {
    console.log("⚽ Fetching matches...");
    const matches = await fetchMatches();

    if (matches.length === 0) {
      console.log("ℹ️ No matches today");
    }

    await updateFirebase(matches);
    console.log("🎉 Done successfully");

  } catch (err) {
    console.error("🔥 Error:", err.message);
    process.exit(1);
  }
})();
