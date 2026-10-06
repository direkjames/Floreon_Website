// A reusable screen for editing one section stored in the "content" table
// (settings, menu, store ranks, team, …): load, edit with fields, save, unsaved-changes guard.
import { $, html, raw, icon, toast, errText, setLeaveGuard, confirmDialog } from "./ui.js";
import { getContent, saveContent } from "./sb.js";
import { renderFields, bindFields, reopen, openKeys } from "./fields.js";

// Find the spec for a repeater at `path` (e.g. "items.3.perks") inside a list of field specs
export function specAt(specs, path) {
  let fields = specs, spec;
  for (const k of path.split(".").filter(k => !/^\d+$/.test(k))) {
    spec = fields.find(f => f.k === k);
    fields = spec?.fields || [];
  }
  return spec;
}

/* options:
   title, lead           page heading
   key                   content key, e.g. "siteSettings"
   fallback              value used when the section has never been saved
   list                  true when the section is an array (edited as a repeater called "items")
   fields(state)         field specs (for list: the repeater spec(s) for "items")
   body(state)           OR custom html for the editing area
   validate(value)       return an error message to stop saving
   toForm(value)         convert stored data into what the form edits (e.g. ms -> seconds)
   prepare(value)        clean up / convert back before saving (return the value to save)
   onAction(btn, state, api)  custom [data-act] buttons not handled by fields
   aside                 extra html shown under the editor (tips)
   search                placeholder text; adds a search box that filters list items
   intro                 html shown above the editor (warnings, tips) */
export async function contentEditor(root, opt) {
  root.innerHTML = `<p class="loading">Loading…</p>`;
  let data;
  try { data = await getContent(opt.key); }
  catch (e) { root.innerHTML = html`<p class="empty">Couldn't load ${opt.title}: ${errText(e)}</p>`; return; }
  if (data == null) data = structuredClone(opt.fallback ?? (opt.list ? [] : {}));
  if (opt.toForm) data = opt.toForm(data);
  let state = opt.list ? { items: data } : data;
  let saved = JSON.stringify(state), saving = false;
  const dirty = () => JSON.stringify(state) !== saved;

  root.innerHTML = html`
    <div class="editor-bar">
      <div class="editor-title"><h1>${opt.title}</h1>${opt.lead ? raw(html`<span class="subtle">${opt.lead}</span>`) : ""}</div>
      <div class="editor-acts">
        <span class="save-state" id="saveState" aria-live="polite">All changes saved</span>
        <button type="button" class="btn" id="saveBtn" disabled>Save</button>
      </div>
    </div>
    ${opt.intro ? raw(html`<div class="notice">${raw(opt.intro)}</div>`) : ""}
    ${opt.search ? raw(html`<div class="toolbar"><label class="search">${raw(icon("search"))}<input type="search" id="edSearch" placeholder="${opt.search}" aria-label="${opt.search}"></label><span class="count" id="edCount"></span></div>`) : ""}
    <div class="panel stack" id="edBody"></div>
    ${opt.aside ? raw(html`<div class="hint">${raw(opt.aside)}</div>`) : ""}`;
  const body = $("#edBody", root);
  $("#edSearch", root)?.addEventListener("input", () => filter());

  const markDirty = () => {
    const d = dirty();
    $("#saveState", root).textContent = d ? "Unsaved changes" : "All changes saved";
    $("#saveState", root).classList.toggle("warn", d);
    $("#saveBtn", root).disabled = !d || saving;
  };
  const specs = () => opt.fields ? opt.fields(state) : [];
  const draw = ({ open = [], focus = false } = {}) => {
    const keep = openKeys(body), y = window.scrollY;
    body.innerHTML = opt.body ? opt.body(state) : renderFields(specs(), state);
    reopen(body, [...keep, ...[].concat(open)].filter(Boolean), focus);
    if (!focus) window.scrollTo(0, y);
    filter();
  };
  // search box for long lists: hides items whose title doesn't match
  const filter = () => {
    const q = ($("#edSearch", root)?.value || "").trim().toLowerCase();
    if (!opt.search) return;
    let shown = 0, total = 0;
    body.querySelectorAll(".rep-list > .rep-item").forEach(li => {
      total++;
      // match the item title and what's typed in its fields (not labels or help text)
      const hit = !q || li.querySelector(".rep-title").textContent.toLowerCase().includes(q)
        || [...li.querySelectorAll("input:not([type=checkbox]):not([type=color]), textarea, .rt-area")].some(i => (i.value ?? i.textContent).toLowerCase().includes(q));
      li.hidden = !hit; if (hit) shown++;
    });
    $("#edCount", root).textContent = q ? `${shown} of ${total}` : `${total} total`;
  };
  const api = { get state() { return state; }, set state(v) { state = v; }, draw, markDirty, root };

  setLeaveGuard(dirty);
  bindFields(body, () => state, { onChange: () => { markDirty(); opt.onChange?.(state, api); }, rerender: o => draw(o || {}), specFor: path => specAt(specs(), path) });
  if (opt.onAction) body.addEventListener("click", e => {
    const b = e.target.closest("[data-mact]");
    if (b) opt.onAction(b, state, api);
  });

  const save = async () => {
    if (saving || !dirty()) return;
    let value = structuredClone(opt.list ? state.items : state);
    if (opt.prepare) value = opt.prepare(value);
    const err = opt.validate?.(value);
    if (err) return toast(err, "error");
    saving = true; $("#saveBtn", root).textContent = "Saving…"; markDirty();
    try {
      await saveContent(opt.key, value);
      const form = opt.toForm ? opt.toForm(structuredClone(value)) : value;
      state = opt.list ? { items: form } : form;
      saved = JSON.stringify(state);
      toast(opt.savedText || "Saved.");
      draw();
    } catch (e) { toast("Couldn't save: " + errText(e), "error"); }
    finally { saving = false; $("#saveBtn", root).textContent = "Save"; markDirty(); }
  };
  $("#saveBtn", root).addEventListener("click", save);
  const onKey = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && root.isConnected) { e.preventDefault(); save(); } };
  document.addEventListener("keydown", onKey);
  root.addEventListener("view:leave", () => document.removeEventListener("keydown", onKey), { once: true });

  draw();
  markDirty();
  return api;
}
