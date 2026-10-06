// Admin site entry point: login check, sidebar, and switching between screens (#/media, #/pages, ...).
import { $, $$, html, raw, list, icon, toast, errText, hasUnsaved, clearLeaveGuard, confirmDialog } from "./lib/ui.js";
import { sb, currentStaff, signOut } from "./lib/sb.js";
import { PUBLIC_SITE } from "./config.js";
import { renderLogin } from "./views/login.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderMedia } from "./views/media.js";
import { renderPages } from "./views/pages.js";
import { renderMenu } from "./views/menu.js";
import { renderNews } from "./views/news.js";
import { renderSettings } from "./views/settings.js";
import { renderStore, renderPayments, renderTeam, renderSpawns, renderLegendaries } from "./views/lists.js";
import { renderHistory } from "./views/history.js";


// Sidebar sections. `route` is the address after #/
const NAV = [
  { items: [{ route: "", label: "Dashboard", icon: "home", view: renderDashboard }] },
  { label: "Content", items: [
    { route: "pages", label: "Pages", icon: "pages", view: renderPages },
    { route: "menu", label: "Menu", icon: "menu", view: renderMenu },
    { route: "news", label: "News", icon: "news", view: renderNews }
  ]},
  { label: "Lists", items: [
    { route: "store", label: "Store ranks", icon: "store", view: renderStore },
    { route: "payments", label: "Payment methods", icon: "card", view: renderPayments },
    { route: "team", label: "Team", icon: "users", view: renderTeam },
    { route: "spawns", label: "Spawns", icon: "ball", view: renderSpawns },
    { route: "legendaries", label: "Legendaries", icon: "star", view: renderLegendaries }
  ]},
  { label: "Library", items: [{ route: "media", label: "Media", icon: "image", view: renderMedia }] },
  { label: "Site", items: [
    { route: "settings", label: "Settings", icon: "settings", view: renderSettings },
    { route: "history", label: "History", icon: "history", view: renderHistory }
  ]}
];
const ROUTES = NAV.flatMap(g => g.items);

let staff = null;
const app = $("#app");

function shell() {
  app.innerHTML = html`
    <div class="layout">
      <aside class="side" id="side" aria-label="Admin menu">
        <a class="brand" href="#/"><img src="images/floreon-logo.webp" alt="" width="34" height="34"><span>Floreon<small>Staff</small></span></a>
        <nav class="nav">${list(NAV, g => html`
          <div class="nav-group">
            ${g.label ? raw(html`<p class="nav-label">${g.label}</p>`) : ""}
            ${list(g.items, it => html`<a href="#/${it.route}" data-route="${it.route}">${raw(icon(it.icon))}<span>${it.label}</span></a>`)}
          </div>`)}
        </nav>
        <div class="side-foot">
          <p class="who">${staff.name}<small>${staff.email}</small></p>
          <a class="side-link" href="${PUBLIC_SITE}" target="_blank" rel="noopener">${raw(icon("external"))}View site</a>
          <button class="side-link" type="button" id="logout">${raw(icon("logout"))}Log out</button>
        </div>
      </aside>
      <div class="scrim" id="scrim"></div>
      <div class="main-wrap">
        <header class="topbar">
          <button class="icon-btn" id="menuBtn" type="button" aria-label="Open menu" aria-expanded="false">${raw(icon("menu"))}</button>
          <a class="brand" href="#/"><img src="images/floreon-logo.webp" alt="" width="28" height="28"><span>Floreon<small>Staff</small></span></a>
        </header>
        <main class="main" id="view" tabindex="-1"></main>
      </div>
    </div>`;
  $("#logout").addEventListener("click", async () => {
    if (hasUnsaved() && !await confirmDialog("Log out without saving?", "Your changes on this page haven't been saved yet.", { yes: "Log out" })) return;
    clearLeaveGuard(); await signOut(); staff = null; location.hash = "#/"; start();
  });
  const setMenu = open => { document.body.classList.toggle("menu-open", open); $("#menuBtn").setAttribute("aria-expanded", open); };
  $("#menuBtn").addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
  $("#scrim").addEventListener("click", () => setMenu(false));
}

let currentHash = location.hash, ignoreNext = false;
async function route() {
  if (!staff) return;
  if (ignoreNext) { ignoreNext = false; return; }
  if (location.hash !== currentHash && hasUnsaved()) {
    const leave = await confirmDialog("Leave without saving?", "Your changes on this page haven't been saved yet.", { yes: "Leave", danger: true });
    if (!leave) { ignoreNext = true; location.hash = currentHash; return; }
  }
  currentHash = location.hash;
  clearLeaveGuard();
  $("#view")?.dispatchEvent(new Event("view:leave"));
  const path = location.hash.replace(/^#\/?/, "");
  const top = path.split("/")[0];
  const r = ROUTES.find(x => x.route === top) || ROUTES[0];
  $$("#side .nav a").forEach(a => a.classList.toggle("active", a.dataset.route === r.route));
  document.title = `${r.label} – Floreon staff`;
  document.body.classList.remove("menu-open");
  const old = $("#view");
  const view = old.cloneNode(false); // fresh element, so old screens' listeners don't pile up
  old.replaceWith(view);
  window.scrollTo(0, 0);
  try { await r.view(view, { staff, path }); }
  catch (e) { console.error(e); view.innerHTML = html`<div class="panel"><h1>Something went wrong</h1><p>${errText(e)}</p><p>Reload the page to try again.</p></div>`; }
  view.focus({ preventScroll: true });
}

async function start() {
  try { staff = await currentStaff(); }
  catch (e) { staff = null; }
  if (!staff) {
    document.title = "Log in – Floreon staff";
    return renderLogin(app, s => { staff = s; toast(`Welcome, ${s.name}!`); shell(); route(); });
  }
  shell();
  route();
}

window.addEventListener("hashchange", route);
// If the login expires or someone logs out in another tab, go back to the login screen.
sb.auth.onAuthStateChange(evt => { if (evt === "SIGNED_OUT" && staff) { staff = null; start(); } });
start();
