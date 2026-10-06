// Small UI helpers shared by every admin screen.

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// html`<p>${value}</p>` escapes every value unless it is wrapped in raw()
const RAW = Symbol("raw");
export const raw = s => ({ [RAW]: true, s: String(s ?? "") });
export function html(strings, ...vals) {
  return strings.reduce((out, str, i) => {
    if (i === 0) return str;
    const v = vals[i - 1];
    const part = v == null || v === false ? ""
      : Array.isArray(v) ? v.map(x => (x && x[RAW]) ? x.s : esc(x)).join("")
      : (v && v[RAW]) ? v.s : esc(v);
    return out + part + str;
  }, "");
}
// join a list of html`` results into one raw chunk
export const list = (items, fn) => raw(items.map(fn).join(""));

export const errText = e => (e && (e.message || e.error_description)) || String(e);

export function fmtDate(d, withTime = false) {
  if (!d) return "";
  const opt = { year: "numeric", month: "short", day: "numeric" };
  if (withTime) Object.assign(opt, { hour: "numeric", minute: "2-digit" });
  try { return new Date(d).toLocaleString(undefined, opt); } catch (e) { return ""; }
}

export function timeAgo(d) {
  const s = Math.round((Date.now() - new Date(d)) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const days = Math.round(h / 24); if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return fmtDate(d);
}

export const fmtBytes = b => b == null ? "" : b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(0) + " KB" : (b / 1048576).toFixed(1) + " MB";

export function debounce(fn, ms = 200) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/* ---------- toast ---------- */
let toastTimer;
export function toast(msg, kind = "ok") {
  const t = $("#toast");
  t.textContent = msg;
  t.dataset.kind = kind;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), kind === "error" ? 5000 : 2600);
}

/* ---------- dialogs ---------- */
// Opens a modal. `body` is an html string. Resolves with the button value, or null if closed.
export function dialog({ title, body = "", actions = [{ label: "OK", value: true, primary: true }], wide = false, onOpen }) {
  return new Promise(resolve => {
    const wrap = document.createElement("div");
    wrap.className = "dialog-wrap";
    wrap.innerHTML = html`
      <div class="dialog ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="dlgTitle">
        <header><h2 id="dlgTitle">${title}</h2>
          <button class="icon-btn" data-close aria-label="Close">${raw(icon("x"))}</button></header>
        <div class="dialog-body">${raw(body)}</div>
        ${actions.length ? raw(html`<footer>${list(actions, (a, i) =>
          html`<button type="button" class="btn ${a.primary ? "" : "ghost"} ${a.danger ? "danger" : ""}" data-i="${i}">${a.label}</button>`)}</footer>`) : ""}
      </div>`;
    const last = document.activeElement;
    const close = v => { wrap.remove(); document.removeEventListener("keydown", onKey); last && last.focus && last.focus(); resolve(v); };
    const onKey = e => { if (e.key === "Escape") close(null); };
    wrap.addEventListener("click", e => {
      if (e.target === wrap || e.target.closest("[data-close]")) return close(null);
      const b = e.target.closest("footer [data-i]");
      if (b) close(actions[+b.dataset.i].value);
    });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(wrap);
    const api = { el: wrap, close };
    if (onOpen) onOpen(api);
    (wrap.querySelector("[autofocus]") || wrap.querySelector("footer .btn:not(.ghost)") || wrap.querySelector("[data-close]")).focus();
  });
}

export const confirmDialog = (title, text, { yes = "Delete", danger = true } = {}) =>
  dialog({ title, body: html`<p>${text}</p>`, actions: [
    { label: "Cancel", value: false }, { label: yes, value: true, primary: true, danger }
  ]}).then(Boolean);

/* ---------- icons (simple line icons) ---------- */
const ICONS = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  pages: '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4M10 12h6M10 16h6"/>',
  menu: '<path d="M4 6h16M4 12h10M4 18h7"/>',
  news: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v8a2 2 0 0 1-2 2"/><path d="M8 9h5M8 13h5"/>',
  store: '<path d="M6 8h12l-1 12H7z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  card: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21 20c0-2.8-1.7-5-4-5.7"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><circle cx="12" cy="12" r="3"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 9"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
  logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  rules: '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4M10 12h6M10 16h6"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  bag: '<path d="M6 8h12l-1 12H7z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  cube: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>'
};
export const icon = (name, cls = "") =>
  `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.info}</svg>`;
export const ICON_NAMES = Object.keys(ICONS);
