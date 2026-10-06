/* =====================================================
   DATA LAYER – talks to Supabase.
   Everything that reads or writes the database lives here,
   so app.js and admin.js never call Supabase directly.
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
const sb = (SUPABASE.url && SUPABASE.anonKey && window.supabase)
  ? window.supabase.createClient(SUPABASE.url, SUPABASE.anonKey)
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

async function saveSection(key) {
  if (!sb) throw new Error("Supabase isn't connected yet (fill in SUPABASE in js/config.js).");
  if (!CONTENT_KEYS.includes(key)) throw new Error("Unknown section: " + key);
  const { error } = await sb.from("content").upsert({ key, data: DB[key] });
  if (error) throw error;
}

async function saveSections(keys) {
  if (!sb) throw new Error("Supabase isn't connected yet.");
  const rows = keys.filter(k => CONTENT_KEYS.includes(k)).map(key => ({ key, data: DB[key] }));
  const { error } = await sb.from("content").upsert(rows);
  if (error) throw error;
}

/* ---------- news posts ---------- */
async function loadPosts() {
  if (!sb) return POSTS;
  // Visitors only get published posts; admins also get drafts (the database rules decide).
  const { data, error } = await sb.from("posts").select("*")
    .order("pinned", { ascending: false }).order("created_at", { ascending: false });
  if (error) { console.warn("Couldn't load posts:", error); return POSTS; }
  POSTS = data;
  return POSTS;
}

async function savePost(post) {
  if (!sb) throw new Error("Supabase isn't connected yet.");
  const row = { title: post.title, body: post.body, image_url: post.image_url || null, pinned: !!post.pinned, published: !!post.published };
  const q = post.id
    ? sb.from("posts").update(row).eq("id", post.id)
    : sb.from("posts").insert({ ...row, author_name: post.author_name || null });
  const { error } = await q;
  if (error) throw error;
  await loadPosts();
}

async function deletePost(id) {
  if (!sb) throw new Error("Supabase isn't connected yet.");
  const { error } = await sb.from("posts").delete().eq("id", id);
  if (error) throw error;
  await loadPosts();
}

/* ---------- staff login ---------- */
async function currentAdmin() {
  if (!sb) return null;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return null;
  const { data, error } = await sb.from("admins").select("display_name").eq("user_id", session.user.id).maybeSingle();
  if (error || !data) return null;
  return { id: session.user.id, email: session.user.email, name: data.display_name || session.user.email };
}

async function signIn(email, password) {
  if (!sb) throw new Error("Supabase isn't connected yet (fill in SUPABASE in js/config.js).");
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const admin = await currentAdmin();
  if (!admin) { await sb.auth.signOut(); throw new Error("This account isn't on the staff list."); }
  return admin;
}

async function signOut() { if (sb) await sb.auth.signOut(); }

/* ---------- image uploads (resized in the browser, then stored in Supabase Storage) ---------- */
function resizeImage(file, max = 1280, png = false) {
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      const ctx = c.getContext("2d");
      if (png) ctx.imageSmoothingEnabled = false; // keep pixel-art skins crisp
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => b ? resolve(b) : reject(new Error("Couldn't process that picture.")), png ? "image/png" : "image/jpeg", 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That file couldn't be read as a picture.")); };
    img.src = url;
  });
}

async function uploadImage(file, folder, max = 1280, png = false) {
  if (!sb) throw new Error("Supabase isn't connected yet, so pictures can't be uploaded. Use an image link instead.");
  const blob = await resizeImage(file, max, png);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${png ? "png" : "jpg"}`;
  const bucket = sb.storage.from(SUPABASE.imageBucket);
  const { error } = await bucket.upload(path, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
  if (error) throw error;
  return bucket.getPublicUrl(path).data.publicUrl;
}
