// getAllLeagues.js
import axios from "axios";
import fs from "fs";

const api = axios.create({
  baseURL: "https://v3.football.api-sports.io",
  headers: {
    "x-apisports-key": process.env.API_FOOTBALL_KEY,
  },
});

async function getLeagues() {
  const res = await api.get("/leagues");
  const leagues = res.data.response;

  console.log("TOTAL LEAGUES:", leagues.length);

  const formatted = leagues.map(l => ({
    id: l.league.id,
    name: l.league.name,
    type: l.league.type,
    country: l.country.name,
  }));

  // اطبعهم في اللوج
  formatted.forEach(l => {
    console.log(`${l.id} | ${l.name} | ${l.type} | ${l.country}`);
  });

  // واحفظهم في ملف
  fs.writeFileSync(
    "leagues.json",
    JSON.stringify(formatted, null, 2)
  );
}

getLeagues().catch(console.error);
