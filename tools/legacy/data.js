/* =====================================================
   DATA LAYER – talks to Supabase.
   Everything that reads or writes the database lives here,
   so app.js never calls Supabase directly.
   ===================================================== */

/* ---------- small helpers used everywhere ---------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clone = o => JSON.parse(JSON.stringify(o));

// Cleans staff-written HTML so a bad paste (or a hacked account) can't run scripts on visitors.
function clean(html) {
  if (!window.DOMPurify) return esc(html);
  return DOMPurify.sanitize(String(html ?? ""), { ADD_ATTR: ["target", "loading"], FORBID_TAGS: ["style", "form", "input"] });
}
// Only allow normal web links and site paths (blocks "javascript:" links).
function safeUrl(u, fallback = "#") {
  u = String(u ?? "").trim();
  if (!u) return fallback;
  if (/^(https?:\/\/|\/|#|\.\/|images\/|heads\/|payments\/)/i.test(u) || /^[\w\-./]+\.(png|jpe?g|gif|webp|svg)$/i.test(u)) return u;
  return fallback;
}
const safeColor = c => /^#[0-9a-f]{3,8}$/i.test(String(c)) ? c : "#e58aa8";

/* ---------- spawn text parser (turns the text blocks in config.js into cards) ---------- */
const titleCase = s => s.replace(/(^|[\s\/\-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
function parseSpawns(txt) {
  return txt.trim().split(/\n\s*\n/).map(block => {
    const lines = block.trim().split("\n").map(s => s.trim()).filter(Boolean);
    const o = { name: lines.shift(), cond: [], biomes: [], blocks: [] };
    let mode = "cond";
    lines.forEach(l => {
      if (/^Biomes?:$/.test(l)) { mode = "b"; return; }
      if (/^Needed nearby blocks:$/.test(l)) { mode = "k"; return; }
      if (mode === "b") o.biomes.push(titleCase(l.replace(/^Is /i, "")));
      else if (mode === "k") o.blocks.push(l);
      else o.cond.push(l);
    });
    return o;
  });
}

/* ---------- built-in content (used until a section is saved in the database) ---------- */
const DEFAULTS = {
  czAbout: { lead: COZYMON.lead, about: COZYMON.about },
  obAbout: { lead: ONEBLOCK.lead, about: ONEBLOCK.about },
  czFeatures: MODS, obFeatures: ONEBLOCK.features,
  czFaqs: FAQS,     obFaqs: ONEBLOCK.faqs,
  czSeries: SERIES,
  czSpawns: [
    ...parseSpawns(PARADOX_TXT).map(p => ({ ...p, kind: "paradox" })),
    ...parseSpawns(ULTRA_TXT).map(p => ({ ...p, kind: "ultra" }))
  ],
  czLegendaries: [
    ...STRUCTURES.map(s => ({ name: s.name, structure: true, paras: s.paras, cond: [], biomes: [], blocks: [] })),
    ...parseSpawns(LEGEND_TXT).map(p => ({ ...p, structure: false, paras: [] }))
  ],
  siteRules: RULES, siteVotes: VOTES, sitePlans: PLANS, sitePayments: PAYMENTS,
  siteTeam: TEAM.flatMap((row, ri) => row.map(m => ({ ...m, row: ri + 1 })))
};
const CONTENT_KEYS = Object.keys(DEFAULTS);

let DB = clone(DEFAULTS);   // what the page currently shows
let POSTS = [];             // news posts

/* ---------- Supabase connection ---------- */
const SB_KEY = SUPABASE.publishableKey || SUPABASE.anonKey || "";
const sb = (SUPABASE.url && SB_KEY && window.supabase)
  ? window.supabase.createClient(SUPABASE.url, SB_KEY)
  : null;
const ONLINE = !!sb;
if (!ONLINE) {
  POSTS = clone(SAMPLE_POSTS);
  console.info("Floreon: Supabase is not configured in js/config.js – showing built-in content.");
}

const errText = e => (e && (e.message || e.error_description)) || String(e);

/* ---------- content sections ---------- */
async function loadContent() {
  if (!sb) return false;
  const { data, error } = await sb.from("content").select("key, data");
  if (error) { console.warn("Couldn't load content:", error); return false; }
  DB = clone(DEFAULTS);
  data.forEach(r => { if (CONTENT_KEYS.includes(r.key) && r.data != null) DB[r.key] = r.data; });
  return true;
}

/* ---------- news posts ---------- */
async function loadPosts() {
  if (!sb) return POSTS;
  // Visitors only get published posts (the database rules decide).
  const { data, error } = await sb.from("posts").select("*")
    .order("pinned", { ascending: false }).order("created_at", { ascending: false });
  if (error) { console.warn("Couldn't load posts:", error); return POSTS; }
  POSTS = data;
  return POSTS;
}
