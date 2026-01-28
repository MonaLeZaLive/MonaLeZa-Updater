import fs from "fs";
import fetch from "node-fetch";
import { execSync } from "child_process";

// ================= CONFIG =================
const API_KEY = process.env.FOOTBALL_API_KEY;
const API_URL = "https://api-football-v1.p.rapidapi.com/v3/fixtures?live=all";
const OUTPUT_FILE = "matches.json";

// ================= CHECK API KEY =================
if (!API_KEY) {
  console.error("❌ FOOTBALL_API_KEY is missing");
  process.exit(1);
}

// ================= FETCH MATCHES =================
async function fetchMatches() {
  const res = await fetch(API_URL, {
    headers: {
      "X-RapidAPI-Key": API_KEY,
      "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com"
    }
  });

  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }

  const data = await res.json();
  return data.response || [];
}

// ================= MAIN =================
(async () => {
  try {
    console.log("⚽ Fetching matches...");

    const matches = await fetchMatches();

    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify(
        {
          updatedAt: new Date().toISOString(),
          matches
        },
        null,
        2
      )
    );

    console.log(`✅ Saved ${matches.length} matches`);

    // ========== GIT AUTO COMMIT ==========
    execSync("git config user.name 'github-actions[bot]'");
    execSync("git config user.email 'github-actions[bot]@users.noreply.github.com'");
    execSync("git add .");
    execSync("git commit -m 'auto: update matches' || echo 'No changes'");
    execSync("git push");

    console.log("🚀 Changes pushed to repo");
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
})();
