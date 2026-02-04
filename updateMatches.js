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
  // 🌍 World / Continental
  1: "كأس العالم",
  2: "دوري أبطال أوروبا",
  3: "الدوري الأوروبي",
  531: "كأس السوبر الأوروبي",

  // 🌍 Africa
  6: "كأس الأمم الإفريقية",
  200: "دوري أبطال أفريقيا",
  201: "كأس الكونفدرالية الأفريقية",
  202: "كأس السوبر الأفريقي",

  // 🌍 Asia
  7: "كأس آسيا",
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
   4️⃣ Global League Order
============================ */

const LEAGUE_ORDER = [
  "كأس العالم",
  "دوري أبطال أوروبا",
  "الدوري الأوروبي",
  "كأس السوبر الأوروبي",

  "كأس الأمم الإفريقية",
  "دوري أبطال أفريقيا",
  "كأس الكونفدرالية الأفريقية",
  "كأس السوبر الأفريقي",

  "كأس آسيا",
  "دوري أبطال آسيا",

  "الدوري الإنجليزي",
  "الدوري الإسباني",
  "الدوري الإيطالي",
  "الدوري الألماني",
  "الدوري الفرنسي",

  "الدوري السعودي",
  "الدوري المصري",

  "كأس الاتحاد الإنجليزي",
  "كأس كاراباو",
  "كأس إسبانيا",
  "كأس إيطاليا",
  "كأس ألمانيا",
  "كأس فرنسا",

  "كأس السوبر الإنجليزي",
  "كأس السوبر الإسباني",
  "كأس السوبر الإيطالي",
  "كأس السوبر الألماني",
  "كأس السوبر الفرنسي",

  "كأس مصر",
  "كأس خادم الحرمين الشريفين",
  "كأس السوبر السعودي",
];

/* ============================
   5️⃣ Helpers
============================ */

function matchPriority(status) {
  if (["1H", "HT", "2H", "ET", "PEN"].includes(status)) return 1; // Live
  if (status === "NS") return 2; // Not started
  return 3; // Finished / Postponed
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

  console.log(`📅 Fetching ${type} matches for:`, dateStr);

  const res = await api.get("/fixtures", { params: { date: dateStr } });
  const fixtures = res.data.response || [];

  const filtered = fixtures.filter((f) => LEAGUES[f.league.id]);

  const tempMap = {};

  filtered.forEach((f) => {
    const leagueName = LEAGUES[f.league.id];

    if (!tempMap[leagueName]) {
      tempMap[leagueName] = {
        league_logo: f.league.logo,
        matches: [],
      };
    }

    tempMap[leagueName].matches.push({
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
      channel: "",
    });
  });

  // 🔥 ترتيب الماتشات داخل كل بطولة
  Object.values(tempMap).forEach((league) => {
    league.matches.sort(
      (a, b) => matchPriority(a.status) - matchPriority(b.status)
    );

    const obj = {};
    league.matches.forEach((m) => (obj[m.id] = m));
    league.matches = obj;
  });

  // 🏆 ترتيب البطولات
  const orderedLeagues = {};
  LEAGUE_ORDER.forEach((name) => {
    if (tempMap[name]) orderedLeagues[name] = tempMap[name];
  });

  // أي بطولة مش في الليست تتحط في الآخر
  Object.keys(tempMap).forEach((name) => {
    if (!orderedLeagues[name]) orderedLeagues[name] = tempMap[name];
  });

  await db.ref(path).set(orderedLeagues);

  console.log(`✅ ${type} matches written`);
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
