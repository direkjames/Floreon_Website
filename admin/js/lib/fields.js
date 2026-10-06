// Form fields for editors. Each field is described by a small spec object, rendered as HTML,
// and kept in sync with a plain JS object through data-path attributes ("blocks.2.items.0.q").
import { $, $$, html, raw, list, esc, icon, confirmDialog, promptDialog } from "./ui.js";
import { pickMedia } from "../views/media.js";

/* ---------- reading / writing nested values ---------- */
export function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
export function setPath(obj, path, value) {
  const keys = path.split("."), last = keys.pop();
  const target = keys.reduce((o, k) => (o[k] ??= /^\d+$/.test(k) ? [] : {}), obj);
  target[last] = value;
}
export const uid = () => Math.random().toString(36).slice(2, 9);
export const clean = h => window.DOMPurify ? DOMPurify.sanitize(String(h ?? ""), { FORBID_TAGS: ["style", "form", "input", "script", "iframe"] }) : esc(h);
const stripTags = h => String(h ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/* ---------- field renderers ----------
   spec: { k, label, type, help, placeholder, options: [[value, label]], fields (repeater), folder (images),
           itemName (repeater: "question"), summary (repeater: key used as the item title), max } */
const help = s => s.help ? raw(html`<small>${s.help}</small>`) : "";

export function renderField(s, value, path) {
  const p = path ? `${path}.${s.k}` : s.k;
  switch (s.type) {
    case "textarea":
      return html`<label>${s.label} ${help(s)}<textarea data-path="${p}" data-kind="text" rows="${s.rows || 3}" placeholder="${s.placeholder || ""}">${value ?? ""}</textarea></label>`;
    case "color":
      return html`<label class="color-field">${s.label} ${help(s)}<input type="color" data-path="${p}" data-kind="text" value="${/^#[0-9a-f]{6}$/i.test(value || "") ? value : "#e58aa8"}"></label>`;
    case "datetime":
      return html`<label>${s.label} ${help(s)}<input type="datetime-local" data-path="${p}" data-kind="text" value="${value ?? ""}"></label>`;
    case "number":
      return html`<label>${s.label} ${help(s)}<input type="number" data-path="${p}" data-kind="number" value="${value ?? ""}" min="${s.min ?? ""}" max="${s.max ?? ""}"></label>`;
    case "select":
      return html`<label>${s.label} ${help(s)}<select data-path="${p}" data-kind="text">${list(s.options, ([v, l]) =>
        html`<option value="${v}" ${String(value ?? s.options[0][0]) === String(v) ? "selected" : ""}>${l}</option>`)}</select></label>`;
    case "toggle":
      return html`<label class="toggle"><input type="checkbox" data-path="${p}" data-kind="bool" ${value ? "checked" : ""}><span>${s.label}</span>${help(s)}</label>`;
    case "tags":
      return html`<label>${s.label} ${raw(html`<small>${s.help || "Separate with commas"}</small>`)}<input data-path="${p}" data-kind="tags" value="${(value || []).join(", ")}" placeholder="${s.placeholder || ""}"></label>`;
    case "lines": // rows of cells, one row per line: "cell | cell"
      return html`<label>${s.label} ${help(s)}<textarea data-path="${p}" data-kind="lines" rows="${s.rows || 8}" placeholder="${s.placeholder || ""}">${(value || []).map(r => r.join(" | ")).join("\n")}</textarea></label>`;
    case "list": // one text per line
      return html`<label>${s.label} ${help(s)}<textarea data-path="${p}" data-kind="list" rows="${s.rows || 4}" placeholder="${s.placeholder || ""}">${(value || []).join("\n")}</textarea></label>`;
    case "image":
      return html`<div class="field"><span class="field-label">${s.label} ${help(s)}</span>
        <div class="image-field">${value
          ? raw(html`<img src="${value}" alt=""><div class="row"><button type="button" class="btn ghost small" data-act="pick-image" data-path="${p}" data-folder="${s.folder || "pages"}">Change</button><button type="button" class="btn ghost small danger" data-act="clear" data-path="${p}">Remove</button></div>`)
          : raw(html`<button type="button" class="btn ghost small" data-act="pick-image" data-path="${p}" data-folder="${s.folder || "pages"}">${raw(icon("image"))}Choose picture</button>`)}</div></div>`;
    case "images": // array of URLs
      return html`<div class="field"><span class="field-label">${s.label} ${help(s)}</span>
        <div class="thumbs">${list(value || [], (u, i) => html`
          <figure><img src="${u}" alt=""><figcaption>
            <button type="button" class="icon-btn" data-act="move" data-path="${p}" data-i="${i}" data-d="-1" aria-label="Move left" ${i === 0 ? "disabled" : ""}>‹</button>
            <button type="button" class="icon-btn" data-act="del" data-path="${p}" data-i="${i}" aria-label="Remove">${raw(icon("x"))}</button>
            <button type="button" class="icon-btn" data-act="move" data-path="${p}" data-i="${i}" data-d="1" aria-label="Move right" ${i === (value || []).length - 1 ? "disabled" : ""}>›</button>
          </figcaption></figure>`)}
          <button type="button" class="thumb-add" data-act="add-images" data-path="${p}" data-folder="${s.folder || "banners"}">${raw(icon("plus"))}Add</button>
        </div></div>`;
    case "richtext":
      return html`<div class="field"><span class="field-label">${s.label} ${help(s)}</span>${raw(richtext(p, value))}</div>`;
    case "repeater":
      return repeater(s, value || [], p);
    case "note":
      return html`<p class="note">${raw(s.html)}</p>`;
    default:
      return html`<label>${s.label} ${help(s)}<input data-path="${p}" data-kind="text" value="${value ?? ""}" placeholder="${s.placeholder || ""}" maxlength="${s.max || 300}"></label>`;
  }
}

export const renderFields = (specs, obj, path) => specs.map(s => renderField(s, obj ? obj[s.k] : undefined, path)).join("");

/* ---------- repeater: a list of items, each with its own fields ---------- */
function itemTitle(s, item, i) {
  const v = s.summary ? item[s.summary] : Object.values(item).find(x => typeof x === "string" && x.trim());
  return stripTags(v).slice(0, 90) || `${s.itemName || "Item"} ${i + 1}`;
}
function repeater(s, items, p) {
  return html`<div class="field repeater">
    <span class="field-label">${s.label} ${raw(html`<small>${items.length} ${items.length === 1 ? (s.itemName || "item") : (s.itemPlural || (s.itemName || "item") + "s")}</small>`)}</span>
    <ol class="rep-list">${list(items, (item, i) => html`
      <li class="rep-item" data-open-key="${p}.${i}">
        <div class="rep-head">
          <button type="button" class="rep-toggle" data-act="toggle-item" aria-expanded="false"><span class="rep-n">${i + 1}</span><span class="rep-title">${itemTitle(s, item, i)}</span></button>
          <span class="rep-acts">
            <button type="button" class="icon-btn" data-act="move" data-path="${p}" data-i="${i}" data-d="-1" aria-label="Move up" ${i === 0 ? "disabled" : ""}>↑</button>
            <button type="button" class="icon-btn" data-act="move" data-path="${p}" data-i="${i}" data-d="1" aria-label="Move down" ${i === items.length - 1 ? "disabled" : ""}>↓</button>
            <button type="button" class="icon-btn danger" data-act="del" data-path="${p}" data-i="${i}" aria-label="Delete ${s.itemName || "item"}">${raw(icon("trash"))}</button>
          </span>
        </div>
        <div class="rep-body stack" hidden>${raw(renderFields(s.fields, item, `${p}.${i}`))}</div>
      </li>`)}</ol>
    <button type="button" class="btn ghost small" data-act="add-item" data-path="${p}" data-spec="${s.k}">${raw(icon("plus"))}Add ${s.itemName || "item"}</button>
  </div>`;
}

/* ---------- rich text ---------- */
const RT_TOOLS = [
  ["bold", "B", "Bold"], ["italic", "I", "Italic"], ["link", "Link", "Add link"],
  ["insertUnorderedList", "• List", "Bulleted list"], ["insertOrderedList", "1. List", "Numbered list"],
  ["code", "Code", "Command style (for things like /warp)"], ["image", "Picture", "Insert a picture"],
  ["removeFormat", "Clear", "Remove formatting"], ["source", "HTML", "Edit the HTML directly"]
];
function richtext(p, value) {
  return html`<div class="rt" data-rt-path="${p}">
    <div class="rt-bar" role="toolbar" aria-label="Text formatting">${list(RT_TOOLS, ([cmd, label, title]) =>
      html`<button type="button" data-rt="${cmd}" title="${title}" aria-label="${title}" class="${cmd === "bold" ? "b" : cmd === "italic" ? "i" : ""}">${label}</button>`)}</div>
    <div class="rt-area" contenteditable="true" data-path="${p}" data-kind="html" role="textbox" aria-multiline="true">${raw(clean(value))}</div>
    <textarea class="rt-src" data-path="${p}" data-kind="text" rows="8" hidden>${value ?? ""}</textarea>
  </div>`;
}

// A new, empty repeater item with each field's starting value
export const freshItem = spec => Object.fromEntries(spec.fields.filter(f => f.type !== "note").map(f => [f.k,
  f.type === "toggle" ? false : ["tags", "list", "lines", "images", "repeater"].includes(f.type) ? [] : f.type === "select" ? f.options[0][0] : ""]));

/* ---------- wiring: keep `state` in sync and handle field buttons ----------
   opts.onChange()               called after any value change (mark unsaved)
   opts.rerender()               called after list changes (add/move/delete)
   opts.specFor(path)            returns the repeater spec for "add-item" */
export function bindFields(root, getState, { onChange, rerender, specFor }) {
  const update = (path, val) => { setPath(getState(), path, val); onChange(); };

  root.addEventListener("input", e => {
    const el = e.target.closest("[data-path][data-kind]");
    if (!el) return;
    const k = el.dataset.kind;
    let v;
    if (k === "html") v = el.innerHTML === "<br>" ? "" : el.innerHTML;
    else if (k === "number") v = el.value === "" ? null : Number(el.value);
    else if (k === "bool") v = el.checked;
    else if (k === "tags") v = el.value.split(",").map(x => x.trim()).filter(Boolean);
    else if (k === "list") v = el.value.split("\n").map(x => x.trim()).filter(Boolean);
    else if (k === "lines") v = el.value.split("\n").map(x => x.trim()).filter(Boolean).map(l => l.split("|").map(c => c.trim()));
    else v = el.value;
    update(el.dataset.path, v);
    // keep the repeater item title in sync while typing
    const item = el.closest(".rep-item");
    if (item && (k === "text" || k === "html")) {
      const t = $(".rep-title", item), first = $(".rep-body [data-path]", item);
      if (t && first === el) t.textContent = stripTags(v).slice(0, 90) || t.textContent;
    }
  });
  root.addEventListener("change", e => { if (e.target.matches("input[type=checkbox][data-path], select[data-path]")) e.target.dispatchEvent(new Event("input", { bubbles: true })); });

  // rich text toolbar (mousedown keeps the text selection)
  root.addEventListener("mousedown", e => { if (e.target.closest("[data-rt]")) e.preventDefault(); });
  root.addEventListener("click", async e => {
    const tool = e.target.closest("[data-rt]");
    if (tool) return rtCommand(tool.closest(".rt"), tool.dataset.rt);
    const b = e.target.closest("[data-act]");
    if (!b || !root.contains(b)) return;
    const { act, path } = b.dataset, i = +b.dataset.i;
    const state = getState();
    if (act === "toggle-item") {
      const item = b.closest(".rep-item"), body = $(".rep-body", item), open = body.hidden;
      body.hidden = !open; b.setAttribute("aria-expanded", open);
      item.classList.toggle("open", open);
      return;
    }
    if (act === "pick-image") {
      const m = await pickMedia({ folder: b.dataset.folder });
      if (m) { update(path, m.url); rerender(); }
      return;
    }
    if (act === "clear") { update(path, ""); return rerender(); }
    if (act === "add-images") {
      const ms = await pickMedia({ multiple: true, folder: b.dataset.folder });
      if (ms) { update(path, [...(getPath(state, path) || []), ...ms.map(m => m.url)]); rerender(); }
      return;
    }
    const arr = path && getPath(state, path);
    if (act === "move" && Array.isArray(arr)) {
      const j = i + Number(b.dataset.d);
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]]; onChange(); rerender({ open: `${path}.${j}` });
    }
    if (act === "del" && Array.isArray(arr)) {
      const spec = specFor(path);
      const untouched = spec?.fields && JSON.stringify(arr[i]) === JSON.stringify(freshItem(spec));
      const ok = typeof arr[i] === "string" || untouched || !Object.values(arr[i] || {}).some(v => (Array.isArray(v) ? v.length : v))
        || await confirmDialog("Delete this item?", "It will be removed when you save.", { yes: "Delete" });
      if (!ok) return;
      arr.splice(i, 1); onChange(); rerender();
    }
    if (act === "add-item") {
      const spec = specFor(path);
      const list = getPath(state, path) || [];
      list.push(freshItem(spec)); setPath(state, path, list); onChange();
      rerender({ open: `${path}.${list.length - 1}`, focus: true });
    }
  });
}

// Re-open repeater items after a re-render
export function reopen(root, keys = [], focus) {
  keys.forEach(k => {
    const item = root.querySelector(`.rep-item[data-open-key="${CSS.escape(k)}"]`);
    if (!item) return;
    item.classList.add("open"); $(".rep-body", item).hidden = false;
    $(".rep-toggle", item).setAttribute("aria-expanded", "true");
    if (focus) { const f = $(".rep-body input, .rep-body textarea, .rep-body .rt-area", item); f && f.focus(); item.scrollIntoView({ block: "nearest" }); }
  });
}
export const openKeys = root => $$(".rep-item.open", root).map(el => el.dataset.openKey);

async function rtCommand(rt, cmd) {
  const area = $(".rt-area", rt), src = $(".rt-src", rt);
  const changed = () => area.dispatchEvent(new Event("input", { bubbles: true }));
  if (cmd === "source") {
    const showSrc = src.hidden;
    if (showSrc) { src.value = area.innerHTML; src.hidden = false; area.hidden = true; src.focus(); }
    else { area.innerHTML = clean(src.value); src.hidden = true; area.hidden = false; changed(); area.focus(); }
    $$(".rt-bar button:not([data-rt=source])", rt).forEach(b => b.disabled = showSrc);
    $(".rt-bar [data-rt=source]", rt).classList.toggle("on", showSrc);
    return;
  }
  area.focus();
  document.execCommand("defaultParagraphSeparator", false, "p");
  if (cmd === "link") {
    const sel = getSelection(), range = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    const existing = sel.anchorNode && sel.anchorNode.parentElement?.closest("a");
    const url = await promptDialog("Add a link", "Web address", { value: existing?.getAttribute("href") || "", placeholder: "https://discord.gg/… or /cozymon/faq", yes: "Add link" });
    if (url === null) return;
    area.focus();
    if (range) { sel.removeAllRanges(); sel.addRange(range); }
    if (!url) document.execCommand("unlink", false, null);
    else if (range && !range.collapsed) document.execCommand("createLink", false, url);
    else document.execCommand("insertHTML", false, html`<a href="${url}">${url}</a>`);
    return changed();
  }
  if (cmd === "image") {
    const sel = getSelection(), range = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    const m = await pickMedia({ folder: "pages" });
    if (!m) return;
    area.focus();
    if (range) { sel.removeAllRanges(); sel.addRange(range); }
    document.execCommand("insertHTML", false, html`<img class="ref" src="${m.url}" alt="${m.alt || ""}">`);
    return changed();
  }
  if (cmd === "code") {
    const t = getSelection().toString() || "command";
    document.execCommand("insertHTML", false, html`<code>${t}</code>`);
    return changed();
  }
  document.execCommand(cmd, false, null);
  changed();
}
