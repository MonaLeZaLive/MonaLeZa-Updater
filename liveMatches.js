import axios from "axios";
import dayjs from "dayjs";
import admin from "firebase-admin";

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://monaleza-live-b3e0c-default-rtdb.europe-west1.firebasedatabase.app",
});

const db = admin.database();

const api = axios.create({
  baseURL: "https://v3.football.api-sports.io",
  headers: {
    "x-apisports-key": process.env.API_FOOTBALL_KEY,
  },
});

(async () => {
  const metaSnap = await db.ref("meta/today").once("value");
  const meta = metaSnap.val();

  if (!meta?.first_match_ts) {
    console.log("❌ No matches today");
    process.exit(0);
  }

  const now = dayjs().unix();

  if (now < meta.first_match_ts || now > meta.last_match_ts + 7200) {
    console.log("⏸ Outside matches window");
    process.exit(0);
  }

  console.log("🔴 Fetching LIVE matches");

  const res = await api.get("/fixtures", {
    params: { live: "all" },
  });

  const live = res.data.response || [];

  await db.ref("matches_live").set(live);
  console.log(`🔥 Live matches updated: ${live.length}`);

  process.exit(0);
})();
