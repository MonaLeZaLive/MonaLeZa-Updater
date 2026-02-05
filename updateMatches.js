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
   API Init
============================ */
const api = axios.create({
  baseURL: "https://v3.football.api-sports.io",
  headers: {
    "x-apisports-key": process.env.API_FOOTBALL_KEY,
  },
});

/* ============================
   Leagues Map (AR + EN)
============================ */
const LEAGUES = {
  // 🌍 International
  1:  { ar: "كأس العالم", en: "World Cup" },
  2:  { ar: "دوري أبطال أوروبا", en: "UEFA Champions League" },
  3:  { ar: "الدوري الأوروبي", en: "UEFA Europa League" },
  6:  { ar: "كأس الأمم الإفريقية", en: "Africa Cup of Nations" },
  200:{ ar: "دوري أبطال أفريقيا", en: "CAF Champions League" },
  201:{ ar: "كأس الكونفدرالية الأفريقية", en: "CAF Confederation Cup" },
  202:{ ar: "كأس السوبر الأفريقي", en: "CAF Super Cup" },
  17: { ar: "دوري أبطال آسيا", en: "AFC Champions League" },

  // 🇬🇧 England
  39: { ar: "الدوري الإنجليزي", en: "Premier League" },
  45: { ar: "كأس الاتحاد الإنجليزي", en: "FA Cup" },
  48: { ar: "كأس كاراباو", en: "EFL Cup" },
  528:{ ar: "كأس السوبر الإنجليزي", en: "FA Community Shield" },

  // 🇪🇸 Spain
  140:{ ar: "الدوري الإسباني", en: "La Liga" },
  143:{ ar: "كأس إسبانيا", en: "Copa del Rey" },
  556:{ ar: "كأس السوبر الإسباني", en: "Spanish Super Cup" },

  // 🇮🇹 Italy
  135:{ ar: "الدوري الإيطالي", en: "Serie A" },
  137:{ ar: "كأس إيطاليا", en: "Coppa Italia" },
  547:{ ar: "كأس السوبر الإيطالي", en: "Italian Super Cup" },

  // 🇩🇪 Germany
  78: { ar: "الدوري الألماني", en: "Bundesliga" },
  81: { ar: "كأس ألمانيا", en: "DFB Pokal" },
  529:{ ar: "كأس السوبر الألماني", en: "German Super Cup" },

  // 🇫🇷 France
  61: { ar: "الدوري الفرنسي", en: "Ligue 1" },
  66: { ar: "كأس فرنسا", en: "Coupe de France" },
  526:{ ar: "كأس السوبر الفرنسي", en: "French Super Cup" },

  // 🇸🇦 Saudi
  307:{ ar: "الدوري السعودي", en: "Saudi Pro League" },
  308:{ ar: "كأس خادم الحرمين الشريفين", en: "King's Cup" },
  309:{ ar: "كأس السوبر السعودي", en: "Saudi Super Cup" },

  // 🇪🇬 Egypt
  233:{ ar: "الدوري المصري", en: "Egyptian League" },
  714:{ ar: "كأس مصر", en: "Egypt Cup" },
  539:{ ar: "كأس السوبر المصري", en: "Egyptian Super Cup" },
};

/* ============================
   League Order (FIXED)
============================ */
const LEAGUE_ORDER = [
  // 🌍 International
  "World Cup",
  "UEFA Champions League",
  "UEFA Europa League",
  "Africa Cup of Nations",
  "CAF Champions League",
  "CAF Confederation Cup",
  "CAF Super Cup",
  "AFC Champions League",

  // 🇬🇧 England
  "Premier League",
  "FA Cup",
  "EFL Cup",
  "FA Community Shield",

  // 🇪🇸 Spain
  "La Liga",
  "Copa del Rey",
  "Spanish Super Cup",

  // 🇮🇹 Italy
  "Serie A",
  "Coppa Italia",
  "Italian Super Cup",

  // 🇩🇪 Germany
  "Bundesliga",
  "DFB Pokal",
  "German Super Cup",

  // 🇫🇷 France
  "Ligue 1",
  "Coupe de France",
  "French Super Cup",

  // 🇸🇦 Saudi
  "Saudi Pro League",
  "King's Cup",
  "Saudi Super Cup",

  // 🇪🇬 Egypt
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

function createDailyLogger(date) {
  return {
    date,
    leagues: {},
    total: 0,
  };
}

async function fetchByDate(date, path, label) {
  const res = await api.get("/fixtures", {
    params: { date },
  });

  const grouped = {};
  const logger = {
    leagues: {},
    totalMatches: 0,
  };

  res.data.response.forEach((m) => {
    const league = LEAGUES[m.league.id];
    if (!league) return;

    const leagueKey = league.en;
    const leagueName = `${league.ar} | ${league.en}`;

    if (!grouped[leagueKey]) {
      grouped[leagueKey] = {
        league_name: leagueName,
        league_logo: m.league.logo,
        matches: [],
      };

      logger.leagues[leagueKey] = {
        name: leagueName,
        count: 0,
      };
    }

    grouped[leagueKey].matches.push({
      id: m.fixture.id,
      status: m.fixture.status.short || "NS",
      minute: m.fixture.status.elapsed ?? null,
      time: dayjs(m.fixture.date)
        .tz("Africa/Cairo")
        .format("HH:mm"),

      home_team: m.teams.home.name,
      home_logo: m.teams.home.logo,
      home_score: m.goals.home,

      away_team: m.teams.away.name,
      away_logo: m.teams.away.logo,
      away_score: m.goals.away,

      stadium: m.fixture.venue?.name || "",
    });

    logger.leagues[leagueKey].count += 1;
    logger.totalMatches += 1;
  });

  const ordered = {};
  LEAGUE_ORDER.forEach((l) => {
    if (grouped[l]) {
      grouped[l].matches = sortMatches(grouped[l].matches);
      ordered[l] = grouped[l];
    }
  });

  await db.ref(path).set(ordered);

  // 🔥 LOG PER DAY
  console.log(`\n📅 ${label} (${date})`);
  console.log("━━━━━━━━━━━━━━━━━━━━");

  Object.values(logger.leagues).forEach((l) => {
    console.log(`🏆 ${l.name} (${l.count})`);
  });

  console.log("━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ Total leagues: ${Object.keys(logger.leagues).length}`);
  console.log(`✅ Total matches: ${logger.totalMatches}\n`);
}



/* ============================
   Main
============================ */
(async () => {
  const today = dayjs().tz("Africa/Cairo");
  const yesterday = today.subtract(1, "day").format("YYYY-MM-DD");
  const todayStr = today.format("YYYY-MM-DD");
  const tomorrow = today.add(1, "day").format("YYYY-MM-DD");

  await fetchByDate(yesterday, "matches_yesterday", "Yesterday");
  await fetchByDate(todayStr, "matches_today", "Today");
  await fetchByDate(tomorrow, "matches_tomorrow", "Tomorrow");


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
