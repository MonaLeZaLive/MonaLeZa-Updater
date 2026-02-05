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
   Leagues Map (AR + EN)
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
