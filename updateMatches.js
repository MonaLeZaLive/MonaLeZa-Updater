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
   3️⃣ Leagues (ORDER MATTERS)
============================ */

const LEAGUES_ORDERED = [
  // International / Major
  { id: 1, name: "كأس العالم" },
  { id: 2, name: "دوري أبطال أوروبا" },
  { id: 3, name: "الدوري الأوروبي" },
  { id: 6, name: "كأس الأمم الإفريقية" },
  { id: 15, name: "كأس العالم للأندية" },

  // Africa
  { id: 200, name: "دوري أبطال أفريقيا" },
  { id: 201, name: "كأس الكونفدرالية الأفريقية" },
  { id: 202, name: "كأس السوبر الأفريقي" },

  // Asia
  { id: 17, name: "دوري أبطال آسيا" },

  // England
  { id: 39, name: "الدوري الإنجليزي" },
  { id: 45, name: "كأس الاتحاد الإنجليزي" },
  { id: 48, name: "كأس كاراباو" },
  { id: 528, name: "كأس السوبر الإنجليزي" },

  // Spain
  { id: 140, name: "الدوري الإسباني" },
  { id: 143, name: "كأس إسبانيا" },
  { id: 556, name: "كأس السوبر الإسباني" },

  // Italy
  { id: 135, name: "الدوري الإيطالي" },
  { id: 137, name: "كأس إيطاليا" },
  { id: 547, name: "كأس السوبر الإيطالي" },

  // Germany
  { id: 78, name: "الدوري الألماني" },
  { id: 81, name: "كأس ألمانيا" },
  { id: 529, name: "كأس السوبر الألماني" },

  // France
  { id: 61, name: "الدوري الفرنسي" },
  { id: 66, name: "كأس فرنسا" },
  { id: 526, name: "كأس السوبر الفرنسي" },

  // Saudi Arabia
  { id: 307, name: "الدوري السعودي" },
  { id: 308, name: "كأس خادم الحرمين الشريفين" },
  { id: 309, name: "كأس السوبر السعودي" },

  // Egypt
  { id: 233, name: "الدوري المصري" },
  { id: 714, name: "كأس مصر" },
  { id: 539, name: "كأس السوبر المصري" },
];

// quick lookup
const LEAGUE_MAP = {};
LEAGUES_ORDERED.forEach((l) => (LEAGUE_MAP[l.id] = l.name));

/* ============================
   4️⃣ Helpers
============================ */

function matchPriority(status) {
  // live first, then not started, then finished
  if (["1H", "2H", "ET", "P", "LIVE"].includes(status)) return 1;
  if (status === "NS") return 2;
  return 3;
}

/* ============================
   5️⃣ Core Function
============================ */

async function updateMatchesForDay(type) {
  let date =
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

  const filtered = fixtures.filter((f) => LEAGUE_MAP[f.league.id]);

  // لو مفيش ماتشات
  if (filtered.length === 0) {
    await db.ref(path).set({
      date: dateStr,
      message: "❌ لا توجد مباريات",
      leagues: {},
    });
    console.log(`⚠️ No matches for ${type}`);
    return;
  }

  const leaguesData = {};

  filtered.forEach((f) => {
    const leagueName = LEAGUE_MAP[f.league.id];

    if (!leaguesData[leagueName]) {
      leaguesData[leagueName] = {
        league_logo: f.league.logo,
        matches: [],
      };
    }

    leaguesData[leagueName].matches.push({
      id: f.fixture.id,
      status: f.fixture.status.short,
      minute: f.fixture.status.elapsed,

      home_team: f.teams.home.name,
      home_logo: f.teams.home.logo,
      home_score: f.goals.home,

      away_team: f.teams.away.name,
      away_logo: f.teams.away.logo,
      away_score: f.goals.away,

      stadium: f.fixture.venue?.name || "",
      time: dayjs(f.fixture.date).format("HH:mm"),
      timestamp: f.fixture.timestamp,
      channel: "",
    });
  });

  // ترتيب الماتشات داخل كل بطولة
  Object.values(leaguesData).forEach((league) => {
    league.matches.sort((a, b) => {
      const pA = matchPriority(a.status);
      const pB = matchPriority(b.status);
      if (pA !== pB) return pA - pB;
      return a.timestamp - b.timestamp;
    });
  });

  // ترتيب البطولات نفسها
  const orderedResult = {};
  LEAGUES_ORDERED.forEach((l) => {
    if (leaguesData[l.name]) {
      orderedResult[l.name] = leaguesData[l.name];
    }
  });

  await db.ref(path).set({
    date: dateStr,
    updated_at: new Date().toISOString(),
    leagues: orderedResult,
  });

  await db.ref(`debug/${dateStr}`).set({
    totalFromApi: fixtures.length,
    afterFilter: filtered.length,
  });

  console.log(`✅ ${type} matches saved: ${filtered.length}`);
}

/* ============================
   6️⃣ Run (once per day)
============================ */

(async () => {
  try {
    await updateMatchesForDay("yesterday");
    await updateMatchesForDay("today");
    await updateMatchesForDay("tomorrow");

    console.log("🚀 Daily matches update completed");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
    process.exit(1);
  }
})();
