/* =========================================================
   MonaLeZa Live - Clean Cron (No Filters, No League Ordering)
   - Fetch fixtures from API-Football
   - Write grouped data to Firebase Realtime Database
   - Write meta/cron for the timer in the app
   ========================================================= */

/* ====== HTTP Client ====== */
import axios from "axios";

/* ====== Dates & Timezones ====== */
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
dayjs.extend(utc);
dayjs.extend(timezone);

/* ====== Firebase Admin (Server) ====== */
import admin from "firebase-admin";

/* =========================================================
   1) Firebase Admin Init
   ========================================================= */
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://monaleza-live-b3e0c-default-rtdb.europe-west1.firebasedatabase.app",
});

const db = admin.database();

/* =========================================================
   2) API-Football Init
   ========================================================= */
const api = axios.create({
  baseURL: "https://v3.football.api-sports.io",
  headers: {
    "x-apisports-key": process.env.API_FOOTBALL_KEY,
  },
});

/* =========================================================
   3) Cron Meta (Timer for the app)
   - interval is read from ENV so it changes automatically
   ========================================================= */
const CRON_INTERVAL_MIN = Number(process.env.CRON_INTERVAL_MIN || 15);
const CRON_INTERVAL_MS = CRON_INTERVAL_MIN * 60 * 1000;

async function writeCronMeta({ status, reason, extra = {} }) {
  const nowMs = Date.now();
  const nextRunAt = nowMs + CRON_INTERVAL_MS;

  await db.ref("meta/cron").set({
    interval_min: CRON_INTERVAL_MIN,
    last_run_at: nowMs,
    next_run_at: nextRunAt,
    status, // "ok" | "error"
    reason: reason || "",
    ...extra,
  });
}

/* =========================================================
   4) Fetch fixtures by date (robust)
   - Use from/to instead of date to avoid "tomorrow=0" issues
   ========================================================= */
async function fetchFixturesByDate(dateStr) {
  const res = await api.get("/fixtures", {
    params: {
      from: dateStr,
      to: dateStr,
      timezone: "Africa/Cairo",
    },
  });

  // Simple logs to see what is returned
  console.log(`[API] date=${dateStr} status=${res.status}`);
  console.log(`[API] results=${res.data?.results ?? "?"}`);
  if (res.data?.errors && Object.keys(res.data.errors).length) {
    console.log("[API] errors:", res.data.errors);
  }

  return res.data?.response || [];
}

/* =========================================================
   5) Transform: Group fixtures by league (NO FILTERS)
   Output shape:
   {
     "<leagueKey>": {
       league_id,
       league_name_ar,
       league_name_en,
       league_logo,
       matches: [...]
     },
     ...
   }
   ========================================================= */
function groupFixtures(fixtures) {
  const grouped = {};

  fixtures.forEach((m) => {
    const leagueId = m.league?.id ?? "unknown";
    const leagueName = m.league?.name ?? "Unknown League";
    const leagueLogo = m.league?.logo ?? "";

    // Use league id as stable key
    const leagueKey = String(leagueId);

    if (!grouped[leagueKey]) {
      grouped[leagueKey] = {
        league_id: leagueId,
        league_name_ar: leagueName, // no mapping => same name
        league_name_en: leagueName, // no mapping => same name
        league_logo: leagueLogo,
        matches: [],
      };
    }

    grouped[leagueKey].matches.push({
      id: m.fixture?.id ?? null,

      status: m.fixture?.status?.short || "NS",
      minute: m.fixture?.status?.elapsed ?? null,

      // Cairo time formatted
      time: m.fixture?.date
        ? dayjs(m.fixture.date).tz("Africa/Cairo").format("HH:mm")
        : "—",

      home_team: m.teams?.home?.name ?? "—",
      home_logo: m.teams?.home?.logo ?? "",
      home_score: m.goals?.home ?? null,

      away_team: m.teams?.away?.name ?? "—",
      away_logo: m.teams?.away?.logo ?? "",
      away_score: m.goals?.away ?? null,

      stadium: m.fixture?.venue?.name ?? "—",
      // لو عايز تحط حاجات زيادة مستقبلاً:
      // country: m.league?.country ?? "",
      // round: m.league?.round ?? "",
    });
  });

  return grouped;
}

/* =========================================================
   6) Write data to Firebase
   ========================================================= */
async function writeMatches(path, fixtures, label) {
  const grouped = groupFixtures(fixtures);

  const leaguesCount = Object.keys(grouped).length;
  const matchesCount = fixtures.length;

  await db.ref(path).set(grouped);

  console.log(
    `✅ Wrote ${label} -> path=${path} leagues=${leaguesCount} matches=${matchesCount}`
  );

  return { leaguesCount, matchesCount };
}

/* =========================================================
   7) Main Job
   - Once per day: fetch (Yesterday / Today / Tomorrow)
   - Other runs: fetch Today only
   ========================================================= */
(async () => {
  try {
    const now = dayjs().tz("Africa/Cairo");

    const todayStr = now.format("YYYY-MM-DD");
    const yesterdayStr = now.subtract(1, "day").format("YYYY-MM-DD");
    const tomorrowStr = now.add(1, "day").format("YYYY-MM-DD");

    // read meta/today to know if new day
    const metaSnap = await db.ref("meta/today").once("value");
    const meta = metaSnap.val();

    const needsFullRefresh = !meta?.date || meta.date !== todayStr;

    if (needsFullRefresh) {
      console.log("🌙 New day detected -> fetching Yesterday/Today/Tomorrow (once)");

      const todayFixtures = await fetchFixturesByDate(todayStr);
      const yFixtures = await fetchFixturesByDate(yesterdayStr);
      const tFixtures = await fetchFixturesByDate(tomorrowStr);

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

      await writeCronMeta({
        status: "ok",
        reason: "full_refresh",
        extra: {
          today: todayStr,
          yesterday: yesterdayStr,
          tomorrow: tomorrowStr,
        },
      });

      console.log("✅ Full refresh done");
      process.exit(0);
    }

    // Not first run today -> update Today only
    console.log("🔁 Same day -> fetching TODAY only");

    const todayFixtures = await fetchFixturesByDate(todayStr);
    const wToday = await writeMatches("matches_today", todayFixtures, "Today");

    await db.ref("meta/today/updated_at").set(new Date().toISOString());
    await db.ref("meta/today/today_matches_count").set(wToday.matchesCount);

    await writeCronMeta({
      status: "ok",
      reason: "today_update",
      extra: {
        today: todayStr,
        today_matches_count: wToday.matchesCount,
      },
    });

    console.log("✅ Today update done");
    process.exit(0);
  } catch (err) {
    console.error("❌ Job crashed:", err?.message || err);

    try {
      await writeCronMeta({
        status: "error",
        reason: err?.message || "unknown_error",
      });
    } catch (e) {
      console.error("❌ Failed to write meta/cron:", e?.message || e);
    }

    process.exit(1);
  }
})();
