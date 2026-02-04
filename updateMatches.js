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
   3️⃣ Leagues Map (ID ➜ Name)
============================ */

const LEAGUES = {
  // Egypt
  233: "الدوري المصري",
  714: "كأس مصر",
  539: "كأس السوبر المصري",

  // England
  39: "الدوري الإنجليزي",
  45: "كأس الاتحاد الإنجليزي",
  48: "كأس كاراباو",
  528: "كأس السوبر الإنجليزي",

  // Spain
  140: "الدوري الإسباني",
  143: "كأس إسبانيا",
  556: "كأس السوبر الإسباني",

  // Italy
  135: "الدوري الإيطالي",
  137: "كأس إيطاليا",
  547: "كأس السوبر الإيطالي",

  // Germany
  78: "الدوري الألماني",
  81: "كأس ألمانيا",
  529: "كأس السوبر الألماني",

  // France
  61: "الدوري الفرنسي",
  66: "كأس فرنسا",
  526: "كأس السوبر الفرنسي",

  // International
  1: "كأس العالم",
  2: "دوري أبطال أوروبا",
  3: "الدوري الأوروبي",
  4: "كأس أمم أوروبا",
  5: "دوري الأمم الأوروبية",
  6: "كأس الأمم الإفريقية",
  7: "كأس آسيا",
  9: "كوبا أمريكا",
  15: "كأس العالم للأندية",
  22: "الكأس الذهبية",
  531: "كأس السوبر الأوروبي",
  480: "الأولمبياد",
};

/* ============================
   4️⃣ Main Function
============================ */

async function updateTodayMatches() {
  const today = dayjs().format("YYYY-MM-DD");
  console.log("📅 Fetching matches for:", today);

  const res = await api.get("/fixtures", {
    params: { date: today },
  });

  const fixtures = res.data.response || [];
  console.log("📦 Total fixtures:", fixtures.length);

  // 🔍 Filter leagues
  const filtered = fixtures.filter((f) =>
    LEAGUES[f.league.id]
  );

  console.log("🎯 After league filter:", filtered.length);

  // 🧱 Format matches
  const matches = filtered.map((f) => ({
    id: f.fixture.id,

    league: {
      id: f.league.id,
      name: f.league.name,
      ar_name: LEAGUES[f.league.id], // ⭐ الاسم العربي
      logo: f.league.logo,
      country: f.league.country,
    },

    teams: {
      home: {
        id: f.teams.home.id,
        name: f.teams.home.name,
        logo: f.teams.home.logo,
      },
      away: {
        id: f.teams.away.id,
        name: f.teams.away.name,
        logo: f.teams.away.logo,
      },
    },

    score: {
      home: f.goals.home,
      away: f.goals.away,
    },

    status: {
      short: f.fixture.status.short,
      long: f.fixture.status.long,
      elapsed: f.fixture.status.elapsed,
    },

    time: {
      utc: f.fixture.date,
      timestamp: f.fixture.timestamp,
    },

    venue: f.fixture.venue
      ? {
          name: f.fixture.venue.name,
          city: f.fixture.venue.city,
        }
      : null,
  }));

  /* ============================
     5️⃣ Write to Firebase
  ============================ */

  await db.ref("matches_today").set({
    date: today,
    updated_at: new Date().toISOString(),
    count: matches.length,
    matches,
  });

  await db.ref(`debug/${today}`).set({
    totalFromApi: fixtures.length,
    afterFilter: matches.length,
  });

  console.log("✅ Matches written:", matches.length);
}

/* ============================
   6️⃣ Run
============================ */

updateTodayMatches()
  .then(() => {
    console.log("🚀 Update completed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error:", err.response?.data || err.message);
    process.exit(1);
  });
