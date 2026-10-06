// Pages: the list of pages, and the block-based page editor.
import { $, $$, html, raw, list, icon, toast, dialog, confirmDialog, errText, timeAgo, fmtDate, setLeaveGuard } from "../lib/ui.js";
import { listPages, getPage, createPage, savePage, deletePage, pageVersions, renameInMenu, removeFromMenu, getContent } from "../lib/sb.js";
import { BLOCKS, BLOCK_GROUPS, COMMON_FIELDS, newBlock, blockId } from "../lib/blocks.js";
import { renderFields, bindFields, reopen, openKeys, getPath } from "../lib/fields.js";
import { PUBLIC_SITE } from "../config.js";

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*)*$/;
const slugify = s => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9/]+/g, "-").replace(/-*\/-*/g, "/").replace(/^[-/]+|[-/]+$/g, "").replace(/\/{2,}/g, "/").slice(0, 80);
const pageUrl = slug => PUBLIC_SITE + (slug === "home" ? "/" : "/" + slug);
const shownSlug = slug => slug === "home" ? "/ (home page)" : "/" + slug;

export function renderPages(root, ctx) {
  const id = ctx.path.split("/")[1];
  return id ? renderEditor(root, id) : renderList(root);
}

/* =========================================================
   PAGE LIST
   ========================================================= */
async function renderList(root) {
  root.innerHTML = html`
    <header class="page-head">
      <div><h1>Pages</h1><p class="lead">Every page on the site. Open one to change its text, pictures and layout.</p></div>
      <button type="button" class="btn" id="newPage">${raw(icon("plus"))}New page</button>
    </header>
    <div class="panel flush"><ul class="table-rows" id="pageRows"><li class="loading">Loading pages…</li></ul></div>
    <p class="hint">Pages that aren't in the <a href="#/menu">Menu</a> still work if someone has the link.</p>`;

  let pages = [];
  try { pages = await listPages(); }
  catch (e) { $("#pageRows", root).innerHTML = html`<li class="empty">Couldn't load pages: ${errText(e)}</li>`; return; }

  const draw = () => {
    $("#pageRows", root).innerHTML = pages.length ? list(pages, p => html`
      <li>
        <a class="row-main" href="#/pages/${p.id}"><strong>${p.title}</strong><span class="subtle">${shownSlug(p.slug)}</span></a>
        <span class="row-meta">${p.published ? raw('<span class="tag">Live</span>') : raw('<span class="tag draft">Draft</span>')}<span>${timeAgo(p.updated_at)}</span></span>
        <span class="row-acts">
          <a class="btn ghost small" href="#/pages/${p.id}">Edit</a>
          ${p.slug === "home" ? "" : raw(html`<button type="button" class="icon-btn danger" data-del="${p.id}" aria-label="Delete ${p.title}">${raw(icon("trash"))}</button>`)}
        </span>
      </li>`).s : `<li class="empty">No pages yet. Run 003_seed_pages.sql in Supabase, or create one.</li>`;
  };
  draw();

  $("#pageRows", root).addEventListener("click", async e => {
    const b = e.target.closest("[data-del]"); if (!b) return;
    const p = pages.find(x => x.id === b.dataset.del);
    if (!await confirmDialog(`Delete “${p.title}”?`, `The page at ${shownSlug(p.slug)} will stop working, and it will be removed from the menu. You can still restore it from History.`)) return;
    try {
      await deletePage(p.id);
      await removeFromMenu(p.slug).catch(() => {});
      pages = pages.filter(x => x !== p); draw(); toast("Page deleted.");
    } catch (er) { toast("Couldn't delete: " + errText(er), "error"); }
  });

  $("#newPage", root).addEventListener("click", () => newPageDialog(pages));
}

async function newPageDialog(pages) {
  let els = {};
  const res = await dialog({
    title: "New page",
    body: html`
      <label>Page title<input id="npTitle" placeholder="e.g. Events" maxlength="120" autofocus></label>
      <label>Address <small>where the page lives on the site</small>
        <span class="prefixed"><span>${PUBLIC_SITE.replace(/^https?:\/\//, "")}/</span><input id="npSlug" placeholder="events" maxlength="80"></span></label>
      <label>Start with
        <select id="npFrom"><option value="">A blank page</option>${list(pages, p => html`<option value="${p.id}">A copy of “${p.title}”</option>`)}</select></label>
      <p class="err" id="npErr"></p>`,
    actions: [{ label: "Cancel", value: null }, { label: "Create page", value: "ok", primary: true }],
    onOpen: ({ el }) => {
      els = { title: $("#npTitle", el), slug: $("#npSlug", el), from: $("#npFrom", el), err: $("#npErr", el) };
      let touched = false;
      els.slug.addEventListener("input", () => touched = true);
      els.title.addEventListener("input", () => { if (!touched) els.slug.value = slugify(els.title.value); });
    }
  });
  if (res !== "ok") return;
  const title = els.title.value.trim(), slug = slugify(els.slug.value || title);
  if (!title || !slug) { toast("Give the page a title and an address.", "error"); return newPageDialog(pages); }
  if (!SLUG_RE.test(slug)) { toast("The address can only use lowercase letters, numbers and dashes.", "error"); return; }
  try {
    let blocks = [{ ...newBlock("heading"), title }];
    if (els.from.value) {
      const src = await getPage(els.from.value);
      blocks = (src?.blocks || []).map(b => ({ ...structuredClone(b), id: blockId() }));
    }
    const page = await createPage({ title, slug, blocks });
    toast("Page created. It's a draft until you publish it.");
    location.hash = `#/pages/${page.id}`;
  } catch (e) { toast(errText(e), "error"); }
}

/* =========================================================
   PAGE EDITOR
   ========================================================= */
async function renderEditor(root, id) {
  root.innerHTML = `<p class="loading">Loading page…</p>`;
  let page;
  try { page = await getPage(id); } catch (e) { root.innerHTML = html`<p class="empty">Couldn't load the page: ${errText(e)}</p>`; return; }
  if (!page) { root.innerHTML = html`<div class="panel"><h1>Page not found</h1><p>It may have been deleted. <a href="#/pages">Back to all pages</a></p></div>`; return; }

  let state = structuredClone(page);           // what's on screen
  let saved = JSON.stringify(pick(page));      // what's in the database
  const openBlocks = new Set();
  let saving = false;
  const isHome = page.slug === "home";

  const dirty = () => JSON.stringify(pick(state)) !== saved;
  const markDirty = () => {
    const d = dirty();
    $("#saveState", root).textContent = d ? "Unsaved changes" : "All changes saved";
    $("#saveState", root).classList.toggle("warn", d);
    $("#saveBtn", root).disabled = !d || saving;
  };
  setLeaveGuard(() => dirty());

  root.innerHTML = html`
    <a class="back" href="#/pages">‹ All pages</a>
    <div class="editor-bar">
      <div class="editor-title"><h1 id="edTitle">${state.title}</h1>
        <a class="subtle" id="edLink" href="${pageUrl(state.slug)}" target="_blank" rel="noopener">${shownSlug(state.slug)}</a></div>
      <div class="editor-acts">
        <span class="save-state" id="saveState" aria-live="polite">All changes saved</span>
        <label class="switch" title="Only staff can see draft pages">
          <input type="checkbox" id="pubToggle" ${state.published ? "checked" : ""}><span>${state.published ? "Live" : "Draft"}</span></label>
        <button type="button" class="btn ghost small" id="versionsBtn">${raw(icon("history"))}Versions</button>
        <button type="button" class="btn" id="saveBtn" disabled>Save</button>
      </div>
    </div>
    <details class="panel page-settings" ${isHome ? "" : ""}>
      <summary>Page details <small>title, address and Google description</small></summary>
      <div class="stack" id="pageFields"></div>
    </details>
    <div id="blocks" class="blocks"></div>
    <button type="button" class="add-block big" data-add-at="end">${raw(icon("plus"))}Add a block</button>`;

  const pageFields = $("#pageFields", root), blocksEl = $("#blocks", root);

  /* ---------- page details ---------- */
  pageFields.innerHTML = renderFields([
    { k: "title", label: "Page title", help: "Shown in the browser tab and in the editor", max: 120 },
    isHome ? { type: "note", html: "This is the home page, so its address is always the main address of the site." }
           : { k: "slug", label: "Address", help: "Lowercase letters, numbers and dashes. Use / for sub-pages, e.g. cozymon/faq", max: 80 },
    { k: "description", label: "Google description", type: "textarea", rows: 2, help: "One or two sentences shown in search results and Discord link previews" }
  ], state);

  /* ---------- blocks ---------- */
  const blockCard = (b, i, n) => {
    const def = BLOCKS[b.type];
    if (!def) return html`<article class="block unknown" data-id="${b.id}"><div class="block-head"><span class="block-label">Unknown block “${b.type}”</span>
      <span class="block-acts"><button type="button" class="icon-btn danger" data-bact="delete" aria-label="Delete block">${raw(icon("trash"))}</button></span></div></article>`;
    const open = openBlocks.has(b.id);
    return html`
      <div class="add-between"><button type="button" class="add-block" data-add-at="${i}" aria-label="Add a block here">${raw(icon("plus"))}Add block here</button></div>
      <article class="block ${open ? "open" : ""} ${b.hidden ? "is-hidden" : ""}" data-id="${b.id}" data-i="${i}">
        <div class="block-head">
          <span class="drag" draggable="true" title="Drag to move" aria-hidden="true">⋮⋮</span>
          <button type="button" class="block-toggle" data-bact="toggle" aria-expanded="${open}">
            ${raw(icon(def.icon))}<span class="block-label">${def.label}</span>
            <span class="block-sum">${def.summary(b)}</span>
            ${b.hidden ? raw('<span class="tag draft">Hidden</span>') : ""}
          </button>
          <span class="block-acts">
            <button type="button" class="icon-btn" data-bact="up" aria-label="Move up" ${i === 0 ? "disabled" : ""}>↑</button>
            <button type="button" class="icon-btn" data-bact="down" aria-label="Move down" ${i === n - 1 ? "disabled" : ""}>↓</button>
            <button type="button" class="icon-btn" data-bact="copy" aria-label="Duplicate block" title="Duplicate">${raw(icon("copy"))}</button>
            <button type="button" class="icon-btn danger" data-bact="delete" aria-label="Delete block" title="Delete">${raw(icon("trash"))}</button>
          </span>
        </div>
        ${open ? raw(html`<div class="block-body stack">
          ${raw(renderFields(def.fields, b, `blocks.${i}`))}
          <details class="more"><summary>More options</summary><div class="stack">${raw(renderFields(COMMON_FIELDS, b, `blocks.${i}`))}</div></details>
        </div>`) : ""}
      </article>`;
  };

  const drawBlocks = ({ open = [], focus = false } = {}) => {
    const keep = openKeys(blocksEl);
    const y = window.scrollY;
    const bl = state.blocks;
    blocksEl.innerHTML = bl.length ? bl.map((b, i) => blockCard(b, i, bl.length)).join("")
      : `<p class="empty panel">This page has no blocks yet. Add one below.</p>`;
    reopen(blocksEl, [...keep, ...[].concat(open)].filter(Boolean), focus);
    if (!focus) window.scrollTo(0, y);
  };

  const specFor = path => {
    // path like blocks.3.items -> the repeater spec of that block type
    const m = path.match(/^blocks\.(\d+)\.(.+)$/);
    const b = state.blocks[+m[1]];
    const keys = m[2].split(".").filter(k => !/^\d+$/.test(k));
    let fields = BLOCKS[b.type].fields, spec;
    for (const k of keys) { spec = fields.find(f => f.k === k); fields = spec?.fields || []; }
    return spec;
  };

  bindFields(root, () => state, {
    onChange: () => {
      $("#edTitle", root).textContent = state.title || "Untitled page";
      $("#edLink", root).textContent = shownSlug(state.slug);
      // refresh collapsed summaries without re-rendering the open block
      $$(".block", blocksEl).forEach(el => {
        const b = state.blocks[+el.dataset.i], s = $(".block-sum", el);
        if (b && s && BLOCKS[b.type]) s.textContent = BLOCKS[b.type].summary(b);
      });
      markDirty();
    },
    rerender: o => drawBlocks(o || {}),
    specFor
  });

  blocksEl.addEventListener("click", async e => {
    const b = e.target.closest("[data-bact]"); if (!b) return;
    const card = b.closest(".block"), i = +card.dataset.i, blk = state.blocks[i];
    const act = b.dataset.bact;
    if (act === "toggle") { openBlocks.has(blk.id) ? openBlocks.delete(blk.id) : openBlocks.add(blk.id); return drawBlocks(); }
    if (act === "up" || act === "down") {
      const j = act === "up" ? i - 1 : i + 1;
      [state.blocks[i], state.blocks[j]] = [state.blocks[j], state.blocks[i]];
      markDirty(); drawBlocks();
      $(`.block[data-id="${blk.id}"] [data-bact="${act}"]`, blocksEl)?.focus();
    }
    if (act === "copy") {
      const c = { ...structuredClone(blk), id: blockId() };
      state.blocks.splice(i + 1, 0, c); openBlocks.add(c.id); markDirty(); drawBlocks(); toast("Block duplicated.");
    }
    if (act === "delete") {
      const label = BLOCKS[blk.type]?.label || "block";
      if (!await confirmDialog(`Delete this ${label.toLowerCase()} block?`, "It will be removed when you save the page.")) return;
      state.blocks.splice(i, 1); markDirty(); drawBlocks();
    }
  });

  /* drag and drop by the ⋮⋮ handle */
  let dragFrom = null;
  blocksEl.addEventListener("dragstart", e => {
    const h = e.target.closest(".drag"); if (!h) return;
    const card = h.closest(".block"); dragFrom = +card.dataset.i;
    card.classList.add("dragging"); e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", card.dataset.id); e.dataTransfer.setDragImage(card, 20, 20);
  });
  blocksEl.addEventListener("dragover", e => {
    if (dragFrom === null) return;
    const card = e.target.closest(".block"); if (!card) return;
    e.preventDefault();
    $$(".drop-before, .drop-after", blocksEl).forEach(x => x.classList.remove("drop-before", "drop-after"));
    const r = card.getBoundingClientRect();
    card.classList.add(e.clientY < r.top + r.height / 2 ? "drop-before" : "drop-after");
  });
  blocksEl.addEventListener("drop", e => {
    const card = e.target.closest(".block"); if (dragFrom === null || !card) return;
    e.preventDefault();
    let to = +card.dataset.i + (card.classList.contains("drop-after") ? 1 : 0);
    const [moved] = state.blocks.splice(dragFrom, 1);
    if (to > dragFrom) to--;
    state.blocks.splice(to, 0, moved);
    dragFrom = null; markDirty(); drawBlocks();
  });
  blocksEl.addEventListener("dragend", () => { dragFrom = null; $$(".dragging, .drop-before, .drop-after", blocksEl).forEach(x => x.classList.remove("dragging", "drop-before", "drop-after")); });

  /* add block */
  root.addEventListener("click", async e => {
    const b = e.target.closest("[data-add-at]"); if (!b) return;
    const type = await chooseBlockType();
    if (!type) return;
    const at = b.dataset.addAt === "end" ? state.blocks.length : +b.dataset.addAt;
    const nb = newBlock(type);
    state.blocks.splice(at, 0, nb); openBlocks.add(nb.id); markDirty(); drawBlocks();
    $(`.block[data-id="${nb.id}"]`, blocksEl)?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  /* publish toggle */
  $("#pubToggle", root).addEventListener("change", e => {
    state.published = e.target.checked;
    e.target.nextElementSibling.textContent = state.published ? "Live" : "Draft";
    markDirty();
  });

  /* save */
  const save = async () => {
    if (saving || !dirty()) return;
    const title = (state.title || "").trim();
    if (!title) return toast("The page needs a title.", "error");
    if (!isHome) {
      state.slug = (state.slug || "").trim().replace(/^\/+|\/+$/g, "");
      if (!SLUG_RE.test(state.slug)) return toast("The address can only use lowercase letters, numbers and dashes, with / between parts.", "error");
      if (state.slug === "home") return toast("“home” is reserved for the home page.", "error");
    }
    const bad = state.blocks.find(b => b.anchor && !/^[a-z0-9-]+$/.test(b.anchor));
    if (bad) return toast("Jump link names can only use lowercase letters, numbers and dashes.", "error");
    saving = true; $("#saveBtn", root).disabled = true; $("#saveBtn", root).textContent = "Saving…";
    const oldSlug = JSON.parse(saved).slug;
    try {
      state.title = title;
      await savePage(page.id, pick(state));
      saved = JSON.stringify(pick(state));
      let msg = "Page saved.";
      if (oldSlug !== state.slug && await renameInMenu(oldSlug, state.slug).catch(() => false)) msg = "Page saved. The menu link was updated to the new address.";
      $("#edLink", root).href = pageUrl(state.slug);
      toast(msg);
    } catch (er) { toast("Couldn't save: " + errText(er), "error"); }
    finally { saving = false; $("#saveBtn", root).textContent = "Save"; markDirty(); }
  };
  $("#saveBtn", root).addEventListener("click", save);
  const onKey = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && document.body.contains(root) && $("#saveBtn", root)) { e.preventDefault(); save(); } };
  document.addEventListener("keydown", onKey);
  root.addEventListener("view:leave", () => document.removeEventListener("keydown", onKey), { once: true });

  /* versions */
  $("#versionsBtn", root).addEventListener("click", async () => {
    let versions;
    try { versions = await pageVersions(page.id); } catch (e) { return toast("Couldn't load versions: " + errText(e), "error"); }
    if (!versions.length) return dialog({ title: "Versions", body: "<p>There are no earlier versions yet. Every time you save, the previous version is kept here.</p>", actions: [{ label: "OK", value: true, primary: true }] });
    let pickIdx = null;
    const res = await dialog({
      title: "Earlier versions", wide: false,
      body: html`<p>Pick a version to load it into the editor. Nothing changes on the site until you save.</p>
        <ul class="versions">${list(versions, (v, i) => html`
          <li><button type="button" class="version" data-v="${i}">
            <strong>${fmtDate(v.changed_at, true)}</strong>
            <span>${v.snapshot.title}, ${v.snapshot.blocks?.length || 0} blocks, ${v.snapshot.published ? "live" : "draft"}${v.action === "delete" ? ", before it was deleted" : ""}</span>
          </button></li>`)}</ul>`,
      actions: [],
      onOpen: ({ el, close }) => el.addEventListener("click", e => { const b = e.target.closest("[data-v]"); if (b) { pickIdx = +b.dataset.v; close("pick"); } })
    });
    if (res !== "pick") return;
    const snap = versions[pickIdx].snapshot;
    state = { ...state, ...pick(snap), slug: isHome ? "home" : snap.slug };
    openBlocks.clear();
    pageFields.innerHTML = renderFields([
      { k: "title", label: "Page title", max: 120 },
      isHome ? { type: "note", html: "This is the home page." } : { k: "slug", label: "Address", max: 80 },
      { k: "description", label: "Google description", type: "textarea", rows: 2 }
    ], state);
    $("#pubToggle", root).checked = state.published; $("#pubToggle", root).nextElementSibling.textContent = state.published ? "Live" : "Draft";
    $("#edTitle", root).textContent = state.title;
    drawBlocks(); markDirty();
    toast(`Loaded the version from ${fmtDate(versions[pickIdx].changed_at, true)}. Save to keep it.`);
  });

  drawBlocks();
  markDirty();
}

// Only the fields the editor saves
function pick(p) {
  return { title: p.title, slug: p.slug, description: p.description || "", published: !!p.published, blocks: p.blocks || [] };
}

async function chooseBlockType() {
  let chosen = null;
  const byGroup = BLOCK_GROUPS.map(g => [g, Object.entries(BLOCKS).filter(([, d]) => d.group === g)]);
  await dialog({
    title: "Add a block", wide: true, actions: [],
    body: html`<div class="block-types">${list(byGroup, ([g, items]) => html`
      <section><h3>${g}</h3><div class="type-grid">${list(items, ([type, d]) => html`
        <button type="button" class="type-btn" data-type="${type}">${raw(icon(d.icon))}<span><strong>${d.label}</strong>${d.text}</span></button>`)}
      </div></section>`)}</div>`,
    onOpen: ({ el, close }) => el.addEventListener("click", e => { const b = e.target.closest("[data-type]"); if (b) { chosen = b.dataset.type; close(true); } })
  });
  return chosen;
}
