// Everything the admin site reads from or writes to Supabase.
// Screens never call Supabase directly; they use these functions.
import { SUPABASE, UPLOAD } from "../config.js";

if (!window.supabase) throw new Error("The Supabase library didn't load. Check your internet connection and reload.");
export const sb = window.supabase.createClient(SUPABASE.url, SUPABASE.publishableKey);
const bucket = () => sb.storage.from(SUPABASE.imageBucket);

const must = ({ data, error }) => { if (error) throw error; return data; };

/* ---------- staff login ---------- */
export async function currentStaff() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return null;
  const { data, error } = await sb.from("admins").select("display_name").eq("user_id", session.user.id).maybeSingle();
  if (error || !data) return null;
  return { id: session.user.id, email: session.user.email, name: data.display_name || session.user.email.split("@")[0] };
}

export async function signIn(email, password) {
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(/invalid login/i.test(error.message) ? "Wrong email or password." : error.message);
  const staff = await currentStaff();
  if (!staff) { await sb.auth.signOut(); throw new Error("This account isn't on the staff list. Ask the owner to add you."); }
  return staff;
}

export const signOut = () => sb.auth.signOut();

/* ---------- content sections (settings, menu, shared lists) ---------- */
export async function getContent(key) {
  const row = must(await sb.from("content").select("data, updated_at").eq("key", key).maybeSingle());
  return row ? row.data : null;
}
export async function saveContent(key, data) {
  must(await sb.from("content").upsert({ key, data }));
}

/* ---------- pages ---------- */
export const listPages = async () =>
  must(await sb.from("pages").select("id, slug, title, published, updated_at, sort").order("sort", { ascending: true }));
export const recentPages = async (n = 5) =>
  must(await sb.from("pages").select("id, slug, title, published, updated_at").order("updated_at", { ascending: false }).limit(n));

/* ---------- news ---------- */
export const recentPosts = async (n = 5) =>
  must(await sb.from("posts").select("id, title, published, pinned, created_at, author_name").order("created_at", { ascending: false }).limit(n));

/* ---------- media library ---------- */
export const listMedia = async () =>
  must(await sb.from("media").select("*").order("created_at", { ascending: false }));

export async function updateMedia(id, fields) {
  must(await sb.from("media").update(fields).eq("id", id));
}

// Read width/height and shrink big pictures. PNG/GIF keep their format (transparency, pixel art);
// photos become WebP, which is much smaller.
export function prepareImage(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return reject(new Error(`${file.name}: only PNG, JPG, WebP and GIF pictures can be uploaded.`));
    if (file.size > UPLOAD.maxFileMB * 1048576) return reject(new Error(`${file.name} is bigger than ${UPLOAD.maxFileMB} MB.`));
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth, h = img.naturalHeight;
      const scale = Math.min(1, UPLOAD.maxSide / Math.max(w, h));
      // GIFs are uploaded untouched so animations keep working
      if (file.type === "image/gif" || (scale === 1 && file.type !== "image/jpeg")) return resolve({ blob: file, width: w, height: h, ext: file.type.split("/")[1].replace("jpeg", "jpg") });
      const c = document.createElement("canvas");
      c.width = Math.round(w * scale); c.height = Math.round(h * scale);
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = !(file.type === "image/png" && Math.max(w, h) <= 256); // keep small pixel art crisp
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const png = file.type === "image/png";
      c.toBlob(b => b ? resolve({ blob: b, width: c.width, height: c.height, ext: png ? "png" : "webp" })
                      : reject(new Error(`${file.name} couldn't be processed.`)),
        png ? "image/png" : "image/webp", UPLOAD.quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`${file.name} couldn't be read as a picture.`)); };
    img.src = url;
  });
}

const slugName = name => name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "image";

export async function uploadMedia(file, folder = "uploads") {
  const img = await prepareImage(file);
  const path = `${folder}/${Date.now().toString(36)}-${slugName(file.name)}.${img.ext}`;
  must(await bucket().upload(path, img.blob, { contentType: img.blob.type || file.type, cacheControl: "31536000", upsert: false }));
  const url = bucket().getPublicUrl(path).data.publicUrl;
  const row = { path, url, name: file.name, alt: "", folder, mime: img.blob.type || file.type, size: img.blob.size, width: img.width, height: img.height };
  const saved = must(await sb.from("media").insert(row).select().single());
  return saved;
}

export async function deleteMedia(item) {
  const { error } = await bucket().remove([item.path]);
  if (error && !/not found/i.test(error.message)) throw error;
  must(await sb.from("media").delete().eq("id", item.id));
}

// Which pages / lists / posts mention this image? (so nobody deletes a picture that's in use)
export async function whereUsed(url) {
  const [pages, content, posts] = await Promise.all([
    sb.from("pages").select("title, slug, blocks"),
    sb.from("content").select("key, data"),
    sb.from("posts").select("title, body, image_url")
  ]);
  const hits = [];
  (pages.data || []).forEach(p => { if (JSON.stringify(p.blocks).includes(url)) hits.push(`Page: ${p.title}`); });
  const names = { siteTeam: "Meet the team", sitePayments: "Payment methods", sitePlans: "Store ranks", czLegendaries: "Legendaries", siteSettings: "Site settings" };
  (content.data || []).forEach(c => { if (JSON.stringify(c.data).includes(url)) hits.push(names[c.key] || `Section: ${c.key}`); });
  (posts.data || []).forEach(p => { if ((p.image_url || "") === url || (p.body || "").includes(url)) hits.push(`News: ${p.title}`); });
  return hits;
}

// Pictures uploaded with the old admin panel are in storage but not in the library yet.
export async function findUnlistedImages(known) {
  const found = [];
  for (const folder of ["news", "heads", "payments", "uploads"]) {
    const { data, error } = await bucket().list(folder, { limit: 1000 });
    if (error) continue;
    for (const f of data || []) {
      if (!f.name || f.name.startsWith(".")) continue;
      const path = `${folder}/${f.name}`;
      if (known.has(path)) continue;
      found.push({ path, url: bucket().getPublicUrl(path).data.publicUrl, name: f.name, alt: "", folder,
        mime: f.metadata?.mimetype || null, size: f.metadata?.size ?? null });
    }
  }
  return found;
}
export async function addToLibrary(rows) {
  if (!rows.length) return [];
  return must(await sb.from("media").insert(rows).select());
}

/* ---------- page builder ---------- */
export const getPage = async id =>
  must(await sb.from("pages").select("*").eq("id", id).maybeSingle());

export async function createPage({ title, slug, blocks = [] }) {
  const sort = Date.now() % 1e9; // new pages go to the end of the list
  try {
    return must(await sb.from("pages").insert({ title, slug, description: "", published: false, blocks, sort }).select().single());
  } catch (e) { throw friendlySlugError(e); }
}

export async function savePage(id, fields) {
  try { must(await sb.from("pages").update(fields).eq("id", id)); }
  catch (e) { throw friendlySlugError(e); }
}

export const deletePage = async id => must(await sb.from("pages").delete().eq("id", id));

function friendlySlugError(e) {
  const m = e?.message || "";
  if (/duplicate key|unique/i.test(m)) return new Error("Another page already uses that address. Pick a different one.");
  if (/check constraint/i.test(m)) return new Error("The address can only use lowercase letters, numbers, dashes, and / between parts.");
  return e;
}

// Earlier saved versions of one page, newest first
export const pageVersions = async id =>
  must(await sb.from("edit_history").select("id, changed_at, action, snapshot").eq("item_type", "page").eq("item_key", id).order("changed_at", { ascending: false }).limit(30));

// When a page's address changes, update the menu so its link keeps working
export async function renameInMenu(oldSlug, newSlug) {
  const nav = await getContent("siteNav");
  if (!Array.isArray(nav)) return false;
  let changed = false;
  const walk = items => items.forEach(it => {
    if (it.type === "page" && it.slug === oldSlug) { it.slug = newSlug; changed = true; }
    if (Array.isArray(it.children)) walk(it.children);
  });
  walk(nav);
  if (changed) await saveContent("siteNav", nav);
  return changed;
}

export async function removeFromMenu(slug) {
  const nav = await getContent("siteNav");
  if (!Array.isArray(nav)) return false;
  let changed = false;
  const prune = items => items.filter(it => {
    if (it.type === "page" && it.slug === slug) { changed = true; return false; }
    if (Array.isArray(it.children)) it.children = prune(it.children);
    return true;
  });
  const next = prune(nav);
  if (changed) await saveContent("siteNav", next);
  return changed;
}

/* ---------- news posts ---------- */
export const listPosts = async () =>
  must(await sb.from("posts").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false }));
export const getPost = async id => must(await sb.from("posts").select("*").eq("id", id).maybeSingle());
export async function savePost(post) {
  const row = { title: post.title, body: post.body || "", image_url: post.image_url || null, pinned: !!post.pinned, published: !!post.published };
  if (post.created_at) row.created_at = post.created_at;
  if (post.id) { must(await sb.from("posts").update(row).eq("id", post.id)); return post.id; }
  return must(await sb.from("posts").insert({ ...row, author_name: post.author_name || null }).select().single()).id;
}
export const deletePost = async id => must(await sb.from("posts").delete().eq("id", id));
