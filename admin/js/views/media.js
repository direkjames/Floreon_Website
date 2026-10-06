// Media library: upload, browse, describe, reuse and delete pictures.
import { $, $$, html, raw, list, esc, icon, toast, confirmDialog, dialog, errText, fmtBytes, fmtDate, debounce } from "../lib/ui.js";
import { listMedia, uploadMedia, updateMedia, deleteMedia, whereUsed, findUnlistedImages, addToLibrary } from "../lib/sb.js";

const FOLDERS = { uploads: "General", news: "News", faq: "FAQs", pages: "Pages", team: "Team", heads: "Team", payments: "Payments", legendaries: "Legendaries", banners: "Banners" };
const folderName = f => FOLDERS[f] || f;
const UPLOAD_FOLDERS = ["uploads", "pages", "news", "faq", "team", "payments", "legendaries", "banners"];

/* ---------- shared uploader (used by the library page and the picker) ---------- */
async function uploadFiles(files, folder, progressEl) {
  const done = [], failed = [];
  let i = 0;
  for (const file of files) {
    i++;
    if (progressEl) progressEl.textContent = `Uploading ${i} of ${files.length}: ${file.name}`;
    try { done.push(await uploadMedia(file, folder)); }
    catch (e) { failed.push(errText(e)); }
  }
  if (progressEl) progressEl.textContent = "";
  const okMsg = done.length ? `Uploaded ${done.length} picture${done.length > 1 ? "s" : ""}.` : "";
  if (failed.length) toast([okMsg, ...failed].filter(Boolean).join(" "), "error");
  else if (okMsg) toast(okMsg);
  return done;
}

function dropZone(el, onFiles) {
  const stop = e => { e.preventDefault(); e.stopPropagation(); };
  ["dragenter", "dragover"].forEach(t => el.addEventListener(t, e => { stop(e); el.classList.add("drag"); }));
  ["dragleave", "drop"].forEach(t => el.addEventListener(t, e => { stop(e); el.classList.remove("drag"); }));
  el.addEventListener("drop", e => { const f = [...(e.dataTransfer?.files || [])]; if (f.length) onFiles(f); });
}

const tile = (m, selected) => html`
  <button type="button" class="tile ${selected ? "selected" : ""}" data-id="${m.id}" aria-pressed="${selected ? "true" : "false"}" title="${m.name}">
    <img src="${m.url}" alt="${m.alt || ""}" loading="lazy">
    <span class="tile-name">${m.alt || m.name}</span>
  </button>`;

/* ---------- the Media page ---------- */
export async function renderMedia(root) {
  let items = [], q = "", folder = "", selected = null;

  root.innerHTML = html`
    <header class="page-head">
      <div><h1>Media</h1><p class="lead">Every picture used on the site. Upload once, then pick it anywhere.</p></div>
      <label class="btn">${raw(icon("upload"))}Upload pictures<input type="file" id="mFile" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden></label>
    </header>
    <div class="dropzone" id="mDrop">
      ${raw(icon("image"))}
      <p><strong>Drop pictures here</strong> or use “Upload pictures”. Big photos are shrunk automatically.</p>
      <label class="inline-field">Save to
        <select id="mUpFolder">${list(UPLOAD_FOLDERS, f => html`<option value="${f}">${folderName(f)}</option>`)}</select>
      </label>
      <p class="progress" id="mProgress" aria-live="polite"></p>
    </div>
    <div class="toolbar">
      <label class="search">${raw(icon("search"))}<input type="search" id="mSearch" placeholder="Search by name or description" aria-label="Search pictures"></label>
      <select id="mFolder" aria-label="Filter by folder"><option value="">All folders</option></select>
      <span class="count" id="mCount"></span>
      <button type="button" class="btn ghost small" id="mScan">Find older uploads</button>
    </div>
    <div class="media-layout">
      <div class="grid" id="mGrid"><p class="loading">Loading pictures…</p></div>
      <aside class="detail" id="mDetail" hidden></aside>
    </div>`;

  const grid = $("#mGrid", root), detail = $("#mDetail", root);

  const load = async () => {
    try { items = await listMedia(); }
    catch (e) { grid.innerHTML = html`<p class="empty">Couldn't load the library: ${errText(e)}</p>`; return; }
    const folders = [...new Set(items.map(m => m.folder))].sort();
    const sel = $("#mFolder", root), cur = sel.value;
    sel.innerHTML = html`<option value="">All folders</option>${list(folders, f => html`<option value="${f}">${folderName(f)}</option>`)}`;
    sel.value = folders.includes(cur) ? cur : "";
    draw();
  };

  const draw = () => {
    const ql = q.toLowerCase();
    const shown = items.filter(m => (!folder || m.folder === folder) && (!ql || (m.name + " " + m.alt).toLowerCase().includes(ql)));
    $("#mCount", root).textContent = `${shown.length} of ${items.length}`;
    grid.innerHTML = shown.length ? list(shown, m => tile(m, selected && m.id === selected.id)).s
      : items.length ? `<p class="empty">No pictures match that search.</p>`
      : `<p class="empty">No pictures yet. Drop some above to start your library.</p>`;
    drawDetail();
  };

  const drawDetail = async () => {
    if (!selected) { detail.hidden = true; return; }
    const m = selected;
    detail.hidden = false;
    detail.innerHTML = html`
      <div class="detail-head"><h2>Picture details</h2><button class="icon-btn" data-act="close" aria-label="Close details">${raw(icon("x"))}</button></div>
      <a href="${m.url}" target="_blank" rel="noopener" class="detail-img"><img src="${m.url}" alt="${m.alt}"></a>
      <dl class="facts">
        <div><dt>File</dt><dd>${m.name}</dd></div>
        <div><dt>Size</dt><dd>${m.width && m.height ? `${m.width} × ${m.height} px, ` : ""}${fmtBytes(m.size)}</dd></div>
        <div><dt>Added</dt><dd>${fmtDate(m.created_at)}</dd></div>
      </dl>
      <form id="mForm" class="stack">
        <label>Description <small>for screen readers and when the picture can't load</small>
          <input name="alt" maxlength="200" value="${m.alt}" placeholder="e.g. Trainer Card arrow pointing to a gym leader"></label>
        <label>Folder<select name="folder">${list([...new Set([...UPLOAD_FOLDERS, m.folder])], f => html`<option value="${f}" ${f === m.folder ? "selected" : ""}>${folderName(f)}</option>`)}</select></label>
        <button class="btn" type="submit">Save details</button>
      </form>
      <div class="detail-actions">
        <button type="button" class="btn ghost small" data-act="copy">${raw(icon("copy"))}Copy link</button>
        <button type="button" class="btn ghost small danger" data-act="delete">${raw(icon("trash"))}Delete</button>
      </div>
      <p class="used" id="mUsed">Checking where it's used…</p>`;
    const used = await whereUsed(m.url).catch(() => null);
    if (selected !== m) return;
    const u = $("#mUsed", detail);
    m._used = used;
    u.innerHTML = used == null ? "Couldn't check where this picture is used."
      : used.length ? html`Used in: ${used.join(", ")}` : "Not used anywhere yet.";
  };

  /* events */
  const onFiles = async files => {
    const added = await uploadFiles(files, $("#mUpFolder", root).value, $("#mProgress", root));
    if (added.length) { selected = added[0]; await load(); }
  };
  $("#mFile", root).addEventListener("change", e => { onFiles([...e.target.files]); e.target.value = ""; });
  dropZone($("#mDrop", root), onFiles);
  $("#mSearch", root).addEventListener("input", debounce(e => { q = e.target.value.trim(); draw(); }, 120));
  $("#mFolder", root).addEventListener("change", e => { folder = e.target.value; draw(); });

  grid.addEventListener("click", e => {
    const t = e.target.closest(".tile"); if (!t) return;
    selected = items.find(m => m.id === t.dataset.id) || null;
    draw();
    if (matchMedia("(max-width: 900px)").matches) detail.scrollIntoView({ behavior: "smooth" });
  });

  detail.addEventListener("click", async e => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const m = selected;
    if (b.dataset.act === "close") { selected = null; return draw(); }
    if (b.dataset.act === "copy") {
      try { await navigator.clipboard.writeText(m.url); toast("Link copied."); }
      catch (er) {
        await dialog({ title: "Picture link", body: html`<p>Copy this link:</p><input class="full" readonly value="${m.url}" autofocus>`,
          actions: [{ label: "Done", value: true, primary: true }], onOpen: ({ el }) => setTimeout(() => $("input", el).select(), 0) });
      }
    }
    if (b.dataset.act === "delete") {
      const used = m._used || [];
      const warn = used.length ? `It's still used in: ${used.join(", ")}. Those spots will show a broken picture.` : "This can't be undone.";
      if (!await confirmDialog(`Delete ${m.name}?`, warn)) return;
      try { await deleteMedia(m); toast("Picture deleted."); selected = null; await load(); }
      catch (er) { toast("Couldn't delete: " + errText(er), "error"); }
    }
  });

  detail.addEventListener("submit", async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      await updateMedia(selected.id, { alt: f.alt.trim(), folder: f.folder });
      Object.assign(selected, { alt: f.alt.trim(), folder: f.folder });
      toast("Details saved.");
      const keep = selected; await load(); selected = items.find(m => m.id === keep.id) || null; draw();
    } catch (er) { toast("Couldn't save: " + errText(er), "error"); btn.disabled = false; }
  });

  $("#mScan", root).addEventListener("click", async e => {
    e.target.disabled = true;
    try {
      const found = await findUnlistedImages(new Set(items.map(m => m.path)));
      if (!found.length) { toast("Everything in storage is already in the library."); return; }
      if (!await confirmDialog(`Add ${found.length} older picture${found.length > 1 ? "s" : ""}?`,
        "These were uploaded with the old admin panel (news pictures, team heads, payment logos). Adding them lets you reuse and manage them here.",
        { yes: "Add to library", danger: false })) return;
      await addToLibrary(found); toast(`Added ${found.length} picture${found.length > 1 ? "s" : ""}.`); await load();
    } catch (er) { toast("Couldn't scan storage: " + errText(er), "error"); }
    finally { e.target.disabled = false; }
  });

  await load();
}

/* ---------- picture picker (used by editors) ----------
   const pic = await pickMedia({ folder: "faq" });          -> one media row or null
   const pics = await pickMedia({ multiple: true });        -> array of media rows or null */
export async function pickMedia({ multiple = false, folder = "uploads", title } = {}) {
  let items = [];
  try { items = await listMedia(); } catch (e) { toast("Couldn't load the library: " + errText(e), "error"); return null; }
  const chosen = new Map();
  const body = html`
    <div class="picker-top">
      <label class="search">${raw(icon("search"))}<input type="search" id="pkSearch" placeholder="Search pictures" aria-label="Search pictures" autofocus></label>
      <label class="btn small">${raw(icon("upload"))}Upload new<input type="file" id="pkFile" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden></label>
    </div>
    <p class="progress" id="pkProgress" aria-live="polite"></p>
    <div class="grid picker-grid" id="pkGrid"></div>`;
  const result = await dialog({
    title: title || (multiple ? "Choose pictures" : "Choose a picture"), body, wide: true,
    actions: [{ label: "Cancel", value: null }, { label: multiple ? "Use selected" : "Use picture", value: "ok", primary: true }],
    onOpen: ({ el }) => {
      const grid = $("#pkGrid", el);
      let q = "";
      const draw = () => {
        const ql = q.toLowerCase();
        const shown = items.filter(m => !ql || (m.name + " " + m.alt).toLowerCase().includes(ql));
        grid.innerHTML = shown.length ? list(shown, m => tile(m, chosen.has(m.id))).s
          : `<p class="empty">${items.length ? "No pictures match." : "No pictures yet. Upload one to get started."}</p>`;
      };
      grid.addEventListener("click", e => {
        const t = e.target.closest(".tile"); if (!t) return;
        const m = items.find(x => x.id === t.dataset.id);
        if (!multiple) chosen.clear();
        chosen.has(m.id) ? chosen.delete(m.id) : chosen.set(m.id, m);
        draw();
      });
      grid.addEventListener("dblclick", e => { if (!multiple && e.target.closest(".tile")) $("footer .btn:not(.ghost)", el).click(); });
      $("#pkSearch", el).addEventListener("input", debounce(e => { q = e.target.value.trim(); draw(); }, 120));
      $("#pkFile", el).addEventListener("change", async e => {
        const added = await uploadFiles([...e.target.files], folder, $("#pkProgress", el));
        e.target.value = "";
        items = [...added, ...items];
        if (!multiple) chosen.clear();
        added.forEach(m => chosen.set(m.id, m));
        draw();
      });
      draw();
    }
  });
  if (result !== "ok" || !chosen.size) return null;
  return multiple ? [...chosen.values()] : [...chosen.values()][0];
}
