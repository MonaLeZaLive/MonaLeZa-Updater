/* =========================================================
   MonaLeZa Live - Clean Cron
   - Fetch fixtures by DATE (API-Football requirement)
   - Filter leagues by LEAGUES map (strict)
   - Order leagues by LEAGUE_ORDER
   - Order matches inside league (LIVE -> NS -> FT)
   - Write to Firebase:
       matches_today
       matches_yesterday
       matches_tomorrow
       meta/today
       meta/cron   (interval auto-detected from previous run)
   ========================================================= */

import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import admin from "firebase-admin";

dayjs.extend(utc);
dayjs.extend(timezone);

/* ============================
   Firebase Admin Init
============================ */
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://monaleza-live-b3e0c-default-rtdb.europe-west1.firebasedatabase.app",
});

const db = admin.database();

/* ============================
   API-Football Init
============================ */
const api = axios.create({
  baseURL: "https://v3.football.api-sports.io",
  headers: {
    "x-apisports-key": process.env.API_FOOTBALL_KEY,
  },
});

/* ============================
   Cron Meta (Auto Interval)
   - Computes interval from prev last_run_at
   - First run uses fallback (12h)
============================ */
const FALLBACK_INTERVAL_MIN = Number(process.env.CRON_FALLBACK_MIN || 720);

async function writeCronMeta({ status, reason, extra = {} }) {
  const nowMs = Date.now();

  const prevSnap = await db.ref("meta/cron/last_run_at").once("value");
  const prevLastRunAt = Number(prevSnap.val() || 0);

  const intervalMs =
    prevLastRunAt > 0
      ? Math.max(60_000, nowMs - prevLastRunAt) // minimum 1 minute
      : FALLBACK_INTERVAL_MIN * 60 * 1000;

  const intervalMin = Math.round(intervalMs / 60000);
  const nextRunAt = nowMs + intervalMs;

  await db.ref("meta/cron").set({
    interval_min: intervalMin,
    last_run_at: nowMs,
    next_run_at: nextRunAt,
    status, // "ok" | "error"
    reason: reason || "",
    ...extra,
  });
}

/* ============================
   Fetch fixtures by DATE
============================ */
async function fetchFixturesByDate(dateStr, label) {
  const res = await api.get("/fixtures", {
    params: {
      date: dateStr,
      timezone: "Africa/Cairo",
    },
  });

  console.log(`[API] ${label} date=${dateStr} status=${res.status}`);
  console.log(`[API] ${label} results=${res.data?.results ?? "?"}`);

  const errors = res.data?.errors || {};
  if (errors && Object.keys(errors).length) {
    console.log(`[API] ${label} errors:`, errors);
  }

  return res.data?.response || [];
}

/* ============================
     LEAGUES FILTER MAP
============================ */
const LEAGUES = {
  // 🌍 International
  1: { ar: "كأس العالم", en: "World Cup" },
  2: { ar: "دوري أبطال أوروبا", en: "UEFA Champions League" },
  3: { ar: "الدوري الأوروبي", en: "UEFA Europa League" },
  4: { ar: "بطولة أمم أوروبا", en: "Euro Championship" },
  5: { ar: "دوري الأمم الأوروبية", en: "UEFA Nations League" },
  9: { ar: "كوبا أمريكا", en: "Copa America" },
  848: { ar: "دوري مؤتمر أمم أوروبا", en: "UEFA Europa Conference League" },
  36: { ar: "تصفيات كأس أمم أفريقيا", en: "Africa Cup of Nations - Qualification" },
  6: { ar: "كأس الأمم الإفريقية", en: "Africa Cup of Nations" },
  538: { ar: "كأس الأمم الإفريقية تحت 20 سنة", en: "Africa Cup of Nations U20" },
  12: { ar: "دوري أبطال أفريقيا", en: "CAF Champions League" },
  20: { ar: "كأس الكونفدرالية الأفريقية", en: "CAF Confederation Cup" },
  533: { ar: "كأس السوبر الأفريقي", en: "CAF Super Cup" },
  17: { ar: "دوري أبطال آسيا", en: "AFC Champions League" },
  1168: { ar: "كأس القارات للأندية", en: "FIFA Intercontinental Cup" },
  15: { ar: "كأس العالم للأندية", en: "FIFA Club World Cup" },
  13: { ar: "كأس ليبرتادوريس", en: "Copa Libertadores" },
  200: { ar: "بطولة الدوري الإفريقي", en: "African Football League" },
  7: { ar: "كأس آسيا للمنتخبات", en: "AFC Asian Cup" },

  // 🇬🇧 England
  39: { ar: "الدوري الإنجليزي", en: "Premier League" },
  45: { ar: "كأس الاتحاد الإنجليزي", en: "FA Cup" },
  48: { ar: "كأس كاراباو", en: "EFL Cup" },
  528: { ar: "كأس السوبر الإنجليزي", en: "FA Community Shield" },

  // 🇪🇸 Spain
  140: { ar: "الدوري الإسباني", en: "La Liga" },
  143: { ar: "كأس إسبانيا", en: "Copa del Rey" },
  556: { ar: "كأس السوبر الإسباني", en: "Spanish Super Cup" },

  // 🇮🇹 Italy
  135: { ar: "الدوري الإيطالي", en: "Serie A" },
  137: { ar: "كأس إيطاليا", en: "Coppa Italia" },
  547: { ar: "كأس السوبر الإيطالي", en: "Italian Super Cup" },

  // 🇩🇪 Germany
  78: { ar: "الدوري الألماني", en: "Bundesliga" },
  81: { ar: "كأس ألمانيا", en: "DFB Pokal" },
  529: { ar: "كأس السوبر الألماني", en: "German Super Cup" },

  // 🇫🇷 France
  61: { ar: "الدوري الفرنسي", en: "Ligue 1" },
  66: { ar: "كأس فرنسا", en: "Coupe de France" },
  526: { ar: "كأس السوبر الفرنسي", en: "French Super Cup" },

  // 🇸🇦 Saudi
  307: { ar: "الدوري السعودي", en: "Saudi Pro League" },
  308: { ar: "كأس خادم الحرمين الشريفين", en: "King's Cup" },
  309: { ar: "كأس السوبر السعودي", en: "Saudi Super Cup" },

  // 🇪🇬 Egypt
  233: { ar: "الدوري المصري", en: "Egyptian League" },
  714: { ar: "كأس مصر", en: "Egypt Cup" },
  539: { ar: "كأس السوبر المصري", en: "Egyptian Super Cup" },
};

/* ============================
   LEAGUE ORDER
============================ */
const LEAGUE_ORDER = [
  "World Cup",
  "FIFA Club World Cup",
  "FIFA Intercontinental Cup",
  "Euro Championship",
  "UEFA Nations League",
  "Copa America",
  "Africa Cup of Nations - Qualification",
  "Africa Cup of Nations",
  "AFC Asian Cup",
  "Africa Cup of Nations U20",

  "UEFA Champions League",
  "CAF Champions League",
  "AFC Champions League",
  "Copa Libertadores",
  "UEFA Europa League",
  "CAF Confederation Cup",
  "UEFA Europa Conference League",
  "African Football League",

  "Premier League",
  "La Liga",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
  "Egyptian League",
  "Saudi Pro League",

  "FA Cup",
  "EFL Cup",
  "Copa del Rey",
  "Coppa Italia",
  "DFB Pokal",
  "Coupe de France",
  "Egypt Cup",
  "King's Cup",

  "CAF Super Cup",
  "FA Community Shield",
  "Spanish Super Cup",
  "Italian Super Cup",
  "German Super Cup",
  "French Super Cup",
  "Egyptian Super Cup",
  "Saudi Super Cup",
];

/* ============================
   Sort matches inside league
============================ */
function sortMatches(matches) {
  const priority = {
    LIVE: 1,
    "1H": 1,
    "2H": 1,
    HT: 1,
    ET: 1,
    PEN: 1,
    NS: 2,
    FT: 3,
  };
  return matches.sort((a, b) => (priority[a.status] || 9) - (priority[b.status] || 9));
}

/* ============================
   Group + Filter + Order
============================ */
function groupFixtures(fixtures) {
  const grouped = {};
  let kept = 0;
  let dropped = 0;

  fixtures.forEach((m) => {
    const leagueId = m.league?.id;
    const leagueMap = LEAGUES[leagueId];

    // ✅ strict filter
    if (!leagueMap) {
      dropped += 1;
      return;
    }

    const leagueKey = leagueMap.en;

    if (!grouped[leagueKey]) {
      grouped[leagueKey] = {
        league_id: leagueId,
        league_name_ar: leagueMap.ar,
        league_name_en: leagueMap.en,
        league_logo: m.league?.logo ?? "",
        matches: [],
      };
    }

    grouped[leagueKey].matches.push({
      id: m.fixture?.id ?? null,
      status: m.fixture?.status?.short || "NS",
      minute: m.fixture?.status?.elapsed ?? null,
      time: m.fixture?.date ? dayjs(m.fixture.date).tz("Africa/Cairo").format("HH:mm") : "—",

      home_team: m.teams?.home?.name ?? "—",
      home_logo: m.teams?.home?.logo ?? "",
      home_score: m.goals?.home ?? null,

      away_team: m.teams?.away?.name ?? "—",
      away_logo: m.teams?.away?.logo ?? "",
      away_score: m.goals?.away ?? null,

      stadium: m.fixture?.venue?.name ?? "—",
      channel: "—", // API-Football ما بيرجعش قناة بشكل مباشر
    });

    kept += 1;
  });

  // sort matches inside each league
  Object.values(grouped).forEach((l) => {
    l.matches = sortMatches(l.matches);
  });

  // order leagues
  const ordered = {};
  LEAGUE_ORDER.forEach((name) => {
    if (grouped[name]) ordered[name] = grouped[name];
  });

  // add any league not in order (safety)
  Object.keys(grouped).forEach((name) => {
    if (!ordered[name]) ordered[name] = grouped[name];
  });

  console.log(
    `📌 Filtered matches: kept=${kept} dropped=${dropped} leagues=${Object.keys(ordered).length}`
  );

  return ordered;
}

/* ============================
   Write to Firebase
============================ */
async function writeMatches(path, fixtures, label) {
  const grouped = groupFixtures(fixtures);
  const leaguesCount = Object.keys(grouped).length;

  await db.ref(path).set(grouped);

  console.log(`✅ Wrote ${label} -> path=${path} leagues=${leaguesCount} matches=${fixtures.length}`);
  return { leaguesCount, matchesCount: fixtures.length };
}

/* ============================
   Main
============================ */
(async () => {
  try {
    const now = dayjs().tz("Africa/Cairo");

    const todayStr = now.format("YYYY-MM-DD");
    const yesterdayStr = now.subtract(1, "day").format("YYYY-MM-DD");
    const tomorrowStr = now.add(1, "day").format("YYYY-MM-DD");

    const metaSnap = await db.ref("meta/today").once("value");
    const meta = metaSnap.val();
    const needsFullRefresh = !meta?.date || meta.date !== todayStr;

    if (needsFullRefresh) {
      console.log("🌙 New day detected -> fetching Yesterday/Today/Tomorrow (once)");

      const todayFixtures = await fetchFixturesByDate(todayStr, "Today");
      const yFixtures = await fetchFixturesByDate(yesterdayStr, "Yesterday");
      const tFixtures = await fetchFixturesByDate(tomorrowStr, "Tomorrow");

      const wToday = await writeMatches("matches_today", todayFixtures, "Today");
      const wY = await writeMatches("matches_yesterday", yFixtures, "Yesterday");
      const wT = await writeMatches("matches_tomorrow", tFixtures, "Tomorrow");

      await db.ref("meta/today").set({
        date: todayStr,
        updated_at: new Date().toISOString(),
        today_matches_count: wToday.matchesCount,
        yesterday_matches_count: wY.matchesCount,
        tomorrow_matches_count: wT.matchesCount,
      });

      await writeCronMeta({ status: "ok", reason: "full_refresh", extra: { today: todayStr } });

      console.log("✅ Full refresh done");
      process.exit(0);
    }

    // same day -> update today only
    console.log("🔁 Same day -> fetching TODAY only");

    const todayFixtures = await fetchFixturesByDate(todayStr, "Today");
    const wToday = await writeMatches("matches_today", todayFixtures, "Today");

    await db.ref("meta/today/updated_at").set(new Date().toISOString());
    await db.ref("meta/today/today_matches_count").set(wToday.matchesCount);

    await writeCronMeta({ status: "ok", reason: "today_refresh", extra: { today: todayStr } });

    console.log("✅ Today refresh done");
    process.exit(0);
  } catch (err) {
    console.error("❌ Updater crashed:", err?.message || err);

    try {
      await writeCronMeta({ status: "error", reason: err?.message || "unknown_error" });
    } catch (e) {
      console.error("❌ Failed to write meta/cron:", e?.message || e);
    }

    process.exit(1);
  }
})();
