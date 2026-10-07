// Small helpers shared by the public site.
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Staff-written HTML is cleaned so nothing in it can run scripts on visitors' browsers.
export function clean(h) {
  if (!window.DOMPurify) return esc(String(h ?? "").replace(/<[^>]*>/g, " "));
  return DOMPurify.sanitize(String(h ?? ""), { ADD_ATTR: ["target"], FORBID_TAGS: ["style", "form", "input", "iframe", "script"] });
}
// Only normal web links and site paths (no "javascript:" links)
export function safeUrl(u, fallback = "") {
  u = String(u ?? "").trim();
  if (!u) return fallback;
  return /^(https?:\/\/|\/|#)/i.test(u) || /^[\w\-./]+\.(png|jpe?g|gif|webp|svg)$/i.test(u) ? u : fallback;
}
export const safeColor = c => /^#[0-9a-f]{3,8}$/i.test(String(c)) ? c : "#e58aa8";
export const isExternal = u => /^https?:\/\//i.test(u) && !u.startsWith(location.origin);

let toastTimer;
export function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

export const fmtDate = d => { try { return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }); } catch (e) { return ""; } };

// Sidebar icons (names listed in docs/content-model.md)
const ICONS = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><circle cx="12" cy="12" r="3"/>',
  cube: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
  rules: '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4M10 12h6M10 16h6"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9 11h.01M15 11h.01"/>',
  bag: '<path d="M6 8h12l-1 12H7z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 9"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21 20c0-2.8-1.7-5-4-5.7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  ext: '<path d="M7 17L17 7M8 7h9v9"/>',
  // simple drawings of the social apps, in the same line style as the other icons
  tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.6 2.4 4.4 5 4.6"/>',
  youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor"/>',
  facebook: '<path d="M14 21v-7.5h3l.5-3.5H14V8c0-1 .4-1.7 1.8-1.7H18V3.2A20 20 0 0 0 15.3 3C12.8 3 11 4.5 11 7.3V10H8v3.5h3V21"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
  x: '<path d="M4 4h4.5L20 20h-4.5z"/><path d="M20 4l-6.8 7.6M4 20l6.8-7.6"/>'
};
export const icon = (name, cls = "") =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.info}</svg>`;
