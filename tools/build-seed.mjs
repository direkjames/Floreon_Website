// Builds supabase/sql/003_seed_pages.sql from the current site content.
// Run from the project folder:  node tools/build-seed.mjs
//
// It turns today's pages (home, Cozymon, rules, vote, store, Oneblock) into
// database pages made of blocks (see docs/content-model.md).
// Sections the team already edited in the old admin panel are taken from the
// database when the SQL runs, so those edits are kept.

import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");

// ---- load config.js + data.js (they only need a tiny fake browser) ----
const ctx = vm.createContext({ window: {}, console, document: undefined });
vm.runInContext(read("tools/legacy/config.js") + "\n" + read("tools/legacy/data.js") +
  "\nthis.__out = { CONFIG, DEFAULTS };", ctx);
const { CONFIG, DEFAULTS } = ctx.__out;
const plain = o => JSON.parse(JSON.stringify(o));

// remove the grey "Image placeholder" boxes from the starting FAQ answers
const stripPh = html => String(html).replace(/\s*<div class="ph">[\s\S]*?<\/div><\/div>/g, "");

// ---- block helpers ----
let n = 0;
const id = () => "b" + (++n).toString(36).padStart(3, "0");
const block = (type, props = {}) => ({ id: id(), type, ...props });
const heading = (title, lead = "", extra = {}) => block("heading", { eyebrow: "", title, lead, align: "left", ...extra });
// "@@key" is replaced in SQL with the live database value (if the team edited it) or the default below
const live = key => "@@" + key;

const PAGES = [
  {
    slug: "home", title: "Home", published: true,
    description: "Floreon is a cozy, whitelist-only Minecraft community. Play Cozymon, our Cobblemon survival server.",
    blocks: [
      block("hero", { size: "large", logo: true, title: "", subtitle: CONFIG.tagline, images: plain(CONFIG.heroImages), petals: true }),
      heading("Latest news", "Announcements, events and updates from the team."),
      block("news", { limit: 3 }),
      heading("About Floreon", "We're a small, friendly community that cares more about good vibes than grinding. Build something you love, join a game night, or just hang out with the regulars. Everyone is welcome here, whether you've played for ten years or ten minutes."),
      heading("Pick a gamemode", "Floreon has more than one world to explore."),
      block("cards", { style: "links", search: false, items: [
        { name: "Cozymon", text: "Our Cobblemon survival server. Catch, train, and battle Pokémon while you build.", chips: [], url: "/cozymon", color: "sakura" }
      ]}),
      heading("How to get whitelisted", "Floreon is whitelist-only. Follow these steps to get in.", { anchor: "whitelist" }),
      block("steps", { items: [
        { title: "Apply in Discord", text: "Join our Discord server and fill up the whitelist form. Double-check your Minecraft username and answers, because accuracy matters." },
        { title: "Wait for approval", text: "The team reviews every application. You'll hear back in Discord once you're accepted." },
        { title: "Install the modpack", text: "Once accepted, you'll get the modpack in our Discord. Install it, launch the game and join. Floreon is already in its server list." }
      ]}),
      block("buttons", { align: "left", items: [{ label: "Join Discord and apply", url: "", style: "primary", discord: true }] }),
      heading("Meet the team", "The people who keep the server running and the community kind."),
      block("team")
    ]
  },
  {
    slug: "cozymon", title: "About Cozymon", published: true,
    description: "Cozymon is Floreon's Cobblemon survival server: level caps, legendaries, a casino, a player economy and events.",
    blocks: [
      block("hero", { size: "small", logo: false, title: "", subtitle: "", images: plain(CONFIG.czHeroImages), petals: true }),
      heading("About Cozymon", live("czAboutLead"), { eyebrow: "Cozymon" }),
      block("text", { card: true, html: live("czAboutHtml") }),
      block("buttons", { align: "left", items: [{ label: "How to get whitelisted", url: "/#whitelist", style: "primary", discord: false }] })
    ]
  },
  {
    slug: "cozymon/features", title: "Cozymon Features", published: true,
    description: "Every mod in the Cozymon Cobblemon modpack.",
    blocks: [
      heading("Features & mod list", "Cozymon runs a Cobblemon modpack. Here is what's inside.", { eyebrow: "Cozymon" }),
      block("cards", { style: "flowers", search: true, items: live("czFeatures") })
    ]
  },
  {
    slug: "cozymon/faq", title: "Cozymon FAQs", published: true,
    description: "Answers to common Cozymon questions, plus the trainer series guide.",
    blocks: [
      heading("FAQs", "Quick answers to the most common Cozymon questions.", { eyebrow: "Cozymon" }),
      block("faq", { search: true, items: live("czFaqs") }),
      heading("Series guide", "Defeat these trainers to raise your level cap. Each trainer has a signature item."),
      block("tables", { columns: ["Trainer name", "Signature item"], tables: live("czSeries") })
    ]
  },
  {
    slug: "cozymon/spawns", title: "Cozymon Spawns", published: true,
    description: "Where to find Paradox Pokémon and Ultra Beasts on Cozymon.",
    blocks: [
      heading("Spawns", "Search for a Pokémon, or filter by the biome it spawns in. Meet the requirements on each card for a chance to find it.", { eyebrow: "Cozymon" }),
      block("spawns")
    ]
  },
  {
    slug: "cozymon/legendaries", title: "Cozymon Legendaries", published: true,
    description: "How to get every legendary Pokémon on Cozymon.",
    blocks: [
      heading("Legendaries", "Pick a legendary below to see how to get it. Some have a structure or item to summon them manually, the rest can only spawn when you meet their spawn requirements.", { eyebrow: "Cozymon" }),
      block("legendaries")
    ]
  },
  {
    slug: "rules", title: "Rules", published: true,
    description: "Floreon server rules.",
    blocks: [
      heading("Server rules", "A few simple rules keep Floreon cozy for everyone. Breaking them can lead to a mute, kick, or ban."),
      block("rules", { items: live("siteRules") })
    ]
  },
  {
    slug: "vote", title: "Vote", published: true,
    description: "Vote for Floreon and earn in-game rewards.",
    blocks: [
      heading("Vote for Floreon", "Voting helps new players find the server. Vote on each site below to get a reward."),
      block("votes", { items: live("siteVotes") })
    ]
  },
  {
    slug: "store", title: "Store", published: true,
    description: "Support Floreon with a permanent rank.",
    blocks: [
      block("store", {
        title: "Choose your rank",
        lead: "Ranks are permanent, one-time purchases. Pay once and keep your rank forever. They support the server and unlock cosmetic and convenience perks.",
        note: "Ranks are permanent. There are no renewals or subscriptions."
      })
    ]
  },
  {
    slug: "oneblock", title: "About Oneblock", published: false,
    description: "Oneblock: start with a single block and grow your own island.",
    blocks: [
      block("hero", { size: "small", logo: false, title: "", subtitle: "", images: plain(CONFIG.obHeroImages), petals: true }),
      heading("About Oneblock", live("obAboutLead"), { eyebrow: "Oneblock" }),
      block("text", { card: true, html: live("obAboutHtml") })
    ]
  },
  {
    slug: "oneblock/features", title: "Oneblock Features", published: false, description: "",
    blocks: [
      heading("Features", "What makes our Oneblock special.", { eyebrow: "Oneblock" }),
      block("cards", { style: "flowers", search: true, items: live("obFeatures") })
    ]
  },
  {
    slug: "oneblock/faq", title: "Oneblock FAQs", published: false, description: "",
    blocks: [
      heading("FAQs", "Quick answers to the most common Oneblock questions.", { eyebrow: "Oneblock" }),
      block("faq", { search: true, items: live("obFaqs") })
    ]
  }
].map((p, i) => ({ ...p, sort: i }));

const SETTINGS = {
  serverName: CONFIG.serverName,
  tagline: CONFIG.tagline,
  discordURL: CONFIG.discordURL,
  currency: CONFIG.currency,
  logo: "/images/floreon-logo.webp",
  wordLogo: "/images/floreon-word.webp",
  heroInterval: CONFIG.heroInterval || 6000,
  footer: "Not affiliated with Mojang or Microsoft."
};

const NAV = [
  { type: "page", slug: "home", label: "Home", icon: "home" },
  { type: "group", label: "Cozymon", icon: "ball", children: [
    { type: "page", slug: "cozymon", label: "About" },
    { type: "page", slug: "cozymon/features", label: "Features" },
    { type: "page", slug: "cozymon/faq", label: "FAQs" },
    { type: "page", slug: "cozymon/spawns", label: "Spawns" },
    { type: "page", slug: "cozymon/legendaries", label: "Legendaries" }
  ]},
  { type: "page", slug: "rules", label: "Rules", icon: "rules" },
  { type: "page", slug: "vote", label: "Vote", icon: "heart" },
  { type: "link", label: "Discord", icon: "chat", url: "discord" },
  { type: "page", slug: "store", label: "Store", icon: "bag" }
];

// ---- defaults for the "@@" tokens ----
const aboutHtml = a => a.about.map(t => `<p>${t}</p>`).join("");
const faqs = list => list.map(f => ({ q: f.q, a: stripPh(f.a) }));
const DEF = {
  czFeatures: DEFAULTS.czFeatures, obFeatures: DEFAULTS.obFeatures,
  czFaqs: faqs(DEFAULTS.czFaqs), obFaqs: faqs(DEFAULTS.obFaqs),
  czSeries: DEFAULTS.czSeries, siteRules: DEFAULTS.siteRules, siteVotes: DEFAULTS.siteVotes
};
// shared lists the blocks read from the content table
const SHARED = ["siteTeam", "sitePlans", "sitePayments", "czSpawns", "czLegendaries"];

// ---- write SQL ----
const tag = "$floreon$";
const q = s => {
  const txt = typeof s === "string" ? s : JSON.stringify(s);
  if (txt.includes(tag)) throw new Error("content contains the SQL quote tag");
  return tag + txt + tag;
};
const legendaries = DEFAULTS.czLegendaries.map(l => ({ ...l, images: [] }));

let sql = `-- =====================================================================
-- FLOREON – PHASE 1: MOVE TODAY'S PAGES INTO THE DATABASE
-- Generated by tools/build-seed.mjs – edit that file, not this one.
-- Run AFTER 002_pages_media.sql. Safe to re-run: it never overwrites a page,
-- setting or list that already exists, so your edits are kept.
-- =====================================================================

-- ---------- settings + menu ----------
insert into public.content (key, data) values
  ('siteSettings', ${q(SETTINGS)}::jsonb),
  ('siteNav', ${q(NAV)}::jsonb)
on conflict (key) do nothing;

-- ---------- shared lists (only filled if the old admin never saved them) ----------
insert into public.content (key, data) values
${SHARED.map(k => `  ('${k}', ${q(k === "czLegendaries" ? legendaries : DEFAULTS[k])}::jsonb)`).join(",\n")}
on conflict (key) do nothing;

-- legendaries get an "images" list for the new picture uploads
update public.content
   set data = (select jsonb_agg(case when e ? 'images' then e else e || '{"images":[]}'::jsonb end) from jsonb_array_elements(data) e)
 where key = 'czLegendaries' and exists (select 1 from jsonb_array_elements(data) e where not e ? 'images');

-- ---------- pages ----------
-- Sections edited in the old admin panel (FAQs, features, rules, votes, series, About)
-- are taken from the content table; otherwise the starting content is used.
do $do$
declare
  t text := ${q(PAGES)};
begin
`;
for (const [k, v] of Object.entries(DEF)) {
  const clean = k.endsWith("Faqs")
    ? `(select jsonb_agg(jsonb_build_object('q', e->>'q', 'a', regexp_replace(e->>'a', '\\s*<div class="ph">.*?</div></div>', '', 'g')))::text from public.content c, jsonb_array_elements(c.data) e where c.key = '${k}')`
    : `(select data::text from public.content where key = '${k}')`;
  sql += `  t := replace(t, '"@@${k}"', coalesce(${clean}, ${q(v)}));\n`;
}
for (const m of ["cz", "ob"]) {
  const def = DEFAULTS[m + "About"];
  sql += `  t := replace(t, '"@@${m}AboutLead"', to_jsonb(coalesce((select data->>'lead' from public.content where key = '${m}About'), ${q(def.lead)}))::text);\n`;
  sql += `  t := replace(t, '"@@${m}AboutHtml"', to_jsonb(coalesce((select string_agg('<p>' || e || '</p>', '') from public.content c, jsonb_array_elements_text(c.data->'about') e where c.key = '${m}About'), ${q(aboutHtml(def))}))::text);\n`;
}
sql += `
  insert into public.pages (slug, title, description, published, blocks, sort)
  select p->>'slug', p->>'title', p->>'description', (p->>'published')::boolean, p->'blocks', (p->>'sort')::int
    from jsonb_array_elements(t::jsonb) p
  on conflict (slug) do nothing;
end
$do$;

-- Check: you should see ${PAGES.length} pages.
select slug, title, published from public.pages order by sort;
`;

const out = path.join(root, "supabase/sql/003_seed_pages.sql");
fs.writeFileSync(out, sql);
console.log(`Wrote ${path.relative(root, out)}: ${PAGES.length} pages, ${(sql.length / 1024).toFixed(0)} KB`);

// ---- also write site/js/fallback.js: a built-in copy of the starting content.
// The public site shows it only if the database can't be reached.
const resolve = v => {
  if (typeof v === "string" && v.startsWith("@@")) {
    const k = v.slice(2);
    if (k.endsWith("AboutLead")) return DEFAULTS[k.slice(0, 2) + "About"].lead;
    if (k.endsWith("AboutHtml")) return aboutHtml(DEFAULTS[k.slice(0, 2) + "About"]);
    return DEF[k];
  }
  if (Array.isArray(v)) return v.map(resolve);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x)]));
  return v;
};
const fallback = {
  settings: SETTINGS,
  nav: NAV,
  lists: Object.fromEntries(SHARED.map(k => [k, k === "czLegendaries" ? legendaries : DEFAULTS[k]])),
  pages: PAGES.filter(p => p.published).map(p => ({ slug: p.slug, title: p.title, description: p.description, blocks: resolve(p.blocks) })),
  posts: []
};
const fbOut = path.join(root, "site/js/fallback.js");
fs.writeFileSync(fbOut, "// Generated by tools/build-seed.mjs – a built-in copy of the starting content.\n// The site only uses it when the database can't be reached.\nexport default " + JSON.stringify(fallback) + ";\n");
console.log(`Wrote ${path.relative(root, fbOut)}: ${(fs.statSync(fbOut).size / 1024).toFixed(0)} KB`);
