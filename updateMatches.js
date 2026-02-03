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
   3️⃣ Leagues Filter
============================ */

const LEAGUE_IDS = [
  1, 4, 9, 6, 7,
  2, 12, 20, 17, 13, 15, 1168,
  39, 140, 135, 78, 61,
  233, 307,
];

/* ============================
   4️⃣ Main Function
============================ */

async function updateTodayMatches() {
  const today = dayjs().format("YYYY-MM-DD");
  console.log("📅 Fetching matches for:", today);

  const res = await api.get("/fixtures", {
    params: {
      date: today,
    },
  });

  const fixtures = res.data.response || [];
  console.log("📦 Total fixtures:", fixtures.length);

  // 🔍 Filter leagues
  const filtered = fixtures.filter((f) =>
    LEAGUE_IDS.includes(f.league.id)
  );

  console.log("🎯 After league filter:", filtered.length);

  // 🧱 Format matches
  const matches = filtered.map((f) => ({
    id: f.fixture.id,

    league: {
      id: f.league.id,
      name: f.league.name,
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

  if (matches.length === 0) {
    await db.ref("matches_today").set({
      date: today,
      updated_at: new Date().toISOString(),
      matches: [],
      message: "❌ لا توجد مباريات اليوم",
    });

    console.log("⚠️ No matches written");
  } else {
    await db.ref("matches_today").set({
      date: today,
      updated_at: new Date().toISOString(),
      count: matches.length,
      matches,
    });

    console.log("✅ Matches written:", matches.length);
  }

  // 🐞 Debug
  await db.ref(`debug/${today}`).set({
    fetchedAt: new Date().toISOString(),
    totalFromApi: fixtures.length,
    afterFilter: matches.length,
  });
}

/* ============================
   6️⃣ Run
============================ */

updateTodayMatches()
  .then(() => {
    console.log("🚀 Update completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error:", err.response?.data || err.message);
    process.exit(1);
  });
