// scripts/twitter-bot.js
// BoxBoxBoard Twitter Bot - Versión Mejorada 2026
// Ejecutado vía GitHub Actions (martes y viernes + manual)

const { TwitterApi } = require("twitter-api-v2");
const fetch = (await import("node-fetch")).default; // dynamic import para compatibilidad

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

const rwClient = client.readWrite; // Cliente con permisos de escritura
const BBB_URL = process.env.BBB_API_URL ?? "https://www.boxboxboard.app";

// ── Configuración y Helpers ─────────────────────────────────────────────────

const MAX_TWEET_LENGTH = 280;

function getCurrentQuarter() {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();

  if (m < 3 || (m === 3 && d < 11))
    return { year: now.getFullYear(), quarter: 1 };
  if (m < 6 || (m === 6 && d < 10))
    return { year: now.getFullYear(), quarter: 2 };
  if (m < 9 || (m === 9 && d < 9))
    return { year: now.getFullYear(), quarter: 3 };
  return { year: now.getFullYear(), quarter: 4 };
}

function getCurrentWeekNum(year, quarter) {
  const startDates = { 1: "-01-07", 2: "-03-11", 3: "-06-10", 4: "-09-09" };
  const start = new Date(`${year}${startDates[quarter]}`);
  const now = new Date();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  let week = Math.floor((now - start) / msPerWeek);
  return Math.max(0, Math.min(week, 11)); // iRacing suele tener 12 semanas
}

async function fetchSeries(year, quarter) {
  const url = `${BBB_URL}/api/iracing/series/seasons?season_year=${year}&season_quarter=${quarter}`;
  console.log(`Fetching series from: ${url}`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`BoxBoxBoard API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  console.log(`✅ Fetched ${data.length || 0} series`);
  return data;
}

// ── Base de datos de curiosidades de pistas (ampliable) ─────────────────────

const TRACK_FACTS = [
  /* ... tu array original completo ... */
]; // mantengo el tuyo

function getTrackFact(series, weekNum) {
  if (!series?.length) return null;

  for (const s of series) {
    const track = s.schedules?.[weekNum]?.track?.track_name ?? "";
    const fact = TRACK_FACTS.find((f) =>
      track.toLowerCase().includes(f.track.toLowerCase()),
    );
    if (fact) return { track, fact: fact.fact };
  }
  // Fallback aleatorio
  return TRACK_FACTS[Math.floor(Math.random() * TRACK_FACTS.length)];
}

// ── Compositores de tweets (mejorados con truncado inteligente) ─────────────

const CATEGORY_EMOJI = {
  "Sports Car": "🏎️",
  "Formula Car": "🏎️",
  Oval: "🏁",
  "Dirt Oval": "🟤",
  "Dirt Road": "🌿",
};

function truncateTweet(text) {
  if (text.length <= MAX_TWEET_LENGTH) return text;
  return text.slice(0, MAX_TWEET_LENGTH - 3) + "...";
}

function composeWeekChangeTweet(series, weekNum) {
  const { year, quarter } = getCurrentQuarter();
  let lines = [
    `🗓️ iRacing Season ${quarter} ${year} — Week ${weekNum + 1} is LIVE!\n`,
  ];

  const byCategory = {};
  for (const s of series) {
    const week = s.schedules?.[weekNum];
    if (!week?.track) continue;
    const cat = s.category ?? "Other";
    if (!byCategory[cat]) byCategory[cat] = week.track.track_name;
  }

  for (const [cat, track] of Object.entries(byCategory)) {
    const emoji = CATEGORY_EMOJI[cat] ?? "🏁";
    lines.push(`${emoji} ${cat}: ${track}`);
  }

  lines.push(
    `\nPlan your season → https://boxboxboard.app\n#iRacing #SimRacing`,
  );
  return truncateTweet(lines.join("\n"));
}

function composeWeeklyHighlightTweet(series, weekNum) {
  const featured = series
    .filter((s) => s.schedules?.[weekNum]?.track)
    .sort((a, b) => (b.official ? 1 : 0) - (a.official ? 1 : 0))
    .slice(0, 3);

  if (!featured.length) return null;

  const { year, quarter } = getCurrentQuarter();
  let lines = [`🏁 This week in iRacing (S${quarter} W${weekNum + 1}):\n`];

  for (const s of featured) {
    const track = s.schedules[weekNum].track.track_name;
    lines.push(`• ${s.series_name} @ ${track}`);
  }

  lines.push(`\nFull planner → https://boxboxboard.app\n#iRacing #SimRacing`);
  return truncateTweet(lines.join("\n"));
}

function composeTrackFactTweet(trackFact) {
  const text = `🏟️ Did you know?\n\n${trackFact.fact}\n\nWhich series race here this week? → https://boxboxboard.app\n\n#iRacing #SimRacing #TrackFacts`;
  return truncateTweet(text);
}

function composeNewSeasonTweet() {
  const { year, quarter } = getCurrentQuarter();
  return truncateTweet(
    `🚀 iRacing Season ${quarter} ${year} has started!\n\n` +
      `Explore all series, track rotations & schedules on BoxBoxBoard.\n` +
      `No login required → https://boxboxboard.app\n\n` +
      `#iRacing #SimRacing`,
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Dom, 2=Mar, 5=Vie
  const { year, quarter } = getCurrentQuarter();
  const weekNum = getCurrentWeekNum(year, quarter);

  console.log(
    `🚀 Bot started | Day: ${dayOfWeek} | Season: S${quarter} ${year} | Week: ${weekNum}`,
  );

  let series = [];
  try {
    series = await fetchSeries(year, quarter);
  } catch (err) {
    console.error("❌ Failed to fetch BoxBoxBoard data:", err.message);
    // Continuamos con tweets genéricos si falla la API
  }

  let tweetText = null;

  // Martes = cambio de semana
  if (dayOfWeek === 2) {
    if (weekNum === 0) {
      tweetText = composeNewSeasonTweet();
    } else if (weekNum % 2 === 0) {
      tweetText = composeWeekChangeTweet(series, weekNum);
    } else {
      const trackFact = getTrackFact(series, weekNum);
      tweetText = trackFact
        ? composeTrackFactTweet(trackFact)
        : composeWeekChangeTweet(series, weekNum);
    }
  }

  // Viernes = highlight semanal
  if (dayOfWeek === 5) {
    tweetText =
      composeWeeklyHighlightTweet(series, weekNum) ||
      composeWeekChangeTweet(series, weekNum);
  }

  // Trigger manual = fallback a week change
  if (!tweetText) {
    tweetText = composeWeekChangeTweet(series, weekNum);
  }

  if (!tweetText) {
    console.log("⚠️ No tweet generated today");
    return;
  }

  console.log("📝 Tweet ready (length:", tweetText.length, "):\n", tweetText);

  try {
    const { data } = await rwClient.v2.tweet(tweetText);
    console.log(`✅ Tweet published successfully! ID: ${data.id}`);
  } catch (error) {
    console.error("❌ Error posting tweet:", error.message);

    // Mejor logging de rate limits
    if (error.code === 429 || error.message.includes("429")) {
      console.error(
        "Rate limit alcanzado. Revisa los límites de tu tier (Free ≈ 500-1500 posts/mes).",
      );
    }
    if (error.errors)
      console.error("API errors:", JSON.stringify(error.errors, null, 2));

    process.exit(1);
  }
}

main().catch((err) => {
  console.error("💥 Unexpected error in bot:", err);
  process.exit(1);
});
