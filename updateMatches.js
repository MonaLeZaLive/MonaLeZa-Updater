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
  const liveStatuses = new Set(["1H", "2H", "HT", "ET", "BT", "P", "INT", "LIVE"]);

  return matches.sort((a, b) => {
    const aSt = a.status || "NS";
    const bSt = b.status || "NS";

    const aPri = liveStatuses.has(aSt) ? 1 : aSt === "NS" ? 2 : 3;
    const bPri = liveStatuses.has(bSt) ? 1 : bSt === "NS" ? 2 : 3;

    if (aPri !== bPri) return aPri - bPri;

    // لو الاتنين NS رتّبهم بالوقت
    return String(a.time || "").localeCompare(String(b.time || ""));
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
      home_id: m.teams.home.id,
       
      away_team: m.teams.away.name,
      away_logo: m.teams.away.logo,
      away_score: m.goals.away,
      away_id: m.teams.away.id,
       
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

async function writeFixturesToDb(fixtures, path, label, teamsArDict = null) {
  const grouped = {};
  const logger = { leagues: {}, totalMatches: 0 };

  (fixtures || []).forEach((m) => {
    const league = LEAGUES[m.league.id];
    if (!league) return;

    const leagueKey = league.en;
    const leagueName = `${league.ar} | ${league.en}`;

    if (!grouped[leagueKey]) {
      grouped[leagueKey] = {
        league_id: m.league.id,
        league_name_ar: league?.ar || m.league.name,
        league_name_en: league?.en || m.league.name,
        league_logo: m.league.logo,
        matches: [],
      };

      logger.leagues[leagueKey] = { name: leagueName, count: 0 };
    }

    grouped[leagueKey].matches.push({
      id: m.fixture.id,
      status: m.fixture.status.short || "NS",
      minute: m.fixture.status.elapsed ?? null,
      time: dayjs(m.fixture.date).tz("Africa/Cairo").format("HH:mm"),

      home_team: teamsArDict
        ? teamDisplayName(m.teams.home.id, m.teams.home.name, teamsArDict)
        : m.teams.home.name,
      home_logo: m.teams.home.logo,
      home_score: m.goals.home,
      home_id: m.teams.home.id,
 

      away_team: teamsArDict
        ? teamDisplayName(m.teams.away.id, m.teams.away.name, teamsArDict)
        : m.teams.away.name,
      away_logo: m.teams.away.logo,
      away_score: m.goals.away,
      away_id: m.teams.away.id,
 

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

  console.log("\n======================================");
  console.log(`📝 Rewrite ${label} (${path})`);
  console.log("======================================\n");
  console.log(`✅ Total leagues : ${Object.keys(logger.leagues).length}`);
  console.log(`✅ Total matches : ${logger.totalMatches}`);
  console.log("======================================\n");
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
  const PRE_START_MIN = 10;     // لو عايز قبل المباراة بكام دقيقة (مثلاً 10) خليها 10
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

// ====== Check if yesterday DB still contains active (not-finished) matches ======
function hasActiveMatchesInDb(dayData) {
  if (!dayData || typeof dayData !== "object") return false;

  const FINISHED = new Set([
    "FT", "AET", "PEN", // انتهت
    "CANC", "PST", "ABD", "WO", "AWD", "TBD" // حالات موقوفة/ملغية/غير محددة
  ]);

  for (const leagueKey of Object.keys(dayData)) {
    const league = dayData[leagueKey];
    const matches = league?.matches || [];
    for (const m of matches) {
      const st = m?.status || "NS";
      // لو مش ضمن المنتهي يبقى لسه شغال/لايف/بداية/شوط/إضافة... إلخ
      if (!FINISHED.has(st)) return true;
    }
  }
  return false;
}


// ====== Extract unique teams from fixtures (API-Football response) ======
function extractTeams(fixtures) {
  const map = new Map();
  for (const m of fixtures || []) {
    const h = m?.teams?.home;
    const a = m?.teams?.away;
    if (h?.id && h?.name) map.set(h.id, { id: h.id, en: h.name });
    if (a?.id && a?.name) map.set(a.id, { id: a.id, en: a.name });
  }
  return Array.from(map.values());
}

// ====== Save/update teams index (no translations) ======
async function upsertTeamsIndex(teams) {
  if (!teams?.length) return;
  const updates = {};
  const nowIso = new Date().toISOString();
  for (const t of teams) {
    updates[`teams_index/${t.id}`] = { en: t.en, last_seen: nowIso };
  }
  await db.ref().update(updates);
}

// ====== Read existing Arabic dictionary from Firebase ======
async function readTeamsArDict() {
  const snap = await db.ref("dict/teams_ar").once("value");
  return snap.val() || {};
}

// ====== Fetch Arabic labels from Wikidata (stronger, best-effort) ======
async function fetchWikidataArabicLabelsBatch(teamsBatch) {
  const endpoint = "https://query.wikidata.org/sparql";

  // 1) Try SPARQL exact label match (your current approach)
  const values = teamsBatch
    .map((t) => `"${String(t.en).replace(/"/g, '\\"')}"@en`)
    .join(" ");

  const query = `
SELECT ?enLabel ?arLabel WHERE {
  VALUES ?enLabel { ${values} }
  ?item rdfs:label ?enLabel .
  OPTIONAL { ?item rdfs:label ?arLabel FILTER(LANG(?arLabel) = "ar") }
}
`;

  const out = new Map(); // en -> ar

  try {
    const res = await axios.get(endpoint, {
      headers: {
        Accept: "application/sparql+json",
        "User-Agent": "monaleza-live/1.0 (contact: github-actions)",
      },
      params: { format: "json", query },
      timeout: 15000,
    });

    const rows = res?.data?.results?.bindings || [];
    for (const r of rows) {
      const en = r?.enLabel?.value;
      const ar = r?.arLabel?.value;
      if (en && ar) out.set(en, ar);
    }
  } catch (e) {
    console.log("⚠️ SPARQL failed →", e?.message || e);
  }

  // 2) Fallback: if some EN names still missing, use Wikidata API search
  const missing = teamsBatch.filter((t) => !out.has(t.en));
  if (!missing.length) return out;

  try {
    // Search IDs one-by-one (limit) then get labels in ONE request
    const ids = [];

    for (const t of missing) {
      const s = await axios.get("https://www.wikidata.org/w/api.php", {
        params: {
          action: "wbsearchentities",
          format: "json",
          language: "en",
          uselang: "en",
          search: t.en,
          limit: 1,
        },
        headers: { "User-Agent": "monaleza-live/1.0 (contact: github-actions)" },
        timeout: 15000,
      });

      const id = s?.data?.search?.[0]?.id;
      if (id) ids.push({ en: t.en, id });
    }

    if (!ids.length) return out;

    // Fetch Arabic labels for all found IDs in a single request
    const idsStr = ids.map((x) => x.id).join("|");
    const g = await axios.get("https://www.wikidata.org/w/api.php", {
      params: {
        action: "wbgetentities",
        format: "json",
        props: "labels",
        languages: "ar|en",
        ids: idsStr,
      },
      headers: { "User-Agent": "monaleza-live/1.0 (contact: github-actions)" },
      timeout: 15000,
    });

    const entities = g?.data?.entities || {};
    for (const item of ids) {
      const ent = entities[item.id];
      const ar = ent?.labels?.ar?.value;
      if (ar) out.set(item.en, ar);
    }

    return out;
  } catch (e) {
    console.log("⚠️ Wikidata API fallback failed →", e?.message || e);
    return out; // fail-safe
  }
}


// ====== Make display name "AR | EN" using dict ======
function teamDisplayName(teamId, enName, dict) {
  const ar = dict?.[teamId]?.ar;
  if (ar) return `${ar} | ${enName}`;
  return enName; // fallback safe
}

// ====== Arabic translation queue (per-day) ======

function queueRootForDay(dayStr) {
  return `meta/ar_queue/${dayStr}`;
}

function queueStateForDay(dayStr) {
  return `meta/ar_queue_state/${dayStr}`;
}

// Build queue with missing team IDs (only once/day)
async function buildArabicQueueForDay(dayStr, teams, existingDict) {
  const root = queueRootForDay(dayStr);

  // لو queue موجودة بالفعل -> متعيدش بنائها
  const stateSnap = await db.ref(queueStateForDay(dayStr)).once("value");
  const state = stateSnap.val();
  if (state?.built) {
    console.log("✅ Arabic queue already built for today → skip build");
    return;
  }

  const updates = {};
  let missingCount = 0;

  for (const t of teams || []) {
    if (!t?.id) continue;
    // لو متترجمش قبل كده
    if (!existingDict?.[t.id]?.ar) {
      updates[`${root}/${t.id}`] = true;
      missingCount++;
    }
  }

  if (missingCount > 0) {
    await db.ref().update(updates);
  }

  await db.ref(queueStateForDay(dayStr)).set({
    built: true,
    done: missingCount === 0,
    remaining: missingCount,
    updated_at: new Date().toISOString(),
  });

  console.log(`🧩 Arabic queue built: missing=${missingCount}`);
}

// Read next batch (limit 20) from queue
async function readArabicQueueBatch(dayStr, limit = 20) {
  const root = queueRootForDay(dayStr);
  const snap = await db.ref(root).orderByKey().limitToFirst(limit).once("value");
  const val = snap.val() || {};
  const ids = Object.keys(val);
  return ids;
}

async function removeFromArabicQueue(dayStr, ids) {
  if (!ids?.length) return;
  const root = queueRootForDay(dayStr);
  const updates = {};
  for (const id of ids) updates[`${root}/${id}`] = null;
  await db.ref().update(updates);
}

// Translate a batch by using teams_index names (EN) + Wikidata
async function translateArabicBatch(dayStr, ids, dict) {
  if (!ids?.length) return { tried: 0, added: 0, failed: 0 };

  // هات أسماء EN من teams_index
  const indexSnap = await db.ref("teams_index").once("value");
  const index = indexSnap.val() || {};

  const teamsBatch = ids
    .map((id) => {
      const en = index?.[id]?.en;
      if (!en) return null;
      return { id, en };
    })
    .filter(Boolean);

  if (!teamsBatch.length) {
    // مفيش أسماء EN -> نشيلهم من queue عشان مايتكرروش
    await removeFromArabicQueue(dayStr, ids);
    return { tried: ids.length, added: 0, failed: ids.length };
  }

  const enToAr = await fetchWikidataArabicLabelsBatch(teamsBatch);

  const nowIso = new Date().toISOString();
  const updates = {};
  let added = 0;
  let failed = 0;

  for (const t of teamsBatch) {
    // لو اتترجم قبل كده خلاص
    if (dict?.[t.id]?.ar) continue;

    const ar = enToAr.get(t.en);
    if (ar) {
      updates[`dict/teams_ar/${t.id}`] = {
        ar,
        en: t.en,
        source: "wikidata",
        updated_at: nowIso,
      };
      added++;
    } else {
      // سجل الفشل مرة واحدة (عشان مايتكرر)
      updates[`dict/teams_ar_fail/${t.id}`] = {
        en: t.en,
        updated_at: nowIso,
      };
      failed++;
    }
  }

  if (Object.keys(updates).length) {
    await db.ref().update(updates);
  }

  // شيل كل IDs اللي حاولنا عليهم من queue (نجح/فشل) → لا إعادة
  await removeFromArabicQueue(dayStr, ids);

  return { tried: ids.length, added, failed };
}

// After each run update queue state (done/remaining)
async function refreshArabicQueueState(dayStr) {
  const root = queueRootForDay(dayStr);
  const snap = await db.ref(root).once("value");
  const val = snap.val() || {};
  const remaining = Object.keys(val).length;

  await db.ref(queueStateForDay(dayStr)).update({
    done: remaining === 0,
    remaining,
    updated_at: new Date().toISOString(),
  });

  return remaining;
}

// Main: process 20 teams per run until done
async function processArabicQueueIfNeeded(dayStr) {
  const stateSnap = await db.ref(queueStateForDay(dayStr)).once("value");
  const state = stateSnap.val();

  if (!state?.built) {
    console.log("ℹ️ Arabic queue not built yet → skip");
    return { skipped: true };
  }
  if (state?.done) {
    console.log("✅ Arabic queue done → no Wikidata calls");
    return { skipped: true };
  }

  const dict = await readTeamsArDict();
  const ids = await readArabicQueueBatch(dayStr, 10);

  if (!ids.length) {
    const remaining = await refreshArabicQueueState(dayStr);
    console.log(`✅ Arabic queue empty now (remaining=${remaining})`);
    return { skipped: true };
  }

  console.log(`🌍 Arabic batch: translating ${ids.length} teams...`);
  const res = await translateArabicBatch(dayStr, ids, dict);
  const remaining = await refreshArabicQueueState(dayStr);

  console.log(`✅ Arabic batch done: tried=${res.tried}, added=${res.added}, failed=${res.failed}, remaining=${remaining}`);
  return { skipped: false, ...res, remaining };
}

// ====== Helpers to ensure Tomorrow exists even if full refresh didn't run ======

async function readDbOnce(path) {
  const snap = await db.ref(path).once("value");
  return snap.val();
}

function stripAr(name) {
  const parts = String(name || "").split(" | ");
  return parts.length === 2 ? parts[1] : String(name || "");
}

async function rewriteStoredMatchesWithDict(path, dict) {
  const data = await readDbOnce(path);
  if (!data || typeof data !== "object") return false;

  for (const leagueKey of Object.keys(data)) {
    const league = data[leagueKey];
    const matches = league?.matches || [];

    for (const m of matches) {
      if (m?.home_id) m.home_team = teamDisplayName(m.home_id, stripAr(m.home_team), dict);
      if (m?.away_id) m.away_team = teamDisplayName(m.away_id, stripAr(m.away_team), dict);
    }
  }

  await db.ref(path).set(data);
  return true;
}


function isTomorrowDataMissing(tomorrowData) {
  // لو null/undefined أو object فاضي
  if (!tomorrowData) return true;
  if (typeof tomorrowData !== "object") return true;
  return Object.keys(tomorrowData).length === 0;
}

async function ensureTomorrowFetched(tomorrowStr) {
  // 1) شوف لو matches_tomorrow موجود ولا لأ
  const existingTomorrow = await readDbOnce("matches_tomorrow");
  const missing = isTomorrowDataMissing(existingTomorrow);

  // 2) لو فاضي، اسحب الغد
  if (missing) {
    console.log("📌 matches_tomorrow missing → fetching TOMORROW");
    const tFixtures = await fetchByDate(tomorrowStr, "matches_tomorrow", "Tomorrow");

    // لو عايز تضمن العربي كمان
    const dict = await readTeamsArDict();
    await writeFixturesToDb(tFixtures, "matches_tomorrow", "Tomorrow", dict);

    return true;
  }

  console.log("✅ matches_tomorrow already exists → skip tomorrow fetch");
  return false;
}


/* ====== تنظبم ====== */

(async () => {
  const now = dayjs().tz("Africa/Cairo");

  const todayStr = now.format("YYYY-MM-DD");
  const yesterday = now.subtract(1, "day").format("YYYY-MM-DD");
  const tomorrow = now.add(1, "day").format("YYYY-MM-DD");

  // ✅ نقرأ meta علشان نضمن إن 3 أيام تتسحب مرة واحدة بس (أول رن في اليوم)
  const metaSnap = await db.ref("meta/today").once("value");
  const meta = metaSnap.val();

  const needsFullRefresh = !meta?.date || meta.date !== todayStr;

  // ============================
  // 1) أول رن في اليوم → اسحب 3 أيام مرة واحدة
  // ============================
if (needsFullRefresh) {
  console.log("🌙 New day detected → fetching Yesterday/Today/Tomorrow (once)");

  // 1) API-Football: 3 calls
  const todayFixtures = await fetchByDate(todayStr, "matches_today", "Today");
  const yFixtures = await fetchByDate(yesterday, "matches_yesterday", "Yesterday");
  const tFixtures = await fetchByDate(tomorrow, "matches_tomorrow", "Tomorrow");

  // 2) matches_time لليوم
  await db.ref("matches_time").set(buildTodayMatchesTime(todayFixtures));

  // 3) collect teams (3 أيام) + uniqueTeams
  const allTeams = [
    ...extractTeams(todayFixtures),
    ...extractTeams(yFixtures),
    ...extractTeams(tFixtures),
  ];

  const uniq = new Map();
  for (const t of allTeams) uniq.set(t.id, t);
  const uniqueTeams = Array.from(uniq.values());

  // 4) teams_index (عشان الترجمة بالـ queue تعتمد عليه)
  await upsertTeamsIndex(uniqueTeams);

  // 5) dict الحالي (موجود مترجم قبل كده)
  const existing = await readTeamsArDict();

  // 6) ابنِ queue من الناقص (مرة واحدة فقط في اليوم)
  await buildArabicQueueForDay(todayStr, uniqueTeams, existing);

  // 7) اكتب الـ DB بـ الموجود من الترجمات فقط
  await writeFixturesToDb(todayFixtures, "matches_today", "Today", existing);
  await writeFixturesToDb(yFixtures, "matches_yesterday", "Yesterday", existing);
  await writeFixturesToDb(tFixtures, "matches_tomorrow", "Tomorrow", existing);

  await db.ref("meta/today").set({
    date: todayStr,
    updated_at: new Date().toISOString(),
    today_matches_count: todayFixtures?.length ?? 0,
  });

  console.log("✅ Full refresh done");
  process.exit(0);
}

const tomorrowFetched = await ensureTomorrowFetched(tomorrow);

// ✅ Continue Arabic translations gradually (20 per run) until done
const arRun = await processArabicQueueIfNeeded(todayStr);
const arabicDidWork = !arRun?.skipped; // true لو ترجم دفعة

if (arabicDidWork) {
  const dictAfter = await readTeamsArDict();
  await rewriteStoredMatchesWithDict("matches_today", dictAfter);
  await rewriteStoredMatchesWithDict("matches_yesterday", dictAfter);
  await rewriteStoredMatchesWithDict("matches_tomorrow", dictAfter);
}
   

 // ============================
// 2) باقي اليوم → اسحب اليوم فقط (بس لو في ماتش قريب/داخل نافذة التحديث)
// ============================

// اقرأ matches_time من Firebase
const mtSnap = await db.ref("matches_time").once("value");
const matchesTime = mtSnap.val();

// 1) شوف لو الأمس لسه فيه ماتشات مش منتهية من DB
const ySnap = await db.ref("matches_yesterday").once("value");
const yData = ySnap.val();
const yesterdayActive = hasActiveMatchesInDb(yData);

// 2) القرار: نسحب اليوم؟ (حسب نافذة الماتشات)
const shouldFetchToday = shouldFetchNowFromMatchesTime(matchesTime, now);

// 3) لو لا اليوم ولا الأمس محتاجين تحديث → وقف
if (!shouldFetchToday && !yesterdayActive && !tomorrowFetched && !arabicDidWork) {
  console.log("🛑 Nothing to do (no matches + no arabic work) → exit");
  process.exit(0);
}


const dict = await readTeamsArDict();

// 4) لو الأمس لسه فيه شغل → اسحب الأمس وحدثه (ده هيتكرر لحد ما يخلص)
if (yesterdayActive) {
  console.log("🔥 Yesterday still active → fetching YESTERDAY");
  const yFixtures = await fetchByDate(yesterday, "matches_yesterday", "Yesterday");
  await writeFixturesToDb(yFixtures, "matches_yesterday", "Yesterday", dict);
}

// 5) لو نافذة اليوم شغالة → اسحب اليوم وحدثه
if (shouldFetchToday) {
  console.log("🔥 Match window active → fetching TODAY");
  const todayFixtures = await fetchByDate(todayStr, "matches_today", "Today");
  await db.ref("matches_time").set(buildTodayMatchesTime(todayFixtures));
  await writeFixturesToDb(todayFixtures, "matches_today", "Today", dict);
} else {
  console.log("ℹ️ Today not in window → skip today fetch");
}

console.log("✅ Live update done");
process.exit(0);

})();

