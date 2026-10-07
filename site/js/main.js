// Public site: loads settings, menu, lists and news from Supabase, then draws pages from their blocks.
// Pages live at real addresses (/cozymon/faq). Netlify sends every address to index.html (see netlify.toml).
import { SUPABASE, LOAD_TIMEOUT } from "./config.js";
import { $, $$, esc, safeUrl, icon, toast } from "./util.js";
import { BLOCKS, resolveLink } from "./blocks.js";
import FALLBACK from "./fallback.js";

const LIST_KEYS = ["siteTeam", "sitePlans", "sitePayments", "czSpawns", "czLegendaries"];
const sb = window.supabase && SUPABASE.url && SUPABASE.publishableKey ? window.supabase.createClient(SUPABASE.url, SUPABASE.publishableKey) : null;

const S = { settings: {}, nav: [], lists: {}, posts: [], pages: new Map(), offline: false };
let cleanups = [];

/* ---------- loading data ---------- */
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

async function loadSite() {
  if (!sb) throw new Error("Supabase isn't configured");
  const [content, posts] = await withTimeout(Promise.all([
    sb.from("content").select("key, data").in("key", ["siteSettings", "siteNav", ...LIST_KEYS]),
    sb.from("posts").select("id, title, body, image_url, pinned, published, created_at, author_name")
      .eq("published", true).order("pinned", { ascending: false }).order("created_at", { ascending: false })
  ]), LOAD_TIMEOUT);
  if (content.error) throw content.error;
  const byKey = Object.fromEntries((content.data || []).map(r => [r.key, r.data]));
  S.settings = { ...FALLBACK.settings, ...(byKey.siteSettings || {}) };
  S.nav = Array.isArray(byKey.siteNav) ? byKey.siteNav : FALLBACK.nav;
  S.lists = Object.fromEntries(LIST_KEYS.map(k => [k, byKey[k] ?? FALLBACK.lists[k] ?? []]));
  S.posts = posts.error ? [] : posts.data || [];
}

function useFallback(reason) {
  console.warn("Floreon: showing the built-in copy of the site because the database couldn't be reached.", reason);
  S.offline = true;
  S.settings = FALLBACK.settings; S.nav = FALLBACK.nav; S.lists = FALLBACK.lists; S.posts = FALLBACK.posts;
  FALLBACK.pages.forEach(p => S.pages.set(p.slug, p));
}

async function getPage(slug) {
  if (S.pages.has(slug)) return S.pages.get(slug);
  if (S.offline) return null;
  try {
    const { data, error } = await withTimeout(sb.from("pages").select("slug, title, description, blocks").eq("slug", slug).eq("published", true).maybeSingle(), LOAD_TIMEOUT);
    if (error) throw error;
    if (data) S.pages.set(slug, data);
    return data;
  } catch (e) {
    console.warn("Couldn't load page", slug, e);
    return FALLBACK.pages.find(p => p.slug === slug) || null;
  }
}

/* ---------- addresses ---------- */
const slugFromPath = path => decodeURIComponent(path).replace(/^\/+|\/+$/g, "").replace(/\/index\.html$/, "").toLowerCase() || "home";
const pathFor = slug => slug === "home" ? "/" : "/" + slug;
// Links from the old site (/#cozymon-faq) still work
const OLD_HASHES = { "home": "/", "cozymon-about": "/cozymon", "about": "/cozymon", "cozymon-features": "/cozymon/features", "features": "/cozymon/features",
  "cozymon-faq": "/cozymon/faq", "faq": "/cozymon/faq", "spawns": "/cozymon/spawns", "legendaries": "/cozymon/legendaries",
  "oneblock-about": "/oneblock", "oneblock-features": "/oneblock/features", "oneblock-faq": "/oneblock/faq",
  "rules": "/rules", "vote": "/vote", "store": "/store", "whitelist": "/#whitelist", "admin": "/" };

/* ---------- sidebar ---------- */
function drawShell() {
  const st = S.settings;
  $$("[data-server-name]").forEach(el => el.textContent = st.serverName || "Floreon");
  $$(".brand-mark").forEach(img => { img.src = safeUrl(st.logo, "/images/floreon-logo.webp"); img.hidden = false; });
  drawFooter(st);
  const item = it => {
    const href = it.type === "page" ? pathFor(it.slug) : resolveLink(it.url, false, { settings: st });
    const ext = it.type === "link" && /^https?:\/\//i.test(href) && !href.startsWith(location.origin);
    return `<a href="${esc(href)}" ${it.type === "page" ? `data-slug="${esc(it.slug)}"` : ""} ${ext ? 'target="_blank" rel="noopener"' : ""}>
      ${it.icon ? icon(it.icon) : ""}${esc(it.label)}${ext ? icon("ext", "ext") : ""}</a>`;
  };
  $("#nav").innerHTML = S.nav.map(it => it.type === "group" ? `
    <div class="nav-group">
      <button class="nav-parent" type="button" aria-expanded="false">${icon(it.icon || "star")}${esc(it.label)}${icon("chev", "chev")}</button>
      <div class="subnav">${(it.children || []).map(item).join("")}</div>
    </div>` : item(it)).join("");
}

// Footer: copyright (the end year updates by itself), disclaimer, social buttons
const SOCIALS = [["tiktokURL", "tiktok", "TikTok"], ["youtubeURL", "youtube", "YouTube"], ["facebookURL", "facebook", "Facebook"],
  ["instagramURL", "instagram", "Instagram"], ["xURL", "x", "X"]];
function drawFooter(st) {
  const year = new Date().getFullYear(), start = parseInt(st.copyrightStart, 10);
  const years = start && start < year ? `${start}-${year}` : `${year}`;
  const name = st.serverName || "Floreon";
  const links = SOCIALS.filter(([k]) => /^https:\/\//i.test(st[k] || "")).map(([k, ic, label]) => [st[k], ic, label]);
  if (st.showDiscordInFooter && st.discordURL) links.push([st.discordURL, "chat", "Discord"]);
  $("#siteFooter").innerHTML = `
    <div class="footer-inner">
      <div class="footer-text">
        <p>${esc(st.copyrightOwner || name)} &copy; ${years}. All Rights Reserved.</p>
        ${st.disclaimer ? `<p>${esc(st.disclaimer)}</p>` : ""}
      </div>
      ${links.length ? `<nav class="socials" aria-label="${esc(name)} on social media">${links.map(([url, ic, label]) =>
        `<a href="${esc(url)}" target="_blank" rel="noopener" aria-label="${esc(name)} on ${label}" title="${label}">${icon(ic)}</a>`).join("")}</nav>` : ""}
    </div>`;
}

function markActive(slug) {
  $$("#nav a[data-slug]").forEach(a => {
    const on = a.dataset.slug === slug;
    a.classList.toggle("active", on);
    on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current");
  });
  $$("#nav .nav-group").forEach(g => {
    const has = !!g.querySelector(`a[data-slug="${CSS.escape(slug)}"]`);
    g.classList.toggle("has-active", has);
    if (has) setGroup(g, true);
  });
}
function setGroup(g, open) { g.classList.toggle("open", open); $(".nav-parent", g).setAttribute("aria-expanded", open); }

/* ---------- drawing a page ---------- */
function pageHTML(page) {
  const ctx = context();
  let out = "", inWrap = false;
  (page.blocks || []).forEach((b, i) => {
    const def = BLOCKS[b.type];
    if (!def || b.hidden) return;
    let inner = "";
    try { inner = def.render(b, ctx); } catch (e) { console.warn("Block failed to draw", b, e); return; }
    if (!inner) return;
    const id = b.anchor && /^[a-z0-9-]+$/.test(b.anchor) ? ` id="${b.anchor}"` : "";
    const section = `<section class="blk blk-${b.type}" data-i="${i}"${id}>${inner}</section>`;
    if (def.full) { if (inWrap) { out += "</div>"; inWrap = false; } out += section; }
    else { if (!inWrap) { out += '<div class="wrap">'; inWrap = true; } out += section; }
  });
  if (inWrap) out += "</div>";
  return out || `<div class="wrap"><p class="empty">This page is empty for now.</p></div>`;
}
const context = () => ({ settings: S.settings, lists: S.lists, posts: S.posts, cleanups });

const notFound = () => `<div class="wrap not-found"><h1 class="section-title">Page not found</h1>
  <p class="section-lead">That page doesn't exist, or it isn't published yet.</p><p><a class="btn" href="/">Go to the home page</a></p></div>`;

let renderToken = 0;
async function render({ scroll = true } = {}) {
  const token = ++renderToken;
  const slug = slugFromPath(location.pathname);
  const main = $("#page");
  main.setAttribute("aria-busy", "true");
  const page = await getPage(slug);
  if (token !== renderToken) return; // a newer navigation started

  cleanups.forEach(f => f()); cleanups = [];
  const name = S.settings.serverName || "Floreon";
  if (page) {
    main.innerHTML = pageHTML(page);
    const ctx = context();
    $$(".blk", main).forEach(el => { const b = page.blocks[+el.dataset.i]; BLOCKS[b.type].init?.(el, b, ctx); });
    document.title = slug === "home" ? `${name} – Minecraft Server` : `${page.title} – ${name}`;
    setMeta(page.description || S.settings.tagline || "");
  } else {
    main.innerHTML = notFound();
    document.title = `Page not found – ${name}`;
  }
  main.removeAttribute("aria-busy");
  markActive(slug);
  document.body.classList.remove("menu-open");
  $("#menuBtn").setAttribute("aria-expanded", "false");
  $("#buyModal").classList.remove("open");

  const anchor = location.hash.slice(1);
  const target = anchor && document.getElementById(anchor);
  if (target) target.scrollIntoView();
  else if (scroll) window.scrollTo(0, 0);
}
function setMeta(text) {
  let m = $('meta[name="description"]');
  if (!m) { m = document.createElement("meta"); m.name = "description"; document.head.appendChild(m); }
  m.content = text;
  const c = $('link[rel="canonical"]');
  if (c) c.href = location.origin + location.pathname;
}

function navigate(url) {
  const u = new URL(url, location.href);
  if (u.pathname === location.pathname && u.hash) {
    history.pushState(null, "", u.pathname + u.hash);
    document.getElementById(u.hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
    return;
  }
  history.pushState(null, "", u.pathname + u.search + u.hash);
  render();
}

/* ---------- events ---------- */
document.addEventListener("click", e => {
  // links inside the site switch pages without reloading
  const a = e.target.closest("a[href]");
  if (a && !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && !a.target && !a.hasAttribute("download")) {
    const u = new URL(a.getAttribute("href"), location.href);
    if (u.origin === location.origin && !/\.[a-z0-9]{2,5}$/i.test(u.pathname)) {
      if (a.getAttribute("href").startsWith("#")) return; // plain jump link on this page
      e.preventDefault(); navigate(u.href); return;
    }
  }
  const parent = e.target.closest(".nav-parent");
  if (parent) { const g = parent.closest(".nav-group"); setGroup(g, !g.classList.contains("open")); }
  const zoom = e.target.closest("[data-zoom]");
  if (zoom) { $("#lightbox img").src = zoom.dataset.zoom; $("#lightbox").classList.add("open"); }
  if (e.target.closest("#lightbox")) $("#lightbox").classList.remove("open");
  if (e.target.id === "buyModal" || e.target.closest("#buyClose")) $("#buyModal").classList.remove("open");
});
document.addEventListener("keydown", e => { if (e.key === "Escape") { $("#buyModal").classList.remove("open"); $("#lightbox").classList.remove("open"); } });
window.addEventListener("popstate", () => render({ scroll: false }));
// an old-style link (/#cozymon-faq) opened while already on the home page
window.addEventListener("hashchange", () => {
  const to = OLD_HASHES[location.hash.slice(1)];
  if (to && !to.includes("#") && slugFromPath(location.pathname) === "home") { history.replaceState(null, "", to); render(); }
});

$("#menuBtn").addEventListener("click", () => {
  const open = document.body.classList.toggle("menu-open");
  $("#menuBtn").setAttribute("aria-expanded", open);
});
$("#scrim").addEventListener("click", () => document.body.classList.remove("menu-open"));

try { const t = localStorage.getItem("floreon-theme"); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
$("#themeBtn").addEventListener("click", () => {
  const root = document.documentElement;
  const dark = root.dataset.theme === "dark" || (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset.theme = dark ? "light" : "dark";
  try { localStorage.setItem("floreon-theme", root.dataset.theme); } catch (e) {}
});

/* ---------- start ---------- */
(async () => {
  const old = location.hash.slice(1);
  if (OLD_HASHES[old] && slugFromPath(location.pathname) === "home") history.replaceState(null, "", OLD_HASHES[old]);
  try { await loadSite(); } catch (e) { useFallback(e); }
  drawShell();
  await render({ scroll: false });
  document.body.classList.add("ready");
})();
