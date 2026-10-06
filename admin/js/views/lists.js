// The shared lists used by blocks on the public site: store ranks, payment methods, team, spawns, legendaries.
import { contentEditor } from "../lib/editor.js";

const lines = v => (v || []).map(x => String(x).trim()).filter(Boolean);

/* ---------- Store ranks ---------- */
export const renderStore = root => contentEditor(root, {
  title: "Store ranks", lead: "Shown by the Store block, left to right.",
  key: "sitePlans", list: true,
  intro: "Minecraft's rules for servers allow selling cosmetics (prefixes, name colors, particles, pets). Selling things that change gameplay, like kits or extra items, can get a server blocked. Check the current Minecraft Usage Guidelines before launch.",
  fields: () => [{ k: "items", label: "Ranks", type: "repeater", itemName: "rank", summary: "name", fields: [
    { k: "name", label: "Rank name", max: 30 },
    { k: "price", label: "Price", type: "number", min: 0, help: "Number only; the currency symbol comes from Settings" },
    { k: "id", label: "Card color", type: "select", options: [["dahlia", "Purple"], ["hibiscus", "Coral"], ["sakura", "Pink"], ["moss", "Green"]] },
    { k: "perks", label: "Perks", type: "list", rows: 6, help: "One perk per line, shown in this order" }
  ]}],
  prepare: items => items.map(p => ({ ...p, name: String(p.name || "").trim(), price: Number(p.price) || 0, perks: lines(p.perks) })),
  validate: items => items.some(p => !p.name) ? "Every rank needs a name." : null,
  savedText: "Store ranks saved."
});

/* ---------- Payment methods ---------- */
export const renderPayments = root => contentEditor(root, {
  title: "Payment methods", lead: "The “Accepted payments” row under the store.",
  key: "sitePayments", list: true,
  fields: () => [{ k: "items", label: "Payment methods", type: "repeater", itemName: "payment method", summary: "name", fields: [
    { k: "name", label: "Name", max: 30 },
    { k: "logo", label: "Logo", type: "image", folder: "payments", help: "Optional, square picture works best" },
    { k: "color", label: "Badge color", type: "color", help: "Used when there's no logo" }
  ]}],
  prepare: items => items.map(p => ({ ...p, name: String(p.name || "").trim() })),
  validate: items => items.some(p => !p.name) ? "Every payment method needs a name." : null,
  savedText: "Payment methods saved."
});

/* ---------- Team ---------- */
export const renderTeam = root => contentEditor(root, {
  title: "Team", lead: "Shown by the Team block. Members with the same row number sit together.",
  key: "siteTeam", list: true,
  search: "Search the team",
  fields: () => [{ k: "items", label: "Members", type: "repeater", itemName: "member", summary: "name", fields: [
    { k: "name", label: "Name", max: 40 },
    { k: "role", label: "Role", max: 40, placeholder: "e.g. Moderator" },
    { k: "row", label: "Row", type: "number", min: 1, max: 20, help: "1 is the top row" },
    { k: "mc", label: "Minecraft username", max: 16, help: "For the skin head. Leave empty if it's the same as the name." },
    { k: "head", label: "Custom head picture", type: "image", folder: "team", help: "Optional, replaces the Minecraft skin" }
  ]}],
  prepare: items => items.map(m => {
    const out = { name: String(m.name || "").trim(), role: String(m.role || "").trim(), row: Math.max(1, parseInt(m.row, 10) || 1) };
    if (String(m.mc || "").trim()) out.mc = String(m.mc).trim();
    if (m.head) out.head = m.head;
    return out;
  }),
  validate: items => items.some(m => !m.name || !m.role) ? "Every member needs a name and a role."
    : items.some(m => m.mc && !/^\w{3,16}$/.test(m.mc)) ? "Minecraft usernames are 3 to 16 letters, numbers or underscores." : null,
  savedText: "Team saved."
});

/* ---------- Spawns ---------- */
const reqFields = [
  { k: "cond", label: "Conditions", type: "list", rows: 3, help: "One per line, e.g. Night time" },
  { k: "biomes", label: "Biomes", type: "list", rows: 4, help: "One per line, e.g. Deep Dark" },
  { k: "blocks", label: "Needed nearby blocks", type: "list", rows: 2, help: "One per line" }
];
export const renderSpawns = root => contentEditor(root, {
  title: "Spawns", lead: "Paradox Pokémon and Ultra Beasts, shown by the Spawns block.",
  key: "czSpawns", list: true,
  search: "Search Pokémon or biomes",
  fields: () => [{ k: "items", label: "Pokémon", type: "repeater", itemName: "Pokémon", itemPlural: "Pokémon", summary: "name", fields: [
    { k: "name", label: "Name", max: 40 },
    { k: "kind", label: "Type", type: "select", options: [["paradox", "Paradox"], ["ultra", "Ultra Beast"]] },
    ...reqFields
  ]}],
  prepare: items => items.map(p => ({ name: String(p.name || "").trim(), kind: p.kind === "ultra" ? "ultra" : "paradox", cond: lines(p.cond), biomes: lines(p.biomes), blocks: lines(p.blocks) })),
  validate: items => items.some(p => !p.name) ? "Every Pokémon needs a name." : null,
  savedText: "Spawns saved."
});

/* ---------- Legendaries ----------
   Stored as { name, structure, html, images[], cond[], biomes[], blocks[] }.
   Older entries have paras[] (one HTML string per paragraph); they're turned into html when opened. */
export const renderLegendaries = root => contentEditor(root, {
  title: "Legendaries", lead: "How to get each legendary, shown by the Legendaries block.",
  key: "czLegendaries", list: true,
  search: "Search legendaries or biomes",
  toForm: items => items.map(l => ({ ...l, html: l.html ?? (l.paras || []).map(p => `<p>${p}</p>`).join(""), images: l.images || [] })),
  fields: () => [{ k: "items", label: "Legendaries", type: "repeater", itemName: "legendary", itemPlural: "legendaries", summary: "name", fields: [
    { k: "name", label: "Name", max: 40 },
    { k: "structure", label: "Has a structure or item to summon it", type: "toggle" },
    { k: "html", label: "How to get it", type: "richtext", help: "Shown when it has a structure. Use “Picture” to add screenshots." },
    { k: "images", label: "Extra pictures", type: "images", folder: "legendaries", help: "Optional gallery under the text" },
    ...reqFields
  ]}],
  prepare: items => items.map(l => ({
    name: String(l.name || "").trim(), structure: !!l.structure,
    html: l.html || "", images: l.images || [],
    // the old public site reads paras[]; keep it filled until the new site is live
    paras: [...String(l.html || "").matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(m => m[1].trim()).filter(Boolean)
      .concat(/<p[\s>]/i.test(l.html || "") || !String(l.html || "").trim() ? [] : [l.html]),
    cond: lines(l.cond), biomes: lines(l.biomes), blocks: lines(l.blocks)
  })),
  validate: items => items.some(l => !l.name) ? "Every legendary needs a name." : null,
  savedText: "Legendaries saved."
});
