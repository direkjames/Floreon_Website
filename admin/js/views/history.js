// History: earlier versions of pages and lists, kept automatically by the database. Restore with one click.
import { $, html, raw, list, icon, toast, confirmDialog, errText, fmtDate, timeAgo } from "../lib/ui.js";
import { listHistory, restoreHistory } from "../lib/sb.js";

const SECTION_NAMES = {
  siteSettings: "Settings", siteNav: "Menu", siteTeam: "Team", sitePlans: "Store ranks", sitePayments: "Payment methods",
  czSpawns: "Spawns", czLegendaries: "Legendaries", czFaqs: "Cozymon FAQs (old panel)", czFeatures: "Cozymon features (old panel)",
  czAbout: "Cozymon About (old panel)", czSeries: "Series guide (old panel)", siteRules: "Rules (old panel)", siteVotes: "Vote sites (old panel)",
  obFaqs: "Oneblock FAQs (old panel)", obFeatures: "Oneblock features (old panel)", obAbout: "Oneblock About (old panel)"
};
const nameOf = e => e.item_type === "page" ? `Page: ${e.snapshot.title}` : (SECTION_NAMES[e.item_key] || e.item_key);
const detailOf = e => e.item_type === "page"
  ? `/${e.snapshot.slug === "home" ? "" : e.snapshot.slug}, ${e.snapshot.blocks?.length || 0} block${e.snapshot.blocks?.length === 1 ? "" : "s"}, ${e.snapshot.published ? "live" : "draft"}`
  : Array.isArray(e.snapshot.data) ? `${e.snapshot.data.length} item${e.snapshot.data.length === 1 ? "" : "s"}` : "";

export async function renderHistory(root) {
  root.innerHTML = html`
    <header class="page-head"><div><h1>History</h1>
      <p class="lead">Every time something is saved or deleted, the version before it is kept here. Restore one to put it back.</p></div></header>
    <div class="toolbar"><select id="hFilter" aria-label="Show"><option value="">Everything</option><option value="page">Pages</option><option value="content">Lists, menu and settings</option></select></div>
    <div class="panel flush"><ul class="table-rows" id="hRows"><li class="loading">Loading history…</li></ul></div>`;
  let entries;
  try { entries = await listHistory(); }
  catch (e) { $("#hRows", root).innerHTML = html`<li class="empty">Couldn't load history: ${errText(e)}</li>`; return; }

  const draw = () => {
    const f = $("#hFilter", root).value;
    const shown = entries.filter(e => !f || e.item_type === f);
    $("#hRows", root).innerHTML = shown.length ? list(shown, e => html`
      <li>
        <span class="row-main"><strong>${nameOf(e)}</strong><span class="subtle">${detailOf(e)}</span></span>
        <span class="row-meta">${e.action === "delete" ? raw('<span class="tag warn-tag">Deleted</span>') : raw('<span class="tag draft">Before an edit</span>')}<span title="${fmtDate(e.changed_at, true)}">${timeAgo(e.changed_at)}</span></span>
        <span class="row-acts"><button type="button" class="btn ghost small" data-restore="${e.id}">${raw(icon("history"))}Restore</button></span>
      </li>`).s : `<li class="empty">Nothing here yet. Earlier versions appear after the first edit.</li>`;
  };
  draw();
  $("#hFilter", root).addEventListener("change", draw);
  $("#hRows", root).addEventListener("click", async ev => {
    const b = ev.target.closest("[data-restore]"); if (!b) return;
    const e = entries.find(x => String(x.id) === b.dataset.restore);
    const what = nameOf(e);
    if (!await confirmDialog(`Restore ${what}?`, `This puts back the version from ${fmtDate(e.changed_at, true)}. The current version is kept in History, so you can undo this.`, { yes: "Restore", danger: false })) return;
    b.disabled = true;
    try { await restoreHistory(e); toast(`${what} restored.`); entries = await listHistory(); draw(); }
    catch (er) { toast("Couldn't restore: " + errText(er), "error"); b.disabled = false; }
  });
}
