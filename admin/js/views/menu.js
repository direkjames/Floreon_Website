// Menu: the public site's sidebar. Page links, fold-out groups and web links, in order.
import { $, html, raw, list, icon, confirmDialog, toast, errText } from "../lib/ui.js";
import { contentEditor } from "../lib/editor.js";
import { renderField } from "../lib/fields.js";
import { listPages } from "../lib/sb.js";

// Icons the public site knows how to draw (see docs/content-model.md)
const NAV_ICONS = [["home", "House"], ["ball", "Poké Ball"], ["cube", "Block"], ["rules", "Page"], ["heart", "Heart"], ["chat", "Chat bubble"],
  ["bag", "Shopping bag"], ["star", "Star"], ["image", "Picture"], ["info", "Info"], ["calendar", "Calendar"], ["users", "People"]];
const TYPE_NAMES = { page: "Page", group: "Group", link: "Web link" };

export async function renderMenu(root) {
  let pages = [];
  try { pages = await listPages(); } catch (e) { toast("Couldn't load the page list: " + errText(e), "error"); }
  const bySlug = Object.fromEntries(pages.map(p => [p.slug, p]));
  const pageOptions = [["", "Choose a page…"], ...pages.map(p => [p.slug, `${p.title} (/${p.slug === "home" ? "" : p.slug})${p.published ? "" : " – draft"}`])];

  const usedSlugs = items => items.flatMap(it => it.type === "group" ? usedSlugs(it.children || []) : it.type === "page" ? [it.slug] : []);

  const itemFields = (it, path, child) => {
    const f = [renderField({ k: "label", label: "Label", max: 40 }, it.label, path)];
    if (!child) f.push(renderField({ k: "icon", label: "Icon", type: "select", options: NAV_ICONS }, it.icon, path));
    if (it.type === "page") {
      f.push(renderField({ k: "slug", label: "Page", type: "select", options: bySlug[it.slug] || !it.slug ? pageOptions : [...pageOptions, [it.slug, `Missing page /${it.slug}`]] }, it.slug, path));
    }
    if (it.type === "link") {
      f.push(renderField({ k: "url", label: "Web address", help: "Type discord to use the Discord link from Settings", placeholder: "https://… or discord" }, it.url, path));
    }
    return f.join("");
  };

  const rowActs = (path, i, n, extra = "") => html`<span class="rep-acts">${raw(extra)}
    <button type="button" class="icon-btn" data-mact="move" data-path="${path}" data-i="${i}" data-d="-1" aria-label="Move up" ${i === 0 ? "disabled" : ""}>↑</button>
    <button type="button" class="icon-btn" data-mact="move" data-path="${path}" data-i="${i}" data-d="1" aria-label="Move down" ${i === n - 1 ? "disabled" : ""}>↓</button>
    <button type="button" class="icon-btn danger" data-mact="del" data-path="${path}" data-i="${i}" aria-label="Remove">${raw(icon("trash"))}</button></span>`;

  const warn = it => it.type === "page" && it.slug && !bySlug[it.slug] ? raw('<span class="tag warn-tag">Page missing</span>')
    : it.type === "page" && bySlug[it.slug] && !bySlug[it.slug].published ? raw('<span class="tag draft">Draft page</span>') : "";

  const body = state => {
    const items = state.items, groups = items.map((it, i) => [it, i]).filter(([it]) => it.type === "group");
    const used = new Set(usedSlugs(items));
    const missing = pages.filter(p => !used.has(p.slug));
    return html`
      <div class="menu-layout">
        <div class="menu-items">${list(items, (it, i) => html`
          <div class="menu-item ${it.type}">
            <div class="menu-head">
              <span class="type-tag">${raw(icon(it.icon || "info"))}${TYPE_NAMES[it.type] || it.type}</span>${warn(it)}
              ${raw(rowActs("items", i, items.length, it.type !== "group" && groups.length ? html`<select class="move-into" data-mact-change="into" data-i="${i}" aria-label="Move into a group"><option value="">Move into group…</option>${list(groups, ([g, gi]) => html`<option value="${gi}">${g.label || "Unnamed group"}</option>`)}</select>` : ""))}
            </div>
            <div class="menu-fields">${raw(itemFields(it, `items.${i}`, false))}</div>
            ${it.type === "group" ? raw(html`
              <ol class="menu-children">${list(it.children || [], (c, ci) => html`
                <li class="menu-item child ${c.type}">
                  <div class="menu-head"><span class="type-tag">${TYPE_NAMES[c.type]}</span>${warn(c)}
                    ${raw(rowActs(`items.${i}.children`, ci, it.children.length, html`<button type="button" class="btn ghost small" data-mact="out" data-g="${i}" data-i="${ci}">Move out of group</button>`))}</div>
                  <div class="menu-fields">${raw(itemFields(c, `items.${i}.children.${ci}`, true))}</div>
                </li>`)}</ol>
              <div class="row"><button type="button" class="btn ghost small" data-mact="add" data-type="page" data-g="${i}">${raw(icon("plus"))}Page in this group</button>
                <button type="button" class="btn ghost small" data-mact="add" data-type="link" data-g="${i}">${raw(icon("plus"))}Web link in this group</button></div>`) : ""}
          </div>`)}
          <div class="row add-row">
            <button type="button" class="btn ghost small" data-mact="add" data-type="page">${raw(icon("plus"))}Page link</button>
            <button type="button" class="btn ghost small" data-mact="add" data-type="group">${raw(icon("plus"))}Group</button>
            <button type="button" class="btn ghost small" data-mact="add" data-type="link">${raw(icon("plus"))}Web link</button>
          </div>
        </div>
        <aside class="menu-preview">
          <h2>Preview</h2>
          <div class="nav-preview" id="navPreview">${raw(preview(items))}</div>
          ${missing.length ? raw(html`<h3>Not in the menu</h3><p class="subtle">These pages still work by link.</p>
            <ul class="missing">${list(missing, p => html`<li><span>${p.title}</span><button type="button" class="btn ghost small" data-mact="add-page" data-slug="${p.slug}">Add</button></li>`)}</ul>`) : ""}
        </aside>
      </div>`;
  };

  const preview = items => list(items, it => it.type === "group"
    ? html`<div class="pv-group"><span>${raw(icon(it.icon || "info"))}${it.label || "Group"}<b>▾</b></span>
        <div class="pv-children">${list(it.children || [], c => html`<span>${c.label || "…"}</span>`)}</div></div>`
    : html`<span>${raw(icon(it.icon || "info"))}${it.label || "…"}${it.type === "link" ? raw("<i>↗</i>") : ""}</span>`).s;

  const fresh = type => type === "group" ? { type, label: "New group", icon: "star", children: [] }
    : type === "link" ? { type, label: "New link", icon: "chat", url: "" }
    : { type: "page", label: "", icon: "rules", slug: "" };

  const api = await contentEditor(root, {
    title: "Menu", lead: "The sidebar on the public site, top to bottom.",
    key: "siteNav", list: true, fallback: [],
    body,
    onChange: state => { const pv = $("#navPreview", root); if (pv) pv.innerHTML = preview(state.items); },
    validate: items => {
      const all = items.flatMap(it => [it, ...(it.type === "group" ? it.children || [] : [])]);
      if (all.some(it => !String(it.label || "").trim())) return "Every menu item needs a label.";
      if (all.some(it => it.type === "page" && !it.slug)) return "Choose a page for every page link.";
      if (all.some(it => it.type === "link" && !it.url)) return "Every web link needs an address.";
      if (all.some(it => it.type === "link" && it.url !== "discord" && !/^(https?:\/\/|\/)/.test(it.url))) return "Web links should start with https:// (or be the word discord).";
    },
    prepare: items => items.map(it => {
      const { children, ...rest } = it;
      const out = { ...rest, label: String(it.label || "").trim() };
      if (it.type === "group") out.children = (children || []).map(({ icon: _i, ...c }) => ({ ...c, label: String(c.label || "").trim() }));
      return out;
    }),
    savedText: "Menu saved.",
    onAction: async (b, state, ed) => {
      const items = state.items, act = b.dataset.mact, i = +b.dataset.i;
      const arr = b.dataset.path ? b.dataset.path.split(".").reduce((o, k) => o[k], state) : null;
      if (act === "move") { const j = i + Number(b.dataset.d); [arr[i], arr[j]] = [arr[j], arr[i]]; }
      if (act === "del") {
        const it = arr[i];
        if (it.type === "group" && it.children?.length && !await confirmDialog(`Remove the group “${it.label}”?`, `Its ${it.children.length} link(s) will be removed from the menu too. The pages themselves are kept.`, { yes: "Remove" })) return;
        arr.splice(i, 1);
      }
      if (act === "add") {
        const item = fresh(b.dataset.type);
        if (b.dataset.g != null) { delete item.icon; items[+b.dataset.g].children.push(item); }
        else items.push(item);
      }
      if (act === "add-page") {
        const p = pages.find(x => x.slug === b.dataset.slug);
        items.push({ type: "page", slug: p.slug, label: p.title, icon: "rules" });
      }
      if (act === "out") {
        const g = items[+b.dataset.g], [c] = g.children.splice(i, 1);
        items.splice(+b.dataset.g + 1, 0, { ...c, icon: c.type === "link" ? "chat" : "rules" });
      }
      ed.markDirty(); ed.draw();
    }
  });
  if (!api) return;
  // "Move into group" dropdowns
  $("#edBody", root).addEventListener("change", e => {
    // picking a page for an unnamed link fills in the label
    const pageSel = e.target.closest("select[data-path$='.slug']");
    if (pageSel && pageSel.value) {
      const path = pageSel.dataset.path.replace(/\.slug$/, "");
      const it = path.split(".").reduce((o, k) => o[k], api.state);
      if (!String(it.label || "").trim()) { it.label = pages.find(p => p.slug === pageSel.value)?.title || ""; api.markDirty(); api.draw(); }
      return;
    }
    const sel = e.target.closest("[data-mact-change=into]");
    if (!sel || sel.value === "") return;
    const items = api.state.items, i = +sel.dataset.i, g = items[+sel.value];
    const [it] = items.splice(i, 1);
    const { icon: _, ...child } = it;
    g.children = [...(g.children || []), child];
    api.markDirty(); api.draw();
  });
}
