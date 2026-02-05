// livematches.js

import axios from "axios";
import dayjs from "dayjs";
import admin from "firebase-admin";

import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
dayjs.extend(utc);
dayjs.extend(timezone);



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
   SAME LEAGUES MAP (IMPORTANT)
============================ */
const LEAGUES = {
  1: "World Cup",
  2: "UEFA Champions League",
  3: "UEFA Europa League",
  6: "Africa Cup of Nations",
  200: "CAF Champions League",
  201: "CAF Confederation Cup",
  202: "CAF Super Cup",
  17: "AFC Champions League",

  39: "Premier League",
  45: "FA Cup",
  48: "EFL Cup",
  528: "FA Community Shield",

  140: "La Liga",
  143: "Copa del Rey",
  556: "Spanish Super Cup",

  135: "Serie A",
  137: "Coppa Italia",
  547: "Italian Super Cup",

  78: "Bundesliga",
  81: "DFB Pokal",
  529: "German Super Cup",

  61: "Ligue 1",
  66: "Coupe de France",
  526: "French Super Cup",

  307: "Saudi Pro League",
  308: "King's Cup",
  309: "Saudi Super Cup",

  233: "Egyptian League",
  714: "Egypt Cup",
  539: "Egyptian Super Cup",
};

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

  const now = dayjs().tz("Africa/Cairo").unix();


  // خارج وقت الماتشات
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

  // نجيب الداتا الحالية
  const todaySnap = await db.ref("matches_today").once("value");
  const todayData = todaySnap.val();

  if (!todayData) {
    console.log("❌ matches_today not found");
    process.exit(0);
  }

  const updates = {};

  fixtures.forEach((f) => {
    const league = LEAGUES[f.league.id];
    if (!league) return;

    const leagueName = `${league.ar} | ${league.en}`;
    ;

    if (!todayData[leagueName]?.matches) return;

    const matchExists = todayData[leagueName].matches.find(
      (m) => m.id === f.fixture.id
    );

    if (!matchExists) return;

    updates[
      `matches_today/${leagueName}/matches/${todayData[leagueName].matches.indexOf(
        matchExists
      )}`
    ] = {
      ...matchExists,
      status: f.fixture.status.short,
      minute: f.fixture.status.elapsed,
      home_score: f.goals.home,
      away_score: f.goals.away,
    };
  });

  if (!Object.keys(updates).length) {
    console.log("⚪ No relevant live matches to update");
    process.exit(0);
  }

  await db.ref().update(updates);

  console.log(`🔥 Live matches updated: ${Object.keys(updates).length}`);
  process.exit(0);
})();
