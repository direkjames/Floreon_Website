// News: posts shown in the "Latest news" block on the home page.
import { $, html, raw, list, icon, toast, confirmDialog, errText, fmtDate, setLeaveGuard } from "../lib/ui.js";
import { listPosts, getPost, savePost, deletePost } from "../lib/sb.js";
import { renderFields, bindFields } from "../lib/fields.js";

const strip = h => String(h ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export function renderNews(root, ctx) {
  const id = ctx.path.split("/")[1];
  return id ? renderPostEditor(root, id === "new" ? null : id, ctx.staff) : renderPostList(root);
}

async function renderPostList(root) {
  root.innerHTML = html`
    <header class="page-head">
      <div><h1>News</h1><p class="lead">Posts appear in the “Latest news” block. Pinned posts stay on top.</p></div>
      <a class="btn" href="#/news/new">${raw(icon("plus"))}Write a post</a>
    </header>
    <div class="panel flush"><ul class="table-rows" id="postRows"><li class="loading">Loading posts…</li></ul></div>`;
  let posts;
  try { posts = await listPosts(); }
  catch (e) { $("#postRows", root).innerHTML = html`<li class="empty">Couldn't load posts: ${errText(e)}</li>`; return; }
  const draw = () => {
    $("#postRows", root).innerHTML = posts.length ? list(posts, p => html`
      <li class="${p.image_url ? "has-thumb" : ""}">
        <a class="row-main" href="#/news/${p.id}">
          ${p.image_url ? raw(html`<img class="row-thumb" src="${p.image_url}" alt="">`) : ""}
          <span><strong>${p.title}</strong><span class="subtle">${strip(p.body).slice(0, 110)}</span></span></a>
        <span class="row-meta">${p.pinned ? raw('<span class="tag">Pinned</span>') : ""}${p.published ? "" : raw('<span class="tag draft">Draft</span>')}<span>${fmtDate(p.created_at)}</span></span>
        <span class="row-acts"><a class="btn ghost small" href="#/news/${p.id}">Edit</a>
          <button type="button" class="icon-btn danger" data-del="${p.id}" aria-label="Delete ${p.title}">${raw(icon("trash"))}</button></span>
      </li>`).s : `<li class="empty">No posts yet. Write the first one to welcome players.</li>`;
  };
  draw();
  $("#postRows", root).addEventListener("click", async e => {
    const b = e.target.closest("[data-del]"); if (!b) return;
    const p = posts.find(x => x.id === b.dataset.del);
    if (!await confirmDialog(`Delete “${p.title}”?`, "The post will disappear from the site. This can't be undone.")) return;
    try { await deletePost(p.id); posts = posts.filter(x => x !== p); draw(); toast("Post deleted."); }
    catch (er) { toast("Couldn't delete: " + errText(er), "error"); }
  });
}

// datetime-local wants "YYYY-MM-DDTHH:MM" in local time
const toLocalInput = iso => { const d = iso ? new Date(iso) : new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

const FIELDS = [
  { k: "title", label: "Title", max: 140 },
  { k: "body", label: "Post", type: "richtext", help: "Use “Picture” to add screenshots inside the text" },
  { k: "image_url", label: "Cover picture", type: "image", folder: "news", help: "Optional, shown beside the post" },
  { k: "date", label: "Post date", type: "datetime", help: "Posts are sorted by this date" },
  { k: "pinned", label: "Pin to the top of the news", type: "toggle" },
  { k: "published", label: "Published (untick to keep it as a draft)", type: "toggle" }
];

async function renderPostEditor(root, id, staff) {
  root.innerHTML = `<p class="loading">Loading…</p>`;
  let post;
  if (id) {
    try { post = await getPost(id); } catch (e) { root.innerHTML = html`<p class="empty">Couldn't load the post: ${errText(e)}</p>`; return; }
    if (!post) { root.innerHTML = html`<div class="panel"><h1>Post not found</h1><p><a href="#/news">Back to news</a></p></div>`; return; }
  } else post = { title: "", body: "", image_url: "", pinned: false, published: true, created_at: null };
  let state = { ...post, date: toLocalInput(post.created_at) };
  const pickSaved = s => JSON.stringify({ t: s.title, b: s.body, i: s.image_url || "", p: !!s.pinned, u: !!s.published, d: s.date });
  let saved = id ? pickSaved(state) : pickSaved({ ...state, title: "\u0000" }), saving = false;
  const dirty = () => pickSaved(state) !== saved;

  root.innerHTML = html`
    <a class="back" href="#/news">‹ All news</a>
    <div class="editor-bar">
      <div class="editor-title"><h1 id="edTitle">${post.title || "New post"}</h1>${post.author_name ? raw(html`<span class="subtle">by ${post.author_name}</span>`) : ""}</div>
      <div class="editor-acts">
        <span class="save-state" id="saveState" aria-live="polite"></span>
        ${id ? raw(html`<button type="button" class="btn ghost small danger" id="delBtn">${raw(icon("trash"))}Delete</button>`) : ""}
        <button type="button" class="btn" id="saveBtn">${id ? "Save" : "Publish"}</button>
      </div>
    </div>
    <div class="panel stack" id="postBody"></div>`;
  const body = $("#postBody", root);
  const draw = () => {
    body.innerHTML = renderFields(FIELDS, state);
  };
  const markDirty = () => {
    const d = dirty();
    $("#saveState", root).textContent = d ? (id ? "Unsaved changes" : "") : "All changes saved";
    $("#saveState", root).classList.toggle("warn", d);
    $("#saveBtn", root).disabled = (id && !d) || saving;
    $("#saveBtn", root).textContent = saving ? "Saving…" : (id ? "Save" : state.published ? "Publish" : "Save draft");
    $("#edTitle", root).textContent = state.title || "New post";
  };
  setLeaveGuard(() => dirty() && (!!id || !!(state.title || strip(state.body))));
  bindFields(body, () => state, { onChange: markDirty, rerender: () => { draw(); markDirty(); }, specFor: () => null });

  const save = async () => {
    if (saving) return;
    state.title = (state.title || "").trim();
    if (!state.title) return toast("The post needs a title.", "error");
    saving = true; markDirty();
    try {
      const created = state.date ? new Date(state.date).toISOString() : undefined;
      const newId = await savePost({ id, title: state.title, body: state.body, image_url: state.image_url, pinned: state.pinned, published: state.published, created_at: created, author_name: staff.name });
      saved = pickSaved(state);
      toast(id ? "Post saved." : state.published ? "Post published." : "Draft saved.");
      if (!id) { setLeaveGuard(null); location.hash = `#/news/${newId}`; return; }
    } catch (e) { toast("Couldn't save: " + errText(e), "error"); }
    finally { saving = false; if (root.isConnected) markDirty(); }
  };
  $("#saveBtn", root).addEventListener("click", save);
  $("#delBtn", root)?.addEventListener("click", async () => {
    if (!await confirmDialog(`Delete “${post.title}”?`, "The post will disappear from the site. This can't be undone.")) return;
    try { await deletePost(id); setLeaveGuard(null); toast("Post deleted."); location.hash = "#/news"; }
    catch (e) { toast("Couldn't delete: " + errText(e), "error"); }
  });
  const onKey = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && root.isConnected) { e.preventDefault(); save(); } };
  document.addEventListener("keydown", onKey);
  root.addEventListener("view:leave", () => document.removeEventListener("keydown", onKey), { once: true });

  draw(); markDirty();
  if (!id) $("input[data-path=title]", body).focus();
}
