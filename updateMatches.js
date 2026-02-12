/* ====== علشان تعمل Request للـ API Football ====== */
import axios from "axios";
/* ====== علشان تتعامل مع التواريخ والأوقات بسهولة ====== */
import dayjs from "dayjs";
/* ====== علشان تكتب الداتا في Firebase Realtime Database من سيرفر (GitHub Actions) ====== */
import admin from "firebase-admin";
/* ====== علشان dayjs يعرف يحول الوقت ويشتغل على توقيت مصر ====== */
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
/* ====== تفعيل الـ plugins ====== */
dayjs.extend(utc);
dayjs.extend(timezone);

/* ============================
   تهيئة ال Firebase Admin
============================ */
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://monaleza-live-b3e0c-default-rtdb.europe-west1.firebasedatabase.app",
});

const db = admin.database();
/* ============================
   نهاية تهيئة ال Firebase Admin
============================ */
/* ============================
      تهيئة ال API Football
============================ */
const api = axios.create({
  baseURL: "https://v3.football.api-sports.io",
  headers: {
    "x-apisports-key": process.env.API_FOOTBALL_KEY,
  },
});
/* ============================
     نهاية تهيئة ال API Football
============================ */
/* ============================
     خريطة البطولات LEAGUES
============================ */
const LEAGUES = {
  // 🌍 International
  1:  { ar: "كأس العالم", en: "World Cup" },
  2:  { ar: "دوري أبطال أوروبا", en: "UEFA Champions League" },
  3:  { ar: "الدوري الأوروبي", en: "UEFA Europa League" },
  4:  { ar: "بطولة أمم أوروبا", en: "Euro Championship" }, 
  5:  { ar: "دوري الأمم الأوروبية", en: "UEFA Nations League" },
  9:  { ar: "كوبا أمريكا", en: "Copa America" },
  848:{ ar: "دوري مؤتمر أمم أوروبا", en: "UEFA Europa Conference League" },
  36: { ar: "تصفيات كأس أمم أفريقيا", en: "Africa Cup of Nations - Qualification" }, 
  6:  { ar: "كأس الأمم الإفريقية", en: "Africa Cup of Nations" },
  538:{ ar: "كأس الأمم الإفريقية تحت 20 سنة", en: "Africa Cup of Nations U20" },
  12: { ar: "دوري أبطال أفريقيا", en: "CAF Champions League" },
  20: { ar: "كأس الكونفدرالية الأفريقية", en: "CAF Confederation Cup" },
  533:{ ar: "كأس السوبر الأفريقي", en: "CAF Super Cup" },
  17: { ar: "دوري أبطال آسيا", en: "AFC Champions League" },
  1168: { ar: "كأس القارات للأندية", en: "FIFA Intercontinental Cup" },
  15: { ar: "كأس العالم للأندية", en: "FIFA Club World Cup" },
  13: { ar: "كأس ليبرتادوريس ", en: "Copa Libertadores" },
  200:{ ar: "بطولة الدوري الإفريقي", en: "African Football League" },
  7:  { ar: "كأس آسيا للمنتخبات", en: "AFC Asian Cup" },

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
    نهاية خريطة البطولات LEAGUES
============================ */
/* ============================
 ترتيب عرض البطولات LEAGUE_ORDER
============================ */
const LEAGUE_ORDER = [
  /* 🌍 National Teams */
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

  /* 🌍 Continental / International Leagues */
  "UEFA Champions League",
  "CAF Champions League",
  "AFC Champions League",
  "Copa Libertadores", 
  "UEFA Europa League",
  "CAF Confederation Cup",
  "UEFA Europa Conference League", 
  "African Football League",

  /* 🏆 Leagues (Domestic) */
  "Premier League",
  "La Liga",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
  "Egyptian League", 
  "Saudi Pro League",
   
  /* 🏆 Cups */
  "FA Cup",
  "EFL Cup",
  "Copa del Rey",
  "Coppa Italia",
  "DFB Pokal",
  "Coupe de France",
  "Egypt Cup",
  "King's Cup",
   
  /* 🛡 Super Cups */ 
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
نهاية ترتيب عرض البطولات LEAGUE_ORDER
============================ */

/* ====== ترتيب الماتشات جوّه كل بطولة ====== */

function sortMatches(matches) {
  const priority = { LIVE: 1, NS: 2, FT: 3 };

  return matches.sort((a, b) => {
    const aStatus = a.status || "NS";
    const bStatus = b.status || "NS";

    return (priority[aStatus] || 3) - (priority[bStatus] || 3);
  });
}

/* ====== نهاية ترتيب الماتشات جوّه كل بطولة ====== */
/* ====== بداية قلب الصفحة ====== */

/* ====== لليوم المطلوب (Fixtures) تسحب التجيزات ====== */
async function fetchByDate(date, path, label) {
  const res = await api.get("/fixtures", {
   params: { date, timezone: "Africa/Cairo" }

  });

  const grouped = {};
  const logger = {
    leagues: {},
    totalMatches: 0,
  };

/* ====== المسؤول عن عدم دخول اي مباراه من خارج الفلتر ====== */
  res.data.response.forEach((m) => {
   const league = LEAGUES[m.league.id];
if (!league) return; // ⛔ فلترة صارمة بالـ ID
     
const leagueKey = league.en;
const leagueName = `${league.ar} | ${league.en}`;

/* ====== تجميع الماتشات حسب البطولة ====== */
    if (!grouped[leagueKey]) {
      grouped[leagueKey] = {
  league_id: m.league.id,
  league_name_ar: league?.ar || m.league.name,
  league_name_en: league?.en || m.league.name,
  league_logo: m.league.logo,
  matches: [],
};

/* ======  ====== */
      logger.leagues[leagueKey] = {
        name: leagueName,
        count: 0,
      };
    }

 /* ======  شكل الي بتظهر بيه الكروت ف الصفحة====== */
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
 /* ====== نهاية شكل الي بتظهر بيه الكروت ف الصفحة ====== */   

    logger.leagues[leagueKey].count += 1;
    logger.totalMatches += 1;
  });

/* ======  وترتيب الماتشات داخلها LEAGUE_ORDER ترتيب البطولات حسب ====== */   
  const ordered = {};
  LEAGUE_ORDER.forEach((l) => {
    if (grouped[l]) {
      grouped[l].matches = sortMatches(grouped[l].matches);
      ordered[l] = grouped[l];
    }
  });

/* ====== هنا بنكتب المباريات ف مكان معين ====== */   
  await db.ref(path).set(ordered);
   
/* ====== بيطع الشكل الي بيظهر بعمل من بنعمل رن في الاكشن ====== */
  console.log("\n======================================");
  console.log(`📅 ${label} (${date})`);
  console.log("======================================\n");

  LEAGUE_ORDER.forEach((key) => {
    if (logger.leagues[key]) {
      const l = logger.leagues[key];
      console.log(`🏆 ${l.name}`);
      console.log(`   ↳ Matches: ${l.count}\n`);
    }
  });

  console.log("--------------------------------------");
  console.log(`✅ Total leagues : ${Object.keys(logger.leagues).length}`);
  console.log(`✅ Total matches : ${logger.totalMatches}`);
  console.log("======================================\n");
   return res.data.response;
}

/* ====== ف مكان لوحده firebase هنا عشان يظهر توقيت المباريات ف ال ====== */

function buildTodayMatchesTime(fixtures) {
  return fixtures
    .filter((m) => LEAGUES[m.league?.id]) // نفس فلتر البطولات
    .map((m) => {
      const dt = dayjs(m.fixture.date).tz("Africa/Cairo");
      return {
        time: dt.format("HH:mm"),
        fixture_id: m.fixture.id,
        home: m.teams.home.name,
        away: m.teams.away.name,
      };
    })
    // ترتيب حسب الوقت (من القريب للبعيد)
    .sort((a, b) => a.time.localeCompare(b.time));
}

/* ====== عشان يقرر نسحب داتا ولا لا  ====== */

function normalizeMatchesTime(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object") return Object.values(raw);
  return [];
}

// بيرجع true لو فيه ماتش دلوقتي (تقريبًا) أو داخل خلال PRE_START_MIN
function shouldFetchNowFromMatchesTime(matchesTimeRaw, nowCairo) {
  const PRE_START_MIN = 0;     // لو عايز قبل المباراة بكام دقيقة (مثلاً 10) خليها 10
  const MATCH_WINDOW_MIN = 160; // 2س 40د تقريبًا (زود/قلل براحتك)

  const list = normalizeMatchesTime(matchesTimeRaw);

  // list ممكن تكون [{time:"12:00"...}] أو ["12:00"...]
  const times = list
    .map((x) => (typeof x === "string" ? x : x?.time))
    .filter(Boolean);

  if (!times.length) return false;

  const now = dayjs(nowCairo); // already Cairo tz
  const nowMin = now.hour() * 60 + now.minute();

  // نحول كل "HH:mm" لدقائق من بداية اليوم
  for (const t of times) {
    const [hh, mm] = String(t).split(":").map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) continue;

    const matchMin = hh * 60 + mm;

    // نافذة السحب: من (قبل المباراة PRE_START) لحد (بعدها MATCH_WINDOW)
    const start = matchMin - PRE_START_MIN;
    const end = matchMin + MATCH_WINDOW_MIN;

    if (nowMin >= start && nowMin <= end) return true;
  }

  return false;
}

// الحالات اللي نعتبرها "ماتش شغال فعليًا"
const ACTIVE_STATUSES = new Set([
  "1H",  // الشوط الأول
  "2H",  // الشوط الثاني
  "HT",  // استراحة
  "ET",  // وقت إضافي
  "P",   // ركلات ترجيح
  "BT",  // استراحة قبل الإضافي
  "LIVE" // لو API بيرجع LIVE مباشرة
]);

function hasLiveMatches(fixturesResponseArray) {
  const filtered = fixturesResponseArray.filter(
    (m) => LEAGUES[m.league?.id]
  );

  return filtered.some((m) =>
    ACTIVE_STATUSES.has(m.fixture?.status?.short)
  );
}

/* ====== core job نسحب التيم من ال  ====== */

const CRON_INTERVAL_MIN = 15;
const CRON_INTERVAL_MS = CRON_INTERVAL_MIN * 60 * 1000;

async function writeCronMeta({ status, reason, extra = {} }) {
  const nowMs = Date.now();
  const nextRunAt = nowMs + CRON_INTERVAL_MS;

  await db.ref("meta/cron").set({
    interval_min: CRON_INTERVAL_MIN,
    last_run_at: nowMs,
    next_run_at: nextRunAt,

    status,          // "ok" | "skip" | "error"
    reason: reason || "",

    ...extra,
  });
}

/* ====== تنظبم ====== */

(async () => {
  try {
    const now = dayjs().tz("Africa/Cairo");

    const todayStr = now.format("YYYY-MM-DD");
    const yesterday = now.subtract(1, "day").format("YYYY-MM-DD");
    const tomorrow = now.add(1, "day").format("YYYY-MM-DD");

    const metaSnap = await db.ref("meta/today").once("value");
    const meta = metaSnap.val();

    const needsFullRefresh = !meta?.date || meta.date !== todayStr;

    // 1) أول رن في اليوم
    if (needsFullRefresh) {
      console.log("🌙 New day detected → fetching Yesterday/Today/Tomorrow (once)");

      const todayFixtures = await fetchByDate(todayStr, "matches_today", "Today");
      const yesterdayFixtures = await fetchByDate(yesterday, "matches_yesterday", "Yesterday");
      await fetchByDate(tomorrow, "matches_tomorrow", "Tomorrow");

     await db.ref("matches_time").set(buildTodayMatchesTime(todayFixtures) || []);

      const yesterdayActive = hasLiveMatches(yesterdayFixtures);

      await db.ref("meta/today").set({
        date: todayStr,
        updated_at: new Date().toISOString(),
        today_matches_count: todayFixtures?.length ?? 0,
        yesterday_active: yesterdayActive,
      });

      await writeCronMeta({
        status: "ok",
        reason: "full_refresh",
        extra: {
          today: todayStr,
          yesterday_active: yesterdayActive,
        },
      });

      console.log("✅ Full refresh done");
      process.exit(0);
    }

    // 2) باقي اليوم

    // (A) تحديث أمس لو لسه active
    if (meta?.yesterday_active) {
      console.log("⏳ Yesterday still active → fetching YESTERDAY update");
      const yFixtures = await fetchByDate(yesterday, "matches_yesterday", "Yesterday");

      const stillActive = hasLiveMatches(yFixtures);
      await db.ref("meta/today/yesterday_active").set(stillActive);

      // optional: تحديث وقت آخر تحديث
      await db.ref("meta/today/updated_at").set(new Date().toISOString());

      if (!stillActive) {
        console.log("✅ Yesterday finished → stop fetching yesterday from now on");
      }
    }

    // (B) قرار تحديث اليوم
    const mtSnap = await db.ref("matches_time").once("value");
    const matchesTime = mtSnap.val();

    const shouldFetch = shouldFetchNowFromMatchesTime(matchesTime, now);

    if (!shouldFetch) {
      await writeCronMeta({
        status: "skip",
        reason: "no_live_or_near_today_matches",
        extra: { today: todayStr },
      });

      console.log("🛑 No live/near matches now → skipping TODAY API call");
      process.exit(0);
    }

    console.log("🔥 Match window active → fetching TODAY");
    const todayFixtures = await fetchByDate(todayStr, "matches_today", "Today");
    await db.ref("matches_time").set(buildTodayMatchesTime(todayFixtures) || []);

    await db.ref("meta/today/updated_at").set(new Date().toISOString());

    await writeCronMeta({
      status: "ok",
      reason: "live_update_today",
      extra: {
        today: todayStr,
        today_matches_count: todayFixtures?.length ?? 0,
      },
    });

    console.log("✅ Live update done");
    process.exit(0);
  } catch (err) {
    console.error("❌ Cron job crashed:", err?.message || err);

    await writeCronMeta({
      status: "error",
      reason: err?.message || "unknown_error",
    });

    process.exit(1);
  }
})();

