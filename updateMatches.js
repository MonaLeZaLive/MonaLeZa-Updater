/**
 * updateMatches.js
 * Fetch today's matches from API-Football
 * Filter by specific leagues
 * Save data to Firebase in matches_today
 */

import axios from "axios";
import admin from "firebase-admin";

// Firebase init
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  databaseURL: process.env.FIREBASE_DB_URL,
});

const db = admin.database();

const API_URL = "https://v3.football.api-sports.io/fixtures";
const API_HEADERS = {
  "x-apisports-key": process.env.API_FOOTBALL_KEY,
};

const LEAGUES = [
  { name: "FIFA World Cup", id: 1 },
  { name: "UEFA Euro", id: 4 },
  { name: "Copa America", id: 9 },
  { name: "Africa Cup of Nations", id: 6 },
  { name: "AFC Asian Cup", id: 7 },
  { name: "UEFA Champions League", id: 2 },
  { name: "FIFA Club World Cup", id: 15 },
  { name: "Copa Libertadores", id: 13 },
  { name: "AFC Champions League", id: 17 },
  { name: "CAF Champions League", id: 16 },
  { name: "Premier League", id: 39 },
  { name: "La Liga", id: 140 },
  { name: "Serie A", id: 135 },
  { name: "Bundesliga", id: 78 },
  { name: "Ligue 1", id: 61 },
  { name: "Egyptian Premier League", id: 233 },
  { name: "Saudi Pro League", id: 307 },
];

async function updateMatches() {
  console.log("🔥 Firebase Connected Successfully");

  // Clear old data
  await db.ref("matches_today").remove();

  const today = new Date().toISOString().split("T")[0];

  for (const league of LEAGUES) {
    const res = await axios.get(API_URL, {
      headers: API_HEADERS,
      params: {
        league: league.id,
        date: today,
      },
    });

    if (!res.data.response.length) continue;

    const leagueRef = db.ref(`matches_today/${league.name}`);

    await leagueRef.set({
      league_logo: res.data.response[0].league.logo,
      matches: {},
    });

    for (const match of res.data.response) {
      const matchId = `m_${match.fixture.id}`;

      await leagueRef.child(`matches/${matchId}`).set({
        home_team: match.teams.home.name,
        home_logo: match.teams.home.logo,
        away_team: match.teams.away.name,
        away_logo: match.teams.away.logo,
        time: match.fixture.date.substring(11, 16),
        status: match.fixture.status.short,
        stadium: match.fixture.venue?.name || "",
        channel: "",
      });
    }
  }

  console.log("✅ Matches updated successfully");
}

updateMatches().catch(console.error);
