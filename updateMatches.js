import axios from "axios";
import dayjs from "dayjs";
import admin from "firebase-admin";

import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

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
   API Init
============================ */
const api = axios.create({
  baseURL: "https://v3.football.api-sports.io",
  headers: {
    "x-apisports-key": process.env.API_FOOTBALL_KEY,
  },
});

/* ============================
   Leagues Map (FIXED)
============================ */
const LEAGUES = {
  // International
  1: "World Cup",
  2: "UEFA Champions League",
  3: "UEFA Europa League",
  6: "Africa Cup of Nations",
  200: "CAF Champions League",
  201: "CAF Confederation Cup",
  202: "CAF Super Cup",
  17: "AFC Champions League",

  // England
  39: "Premier League",
  45: "FA Cup",
  48: "EFL Cup",
  528: "FA Community Shield",

  // Spain
  140: "La Liga",
  143: "Copa del Rey",
  556: "Spanish Super Cup",

  // Italy
  135: "Serie A",
  137: "Coppa Italia",
  547: "Italian Super Cup",

  // Germany
  78: "Bundesliga",
  81: "DFB Pokal",
  529: "German Super Cup",

  // France
  61: "Ligue 1",
  66: "Coupe de France",
  526: "French Super Cup",

  // Saudi
  307: "Saudi Pro League",
  308: "King's Cup",
  309: "Saudi Super Cup",

  // Egypt
  233: "Egyptian League",
  714: "Egypt Cup",
  539: "Egyptian Super Cup",
};

/* ============================
   League Order (FIXED)
============================ */
const LEAGUE_ORDER = [
  "World Cup",
  "UEFA Champions League",
  "UEFA Europa League",
  "Africa Cup of Nations",
  "CAF Champions League",
  "CAF Confederation Cup",
  "CAF Super Cup",
  "AFC Champions League",

  "Premier League",
  "La Liga",
  "Serie A",
  "Bundesliga",
  "Ligue 1",

  "FA Cup",
  "EFL Cup",
  "Copa del Rey",
  "Coppa Italia",
  "DFB Pokal",
  "Coupe de France",

  "FA Community Shield",
  "Spanish Super Cup",
  "Italian Super Cup",
  "French Super Cup",
  "German Super Cup",

  "Saudi Pro League",
  "King's Cup",
  "Saudi Super Cup",

  "Egyptian League",
  "Egypt Cup",
  "Egyptian Super Cup",
];

/* ============================
   Helpers
============================ */
function sortMatches(matches) {
  const priority = { LIVE: 1, NS: 2, FT: 3 };

  return matches.sort((a, b) => {
    const aStatus = a.status || "NS";
    const bStatus = b.status || "NS";

    return (priority[aStatus] || 3) - (priority[bStatus] || 3);
  });
}


async function fetchByDate(date, path) {
  const res = await api.get("/fixtures", {
    params: { date },
  });

  const grouped = {};

  res.data.response.forEach((m) => {
    const leagueName = LEAGUES[m.league.id];
    if (!leagueName) return;

    if (!grouped[leagueName]) {
      grouped[leagueName] = {
        league_logo: m.league.logo,
        matches: [],
      };
    }

    const statusShort = m.fixture?.status?.short || "NS";
const elapsed = m.fixture?.status?.elapsed ?? null;

grouped[leagueName].matches.push({
  id: m.fixture.id,
  status: statusShort,
  minute: elapsed,
  time: dayjs(m.fixture.date).format("HH:mm"),


      home_team: m.teams.home.name,
      home_logo: m.teams.home.logo,
      home_score: m.goals.home,

      away_team: m.teams.away.name,
      away_logo: m.teams.away.logo,
      away_score: m.goals.away,

      stadium: m.fixture.venue?.name || "",
    });
  });

  const ordered = {};
  LEAGUE_ORDER.forEach((l) => {
    if (grouped[l]) {
      grouped[l].matches = sortMatches(grouped[l].matches);
      ordered[l] = grouped[l];
    }
  });

  await db.ref(path).set(ordered);
}

/* ============================
   Main
============================ */
(async () => {
  const today = dayjs().tz("Africa/Cairo");
  const yesterday = today.subtract(1, "day").format("YYYY-MM-DD");
  const todayStr = today.format("YYYY-MM-DD");
  const tomorrow = today.add(1, "day").format("YYYY-MM-DD");

  console.log("⬅️ Yesterday");
  await fetchByDate(yesterday, "matches_yesterday");

  console.log("📅 Today");
  await fetchByDate(todayStr, "matches_today");

  console.log("➡️ Tomorrow");
  await fetchByDate(tomorrow, "matches_tomorrow");

  // meta for live updates
  const res = await api.get("/fixtures", { params: { date: todayStr } });
  const fixtures = res.data.response;

  if (fixtures.length) {
    const times = fixtures.map((f) =>
      dayjs(f.fixture.date).unix()
    );

    await db.ref("meta/today").set({
      date: todayStr,
      first_match_ts: Math.min(...times),
      last_match_ts: Math.max(...times),
      updated_at: new Date().toISOString(),
    });
  }

  console.log("✅ Update matches done");
  process.exit(0);
})();
