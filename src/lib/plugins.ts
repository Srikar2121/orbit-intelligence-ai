// Client-side Orbit plugins. Each plugin detects intent in a message,
// fetches live data from a free public API, and returns text that is passed
// to Orbit as fresh context for the reply.

export type PluginCategory = "Live data" | "Knowledge" | "Utilities" | "Finance";

export type PluginSetting = { key: string; label: string; placeholder: string };

export type OrbitPlugin = {
  id: string;
  name: string;
  icon: string;
  category: PluginCategory;
  description: string;
  activity: string;
  settings?: PluginSetting[];
  detect: (msg: string) => boolean;
  run: (msg: string, settings: Record<string, string>) => Promise<string | null>;
};

const getJSON = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
};

function extractPlace(msg: string, fallback?: string) {
  const m = msg.match(/\b(?:in|at|for)\s+([A-Za-z][A-Za-z .'-]{1,40}?)(?:\s+(?:today|tomorrow|now|this week|right now)|[?.!,]|$)/i);
  return (m?.[1] ?? fallback ?? "").trim();
}

const WMO: Record<number, string> = {
  0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast", 45: "fog", 48: "fog",
  51: "light drizzle", 53: "drizzle", 55: "heavy drizzle", 61: "light rain", 63: "rain", 65: "heavy rain",
  71: "light snow", 73: "snow", 75: "heavy snow", 80: "rain showers", 81: "rain showers", 82: "violent showers",
  95: "thunderstorm", 96: "thunderstorm with hail", 99: "thunderstorm with hail",
};

export const PLUGINS: OrbitPlugin[] = [
  {
    id: "weather",
    name: "Weather",
    icon: "🌦️",
    category: "Live data",
    description: "Current conditions and a 3-day forecast for any city.",
    activity: "Using Weather plugin…",
    settings: [{ key: "city", label: "Default city", placeholder: "e.g. Hyderabad" }],
    detect: (m) => /\b(weather|temperature|forecast|raining|rain today|humid|how hot|how cold)\b/i.test(m),
    run: async (msg, s) => {
      const place = extractPlace(msg, s.city);
      if (!place) return "Weather plugin: no city given. Ask the user which city.";
      const geo = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(place)}`);
      const g = geo.results?.[0];
      if (!g) return `Weather plugin: couldn't find a place called "${place}".`;
      const w = await getJSON(
        `https://api.open-meteo.com/v1/forecast?latitude=${g.latitude}&longitude=${g.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=3&timezone=auto`,
      );
      const c = w.current;
      const days = w.daily.time
        .map((d: string, i: number) => `${d}: ${WMO[w.daily.weather_code[i]] ?? "mixed"}, ${w.daily.temperature_2m_min[i]}–${w.daily.temperature_2m_max[i]}°C`)
        .join("; ");
      return `Weather in ${g.name}, ${g.country}: now ${c.temperature_2m}°C (feels ${c.apparent_temperature}°C), ${WMO[c.weather_code] ?? "mixed"}, humidity ${c.relative_humidity_2m}%, wind ${c.wind_speed_10m} km/h. Forecast: ${days}.`;
    },
  },
  {
    id: "wikipedia",
    name: "Wikipedia",
    icon: "📚",
    category: "Knowledge",
    description: "Looks up facts and summaries from Wikipedia.",
    activity: "Searching Wikipedia…",
    detect: (m) => /\b(who (is|was)|what (is|was|are)|tell me about|history of|wiki)\b/i.test(m),
    run: async (msg) => {
      const q = msg.replace(/\b(who|what) (is|was|are)\b|tell me about|history of|wiki(pedia)?|\?/gi, "").trim();
      if (!q || q.length < 2) return null;
      const s = await getJSON(`https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&format=json&origin=*&srsearch=${encodeURIComponent(q)}`);
      const title = s.query?.search?.[0]?.title;
      if (!title) return null;
      const sum = await getJSON(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
      return `Wikipedia — ${sum.title}: ${sum.extract}`;
    },
  },
  {
    id: "calculator",
    name: "Calculator",
    icon: "🧮",
    category: "Utilities",
    description: "Exact arithmetic so Orbit never fumbles the math.",
    activity: "Running Calculator…",
    detect: (m) => /\d\s*[-+*/^%×÷]\s*\(?\d/.test(m),
    run: async (msg) => {
      const exprs = msg.match(/[\d.()\s+\-*/^%×÷]{3,}/g) ?? [];
      const out: string[] = [];
      for (const raw of exprs) {
        const e = raw.replace(/×/g, "*").replace(/÷/g, "/").replace(/\^/g, "**").trim();
        if (!/\d/.test(e) || !/[-+*/%]/.test(e) || !/^[\d.()\s+\-*/%]+$/.test(e)) continue;
        try {
          // eslint-disable-next-line no-new-func
          const v = Function(`"use strict"; return (${e});`)();
          if (typeof v === "number" && isFinite(v)) out.push(`${raw.trim()} = ${+v.toFixed(10)}`);
        } catch { /* ignore */ }
      }
      return out.length ? `Calculator results: ${out.join("; ")}` : null;
    },
  },
  {
    id: "clock",
    name: "World Clock",
    icon: "🕒",
    category: "Utilities",
    description: "Knows today's date and the time anywhere.",
    activity: "Checking the clock…",
    detect: (m) => /\b(what time|time (is it|in)|today'?s date|what day|current date|date today)\b/i.test(m),
    run: async () => {
      const now = new Date();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return `Clock: user's local time is ${now.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })} (${tz}). UTC: ${now.toUTCString()}.`;
    },
  },
  {
    id: "dictionary",
    name: "Dictionary",
    icon: "🔤",
    category: "Knowledge",
    description: "Definitions, pronunciations and examples for English words.",
    activity: "Looking up the word…",
    detect: (m) => /\b(define|definition of|meaning of|what does .+ mean)\b/i.test(m),
    run: async (msg) => {
      const m = msg.match(/(?:define|definition of|meaning of)\s+["']?([a-z-]+)/i) ?? msg.match(/what does\s+["']?([a-z-]+)["']?\s+mean/i);
      if (!m) return null;
      const d = await getJSON(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(m[1])}`);
      const e = d[0];
      const defs = e.meanings.slice(0, 3).map((x: any) => `(${x.partOfSpeech}) ${x.definitions[0].definition}`).join(" ");
      return `Dictionary — ${e.word} ${e.phonetic ?? ""}: ${defs}`;
    },
  },
  {
    id: "crypto",
    name: "Crypto Prices",
    icon: "🪙",
    category: "Finance",
    description: "Live prices for Bitcoin, Ethereum and other coins.",
    activity: "Fetching live prices…",
    detect: (m) => /\b(bitcoin|btc|ethereum|eth|solana|dogecoin|doge|crypto)\b/i.test(m),
    run: async (msg) => {
      const map: Record<string, string> = { bitcoin: "bitcoin", btc: "bitcoin", ethereum: "ethereum", eth: "ethereum", solana: "solana", dogecoin: "dogecoin", doge: "dogecoin" };
      const ids = [...new Set(Object.keys(map).filter((k) => new RegExp(`\\b${k}\\b`, "i").test(msg)).map((k) => map[k]))];
      const list = ids.length ? ids : ["bitcoin", "ethereum"];
      const p = await getJSON(`https://api.coingecko.com/api/v3/simple/price?ids=${list.join(",")}&vs_currencies=usd,inr&include_24hr_change=true`);
      return "Crypto prices: " + list.map((id) => p[id] ? `${id} $${p[id].usd} / ₹${p[id].inr} (24h ${p[id].usd_24h_change?.toFixed(2)}%)` : "").filter(Boolean).join("; ");
    },
  },
  {
    id: "currency",
    name: "Currency Converter",
    icon: "💱",
    category: "Finance",
    description: "Converts between world currencies at today's rates.",
    activity: "Converting currency…",
    detect: (m) => /\b([A-Z]{3})\s+(to|in)\s+([A-Z]{3})\b/i.test(m) || /\b(exchange rate|convert .* (usd|inr|eur|gbp))\b/i.test(m),
    run: async (msg) => {
      const m = msg.match(/(\d+(?:\.\d+)?)?\s*([A-Za-z]{3})\s+(?:to|in)\s+([A-Za-z]{3})\b/);
      if (!m) return null;
      const amt = m[1] ? parseFloat(m[1]) : 1;
      const from = m[2].toUpperCase(), to = m[3].toUpperCase();
      const r = await getJSON(`https://open.er-api.com/v6/latest/${from}`);
      const rate = r.rates?.[to];
      if (!rate) return null;
      return `Currency: ${amt} ${from} = ${(amt * rate).toFixed(2)} ${to} (rate ${rate}, updated ${r.time_last_update_utc}).`;
    },
  },
];

export const DEFAULT_ENABLED = ["weather", "calculator", "wikipedia", "clock"];

export type PluginRun = { plugin: OrbitPlugin; result: string | null };

/** Runs every enabled plugin whose intent matches. onStart fires per plugin for activity UI. */
export async function runPlugins(
  msg: string,
  enabled: string[],
  settings: Record<string, Record<string, string>>,
  onStart: (p: OrbitPlugin) => void,
): Promise<PluginRun[]> {
  const matched = PLUGINS.filter((p) => enabled.includes(p.id) && p.detect(msg));
  const runs: PluginRun[] = [];
  for (const p of matched) {
    onStart(p);
    try {
      runs.push({ plugin: p, result: await p.run(msg, settings[p.id] ?? {}) });
    } catch {
      runs.push({ plugin: p, result: null });
    }
  }
  return runs;
}
