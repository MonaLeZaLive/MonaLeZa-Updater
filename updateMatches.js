import fetch from "node-fetch";
import admin from "firebase-admin";
import fs from "fs";

console.log("🚀 Starting updater...");

// ===== ENV =====
const API_KEY = process.env.FOOTBALL_API_KEY;

if (!API_KEY) {
  console.error("❌ API_KEY is missing");
  process.exit(1);
}

// ===== FIREBASE =====
const serviceAccount = JSON.parse(
  fs.readFileSync("serviceAccountKey.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ===== FETCH MATCHES =====
async function fetchMatches() {
  console.log("🧪 Testing API key...");

  const url = `https://v3.football.api-sports.io/status`;

  const res = await fetch(url, {
    headers: {
      "x-apisports-key": API_KEY
    }
  });

  const text = await res.text();
  console.log("STATUS CODE:", res.status);
  console.log("RAW RESPONSE:", text);

  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }

  const data = JSON.parse(text);
  console.log("✅ API is working");

  return [];
}


// ===== UPDATE FIRESTORE =====
async function updateFirestore(matches) {
  const batch = db.batch();

  matches.forEach(match => {
    const ref = db.collection("matches").doc(String(match.fixture.id));
    batch.set(ref, match, { merge: true });
  });

  await batch.commit();
  console.log(`✅ Updated ${matches.length} matches`);
}

// ===== MAIN =====
(async () => {
  try {
    const matches = await fetchMatches();
    await updateFirestore(matches);
    console.log("🎉 Done successfully");
  } catch (err) {
    console.error("🔥 Error:", err.message);
    process.exit(1);
  }
})();
