import axios from "axios";

const api = axios.create({
  baseURL: "https://v3.football.api-sports.io",
  headers: {
    "x-apisports-key": process.env.API_FOOTBALL_KEY,
  },
});

const TARGET_LEAGUES = [
  { ar: "كأس مصر", en: "Egypt Cup" },
  { ar: "كأس عاصة مصر", en: "Egypt Capital Cup" },
  { ar: "كأس السوبر المصري", en: "Egyptian Super Cup" },

  { ar: "كأس إسبانيا", en: "Copa del Rey" },
  { ar: "كأس السوبر الإسباني", en: "Supercopa de España" },

  { ar: "كأس إيطاليا", en: "Coppa Italia" },
  { ar: "كأس السوبر الإيطالي", en: "Supercoppa Italiana" },

  { ar: "كأس إنجلترا", en: "FA Cup" },
  { ar: "كأس الدوري الإنجليزي (كأس خيرية)", en: "FA Community Shield" },

  { ar: "كأس ألمانيا", en: "DFB Pokal" },
  { ar: "كأس السوبر الألماني", en: "DFL Supercup" },

  { ar: "كأس فرنسا", en: "Coupe de France" },
  { ar: "كأس السوبر الفرنسي", en: "Trophée des Champions" },
];

async function run() {
  const res = await api.get("/leagues");
  const leagues = res.data.response;

  console.log("======= LEAGUE IDS =======\n");

  TARGET_LEAGUES.forEach((t) => {
    const found = leagues.find(
      (l) => l.league.name === t.en
    );

    if (found) {
      console.log(
        `${found.league.id}, // ${t.ar} (${found.league.name})`
      );
    } else {
      console.log(
        `❌ NOT FOUND: ${t.ar} (${t.en})`
      );
    }
  });
}

run().catch(console.error);
