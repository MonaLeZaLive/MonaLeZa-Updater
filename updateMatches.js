/**
 * updateMatches.js
 * Fetch ALL football fixtures from API-Football (no filters)
 * Save everything to Firebase Realtime Database
 */

const axios = require("axios");
const admin = require("firebase-admin");

// ===== ENV CHECK =====
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT is missing");
}
if (!process.env.API_FOOTBALL_KEY) {
  throw new Error("API_FOOTBALL_KEY is missing");
}

// ===== Firebase Init =====
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://monaleza-live-b3e0c-default-rtdb.europe-west1.firebasedatabase.app/",
});

const db = admin.database();
console.log("🔥 Firebase Connected");

// ===== API Football =====
const API_URL = "https://v3.football.api-sports.io/fixtures";
const API_HEADERS = {
  "x-apisports-key": process.env.API_FOOTBALL_KEY,
};

async function updateMatches() {
  const rootRef = db.ref("all_matches");

  // امسح القديم
  await rootRef.remove();

  let page = 1;
  let totalSaved = 0;
  let hasMore = true;

  while (hasMore) {
    console.log(`📦 Fetching page ${page}...`);

    const res = await axios.get(API_URL, {
      headers: API_HEADERS,
      params: {
        page,
      },
    });

    const fixtures = res.data.response || [];

    if (fixtures.length === 0) {
      hasMore = false;
      break;
    }

    for (const match of fixtures) {
      const leagueId = match.league.id;
      const fixtureId = match.fixture.id;

      await rootRef
        .child(`league_${leagueId}`)
        .child(`fixture_${fixtureId}`)
        .set({
          fixture_id: fixtureId,
          date_utc: match.fixture.date,
          status: match.fixture.status.short,

          league: {
            id: leagueId,
            name: match.league.name,
            country: match.league.country,
            season: match.league.season,
            logo: match.league.logo,
          },

          teams: {
            home: {
              id: match.teams.home.id,
              name: match.teams.home.name,
              logo: match.teams.home.logo,
            },
            away: {
              id: match.teams.away.id,
              name: match.teams.away.name,
              logo: match.teams.away.logo,
            },
          },

          goals: match.goals,
          score: match.score,
          venue: match.fixture.venue,
        });

      totalSaved++;
    }

    page++;
    hasMore = page <= res.data.paging.total;
  }

  if (totalSaved === 0) {
    await rootRef.set({
      message: "لا يوجد أي مباريات في قاعدة بيانات API حالياً",
      time: new Date().toISOString(),
    });
  }

  console.log(`✅ Done. Total matches saved: ${totalSaved}`);
}

// ===== RUN =====
updateMatches()
  .then(async () => {
    await admin.app().delete();
    console.log("👋 Firebase closed");
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("❌ Error:", err.message);
    await admin.app().delete();
    process.exit(1);
  });
