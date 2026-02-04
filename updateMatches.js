// updateMatches.js

import axios from "axios";
import dayjs from "dayjs";
import admin from "firebase-admin";

/* ============================
   1️⃣ Firebase Init
============================ */

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://monaleza-live-b3e0c-default-rtdb.europe-west1.firebasedatabase.app",
});

const db = admin.database();

/* ============================
   2️⃣ API-Football Client
============================ */

const api = axios.create({
  baseURL: "https://v3.football.api-sports.io",
  headers: {
    "x-apisports-key": process.env.API_FOOTBALL_KEY,
  },
});

/* ============================
   3️⃣ Leagues Map (ID ➜ Arabic Name)
============================ */

const LEAGUES = {
  // 🌍 International & Continental
  1: "كأس العالم",
  2: "دوري أبطال أوروبا",
  3: "الدوري الأوروبي",
  6: "كأس الأمم الإفريقية",
  200: "دوري أبطال أفريقيا",
  201: "كأس الكونفدرالية الأفريقية",
  202: "كأس السوبر الأفريقي",
  17: "دوري أبطال آسيا",

  // 🇬🇧 England
  39: "الدوري الإنجليزي",
  45: "كأس الاتحاد الإنجليزي",
  48: "كأس كاراباو",
  528: "كأس السوبر الإنجليزي",

  // 🇪🇸 Spain
  140: "الدوري الإسباني",
  143: "كأس إسبانيا",
  556: "كأس السوبر الإسباني",

  // 🇮🇹 Italy
  135: "الدوري الإيطالي",
  137: "كأس إيطاليا",
  547: "كأس السوبر الإيطالي",

  // 🇩🇪 Germany
  78: "الدوري الألماني",
  81: "كأس ألمانيا",
  529: "كأس السوبر الألماني",

  // 🇫🇷 France
  61: "الدوري الفرنسي",
  66: "كأس فرنسا",
  526: "كأس السوبر الفرنسي",

  // 🇸🇦 Saudi Arabia
  307: "الدوري السعودي",
  308: "كأس خادم الحرمين الشريفين",
  309: "كأس السوبر السعودي",

  // 🇪🇬 Egypt
  233: "الدوري المصري",
  714: "كأس مصر",
  539: "كأس السوبر المصري",
};

/* ============================
   4️⃣ League Order (IMPORTANT)
============================ */

const LEAGUE_ORDER = [
  "كأس العالم",
  "دوري أبطال أوروبا",
  "الدوري الأوروبي",
  "كأس الأمم الإفريقية",
  "دوري أبطال أفريقيا",
  "كأس الكونفدرالية الأفريقية",
  "كأس السوبر الأفريقي",
  "دوري أبطال آسيا",

  "الدوري الإنجليزي",
  "الدوري الإسباني",
  "الدوري الإيطالي",
  "الدوري الألماني",
  "الدوري الفرنسي",

  "كأس الاتحاد الإنجليزي",
  "كأس كاراباو",
  "كأس إسبانيا",
  "كأس إيطاليا",
  "كأس ألمانيا",
  "كأس فرنسا",

  "كأس السوبر الإنجليزي",
  "كأس السوبر الإسباني",
  "كأس السوبر الإيطالي",
  "كأس السوبر الفرنسي",
  "كأس السوبر الألماني",
   
  "الدوري السعودي",
  "كأس خادم الحرمين الشريفين",
  "كأس السوبر السعودي",

  "الدوري المصري",
  "كأس مصر",
  "كأس السوبر المصري",
];

/* ============================
   5️⃣ Helpers
============================ */

function matchPriority(status) {
  if (["1H", "2H", "ET", "P"].includes(status)) return 1; // LIVE
  if (status === "NS") return 2; // NOT STARTED
  return 3; // FINISHED
}

/* ============================
   6️⃣ Core Function
============================ */

async function updateMatchesForDay(type) {
  const date =
    type === "yesterday"
      ? dayjs().subtract(1, "day")
      : type === "tomorrow"
      ? dayjs().add(1, "day")
      : dayjs();

  const dateStr = date.format("YYYY-MM-DD");

  const path =
    type === "yesterday"
      ? "matches_yesterday"
      : type === "tomorrow"
      ? "matches_tomorrow"
      : "matches_today";

  console.log(`📅 Fetching ${type} matches for ${dateStr}`);

  const res = await api.get("/fixtures", {
    params: { date: dateStr },
  });

  const fixtures = res.data.response || [];

  const filtered = fixtures.filter((f) => LEAGUES[f.league.id]);

  const leaguesTemp = {};
  const timestamps = [];

  filtered.forEach((f) => {
    const leagueName = LEAGUES[f.league.id];
    const ts = f.fixture.timestamp;

    timestamps.push(ts);

    if (!leaguesTemp[leagueName]) {
      leaguesTemp[leagueName] = {
        league_logo: f.league.logo,
        matches: [],
      };
    }

    leaguesTemp[leagueName].matches.push({
      id: f.fixture.id,
      status: f.fixture.status.short,
      minute: f.fixture.status.elapsed,
      priority: matchPriority(f.fixture.status.short),

      home_team: f.teams.home.name,
      home_logo: f.teams.home.logo,
      home_score: f.goals.home,

      away_team: f.teams.away.name,
      away_logo: f.teams.away.logo,
      away_score: f.goals.away,

      stadium: f.fixture.venue?.name || "",
      time: dayjs(f.fixture.date).format("HH:mm"),
      channel: "",
    });
  });

  // 🟢 Sort matches inside league
  Object.values(leaguesTemp).forEach((league) => {
    league.matches.sort((a, b) => a.priority - b.priority);
    league.matches.forEach((m) => delete m.priority);
  });

  // 🟢 Order leagues
  const orderedLeagues = {};
  LEAGUE_ORDER.forEach((name) => {
    if (leaguesTemp[name]) {
      orderedLeagues[name] = leaguesTemp[name];
    }
  });

  // 🟢 Write matches
  await db.ref(path).set(orderedLeagues);

  // 🟢 Save meta ONLY for today
  if (type === "today" && timestamps.length) {
    await db.ref("meta/today").set({
      date: dateStr,
      first_match_ts: Math.min(...timestamps),
      last_match_ts: Math.max(...timestamps),
      updated_at: new Date().toISOString(),
    });
  }

  // Debug
  await db.ref(`debug/${dateStr}`).set({
    totalFromApi: fixtures.length,
    afterFilter: filtered.length,
  });

  console.log(`✅ ${type} matches written: ${filtered.length}`);
}

/* ============================
   7️⃣ Run
============================ */

(async () => {
  try {
    await updateMatchesForDay("yesterday");
    await updateMatchesForDay("today");
    await updateMatchesForDay("tomorrow");

    console.log("🚀 All updates completed");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
    process.exit(1);
  }
})();
