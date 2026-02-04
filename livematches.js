// livematches.js

import axios from "axios";
import dayjs from "dayjs";
import admin from "firebase-admin";

/* ============================
   Firebase Init
============================ */

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://monaleza-live-b3e0c-default-rtdb.europe-west1.firebasedatabase.app",
});

const db = admin.database();

/* ============================
   API Client
============================ */

const api = axios.create({
  baseURL: "https://v3.football.api-sports.io",
  headers: {
    "x-apisports-key": process.env.API_FOOTBALL_KEY,
  },
});

/* ============================
   Live Update
============================ */

(async () => {
  const metaSnap = await db.ref("meta/today").once("value");
  const meta = metaSnap.val();

  if (!meta?.first_match_ts) {
    console.log("❌ No matches today");
    process.exit(0);
  }

  const now = dayjs().unix();

  // برا وقت الماتشات → مفيش سحب
  if (now < meta.first_match_ts || now > meta.last_match_ts + 7200) {
    console.log("⏸ Outside matches window");
    process.exit(0);
  }

  console.log("🔴 Fetching LIVE matches");

  const res = await api.get("/fixtures", {
    params: { live: "all" },
  });

  const fixtures = res.data.response || [];

  if (!fixtures.length) {
    console.log("⚪ No live matches now");
    process.exit(0);
  }

  const updates = {};

  fixtures.forEach((f) => {
    const leagueName = f.league.name;

    updates[`${leagueName}/matches/${f.fixture.id}`] = {
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
    };
  });

  await db.ref("matches_today").update(updates);

  console.log(`🔥 Live matches updated: ${fixtures.length}`);
  process.exit(0);
})();
