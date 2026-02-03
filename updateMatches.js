// updateMatches.js

import axios from "axios";
import dayjs from "dayjs";
import admin from "firebase-admin";

// ============================
// 1️⃣ Firebase Init
// ============================

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://monaleza-live-b3e0c-default-rtdb.europe-west1.firebasedatabase.app",
});

const db = admin.database();

// ============================
// 2️⃣ API-Football Client
// ============================

const api = axios.create({
  baseURL: "https://v3.football.api-sports.io",
  headers: {
    "x-apisports-key": process.env.API_FOOTBALL_KEY,
  },
});

// ============================
// 3️⃣ Test Request
// ============================

async function testFetch() {
  const today = dayjs().format("YYYY-MM-DD");

  console.log("📅 Fetching matches for:", today);

  const res = await api.get("/fixtures", {
    params: {
      date: today,
      status: "NS-FT-1H-HT-2H-ET-PEN-PST",
    },
  });

  console.log("✅ API Response OK");
  console.log("Matches count:", res.data.response.length);

  // 🔥 Firebase write (test)
  await db.ref(`debug/${today}`).set({
    fetchedAt: new Date().toISOString(),
    matchesCount: res.data.response.length,
  });

  console.log("📝 Data written to Firebase");
}


// ============================
// 4️⃣ Run
// ============================

testFetch()
  .then(() => {
    console.log("🚀 Script finished successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error:", err.message);
    process.exit(1);
  });
