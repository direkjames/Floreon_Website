/* =====================================================
   ADMIN PANEL – staff log in with their Supabase account,
   then add / edit / delete / reorder content and news posts.
   Who may edit is enforced by the database (supabase/schema.sql),
   not by this file.
   ===================================================== */

const TAB_NAMES = { news: "News posts", about: "About", features: "Features", faqs: "FAQs", series: "Series guide", spawns: "Spawns", legendaries: "Legendaries", team: "Meet the team", rules: "Rules", votes: "Vote sites", plans: "Store ranks", payments: "Payments" };
const TAB_KEYS = { about: "About", features: "Features", faqs: "Faqs", series: "Series", spawns: "Spawns", legendaries: "Legendaries", team: "Team", rules: "Rules", votes: "Votes", plans: "Plans", payments: "Payments" };
const SITE_TABS = ["news", "team", "rules", "votes", "plans", "payments"];
const CZ_ONLY = ["series", "spawns", "legendaries"];
const MODE_NAMES = () => CONFIG.oneblockEnabled ? { site: "Whole site", cz: "Cozymon", ob: "Oneblock" } : { site: "Whole site", cz: "Cozymon" };
const tabsFor = m => Object.fromEntries(Object.entries(TAB_NAMES).filter(([k]) =>
  m === "site" ? SITE_TABS.includes(k) : !SITE_TABS.includes(k) && (m === "cz" || !CZ_ONLY.includes(k))));

const A = { tab: "news", mode: "site", editing: null, busy: false };
let ADMIN = null;            // { id, email, name } when a staff member is logged in
const dbKey = () => A.mode + TAB_KEYS[A.tab];
const lines = s => (s || "").split("\n").map(x => x.trim()).filter(Boolean);
const paras = s => (s || "").split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);

/* Change one section, save it to Supabase, and roll back if saving fails. */
async function commit(key, change, okMsg = "Saved!") {
  const before = clone(DB[key]);
  const draft = clone(DB[key]);
  const result = change(draft);
  DB[key] = result === undefined ? draft : result;
  try {
    await saveSection(key);
    renderAll(); toast(okMsg);
    return true;
  } catch (e) {
    DB[key] = before; renderAll();
    toast("Couldn't save: " + errText(e));
    return false;
  }
}

/* ---------- list rows ---------- */
function rowHTML(item, i, n) {
  let body;
  if (A.tab === "news") {
    const flags = [item.pinned ? "Pinned" : "", item.published ? "" : "Draft"].filter(Boolean).join(" · ");
    body = `${item.image_url ? `<img src="${esc(safeUrl(item.image_url, ""))}" alt="">` : ""}<div class="grow"><h3>${esc(item.title)}</h3><p>${esc(fmtDate(item.created_at))}${flags ? " · " + flags : ""}${item.author_name ? " · " + esc(item.author_name) : ""}</p></div>`;
  }
  else if (A.tab === "features") body = `<div class="grow"><h3>${esc(item.name)}</h3><p>${esc(item.text || "")}</p></div>`;
  else if (A.tab === "faqs") body = `<div class="grow"><h3>${esc(item.q)}</h3></div>`;
  else if (A.tab === "series") body = `<div class="grow"><h3>${esc(item.name)}</h3><p>${item.rows.length} trainers</p></div>`;
  else if (A.tab === "spawns" || A.tab === "legendaries") body = `<div class="grow"><h3>${esc(item.name)}</h3><p>${esc(A.tab === "spawns" ? (item.kind === "ultra" ? "Ultra Beast" : "Paradox") : (item.structure ? "Has a structure" : "No structure yet"))} · ${esc((item.biomes || []).join(", "))}</p></div>`;
  else if (A.tab === "team") body = `<img src="${esc(skinSrc(item))}" alt="" style="width:48px;height:48px;image-rendering:pixelated"><div class="grow"><h3>${esc(item.name)}</h3><p>${esc(item.role)} · Row ${item.row || 1}</p></div>`;
  else if (A.tab === "rules") body = `<div class="grow"><h3>${esc(item.title)}</h3><p>${esc(item.text || "")}</p></div>`;
  else if (A.tab === "votes") body = `<div class="grow"><h3>${esc(item.name)}</h3><p>${esc(item.reward || "")} · ${esc(item.url)}</p></div>`;
  else if (A.tab === "plans") body = `<div class="grow"><h3>${esc(item.name)}</h3><p>${esc(CONFIG.currency)}${esc(item.price)} · ${(item.perks || []).length} perks</p></div>`;
  else body = `<div class="grow"><h3>${esc(item.name)}</h3><p>${esc(item.color || "")}${item.logo ? " · has logo" : ""}</p></div>`;
  const move = A.tab === "news" ? "" : `
    <button type="button" class="mini" data-act="up" data-i="${i}" aria-label="Move up" ${i === 0 ? "disabled" : ""}>↑</button>
    <button type="button" class="mini" data-act="down" data-i="${i}" aria-label="Move down" ${i === n - 1 ? "disabled" : ""}>↓</button>`;
  return `<div class="arow">${body}<div class="acts">${move}
    <button type="button" class="mini" data-act="edit" data-i="${i}">Edit</button>
    <button type="button" class="mini danger" data-act="del" data-i="${i}">Delete</button>
  </div></div>`;
}

/* ---------- edit forms ---------- */
const imageFields = (current, folder, label) => `
  ${current ? `<img class="preview" src="${esc(safeUrl(current, ""))}" alt="">` : ""}
  <label>Upload ${label}<input type="file" name="file" accept="image/png,image/jpeg,image/webp,image/gif" ${ONLINE ? "" : "disabled"}></label>
  <label>…or an image link / file path<input name="url" placeholder="${folder}/example.png" value="${current && !current.includes("/storage/v1/") ? esc(current) : ""}"></label>
  ${current ? `<label class="check"><input type="checkbox" name="noimg"> Remove picture</label>` : ""}`;

function formHTML() {
  if (A.tab === "about") {
    const ab = DB[dbKey()];
    return `<form class="form" id="aForm" novalidate>
      <h3>Edit ${MODE_NAMES()[A.mode]} About</h3>
      <label>Intro line<textarea name="lead" style="min-height:70px">${esc(ab.lead)}</textarea></label>
      <label>Paragraphs (blank line between paragraphs, simple HTML allowed)<textarea name="paras" style="min-height:240px">${esc(ab.about.join("\n\n"))}</textarea></label>
      <div class="err" id="aErr" role="alert"></div>
      <div class="row"><button class="btn" type="submit">Save</button></div>
    </form>`;
  }
  const isNew = A.editing === "new";
  const it = isNew ? {} : (A.tab === "news" ? POSTS[A.editing] : DB[dbKey()][A.editing]);
  let fields = "";
  if (A.tab === "news") fields = `
    <label>Title<input name="title" maxlength="140" value="${esc(it.title || "")}"></label>
    <label>Post (blank line between paragraphs; simple HTML like &lt;strong&gt;, &lt;a href=""&gt;, &lt;ul&gt;&lt;li&gt; is allowed)<textarea name="body" style="min-height:220px">${esc(it.body || "")}</textarea></label>
    ${imageFields(it.image_url, "images/news", "a picture (optional)")}
    <div class="row">
      <label class="check"><input type="checkbox" name="pinned" ${it.pinned ? "checked" : ""}> Pin to the top</label>
      <label class="check"><input type="checkbox" name="published" ${isNew || it.published ? "checked" : ""}> Published (untick to save as a draft)</label>
    </div>`;
  else if (A.tab === "features") fields = `
    <label>Name<input name="name" maxlength="80" value="${esc(it.name || "")}"></label>
    <label>Description<textarea name="text" maxlength="400">${esc(it.text || "")}</textarea></label>
    <label>Tags (optional, separated by commas)<input name="chips" value="${esc((it.chips || []).join(", "))}"></label>`;
  else if (A.tab === "faqs") fields = `
    <label>Question<input name="q" maxlength="140" value="${esc(it.q || "")}"></label>
    <label>Answer (simple HTML allowed: &lt;p&gt;, &lt;ul&gt;&lt;li&gt;, &lt;code&gt;, &lt;strong&gt;, &lt;img class="ref" src=""&gt;)<textarea name="a" style="min-height:220px">${esc(it.a || "")}</textarea></label>`;
  else if (A.tab === "series") fields = `
    <label>Series name<input name="name" maxlength="80" value="${esc(it.name || "")}"></label>
    <label>Trainers in order, one per line: Trainer | Signature item<textarea name="rows" style="min-height:320px" placeholder="Gym Leader Roark | Smooth Rock">${esc((it.rows || []).map(r => r[0] + " | " + r[1]).join("\n"))}</textarea></label>`;
  else if (A.tab === "spawns" || A.tab === "legendaries") {
    const ta = (n, l, arr) => `<label>${l}<textarea name="${n}" style="min-height:90px">${esc((arr || []).join("\n"))}</textarea></label>`;
    fields = `<label>Name<input name="name" maxlength="60" value="${esc(it.name || "")}"></label>
    ${A.tab === "spawns"
      ? `<label>Type<select name="kind"><option value="paradox" ${it.kind === "ultra" ? "" : "selected"}>Paradox</option><option value="ultra" ${it.kind === "ultra" ? "selected" : ""}>Ultra Beast</option></select></label>`
      : `<label>Has a structure?<select name="structure"><option value="no" ${it.structure ? "" : "selected"}>No</option><option value="yes" ${it.structure ? "selected" : ""}>Yes</option></select></label>
         <label>Structure text (only if it has one; blank line between paragraphs, simple HTML allowed)<textarea name="paras" style="min-height:160px">${esc((it.paras || []).join("\n\n"))}</textarea></label>`}
    ${ta("cond", "Conditions (one per line)", it.cond)}${ta("biomes", "Biomes (one per line, e.g. Deep Dark)", it.biomes)}${ta("blocks", "Needed nearby blocks (one per line)", it.blocks)}`;
  }
  else if (A.tab === "team") fields = `
    <label>Name<input name="name" maxlength="40" value="${esc(it.name || "")}"></label>
    <label>Role<input name="role" maxlength="40" value="${esc(it.role || "")}"></label>
    <label>Row on the page (1 = top row; members with the same number share a row)<input name="row" type="number" min="1" value="${it.row || 1}"></label>
    <label>Minecraft username for the skin (leave empty to use the name)<input name="mc" maxlength="16" value="${esc(it.mc || "")}"></label>
    ${imageFields(it.head, "heads", "a custom head picture (optional)")}`;
  else if (A.tab === "rules") fields = `
    <label>Title<input name="title" maxlength="80" value="${esc(it.title || "")}"></label>
    <label>Description<textarea name="text" maxlength="400">${esc(it.text || "")}</textarea></label>`;
  else if (A.tab === "votes") fields = `
    <label>Site name<input name="name" maxlength="60" value="${esc(it.name || "")}"></label>
    <label>Reward text<input name="reward" maxlength="160" value="${esc(it.reward || "")}"></label>
    <label>Vote link (https://…, or # if not ready yet)<input name="url" value="${esc(it.url || "#")}"></label>`;
  else if (A.tab === "plans") fields = `
    <label>Rank name<input name="name" maxlength="30" value="${esc(it.name || "")}"></label>
    <div class="two"><label>Price (number only)<input name="price" type="number" min="0" value="${it.price ?? ""}"></label>
    <label>Card color<select name="planColor">${[["dahlia", "Purple (Dahlia)"], ["hibiscus", "Coral (Hibiscus)"], ["sakura", "Pink (Sakura)"]].map(([k, l]) => `<option value="${k}" ${it.id === k ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>
    <label>Perks (one per line)<textarea name="perks" style="min-height:140px">${esc((it.perks || []).join("\n"))}</textarea></label>`;
  else fields = `
    <label>Name<input name="name" maxlength="30" value="${esc(it.name || "")}"></label>
    <label>Badge color<input name="color" type="color" value="${esc(safeColor(it.color))}"></label>
    ${imageFields(it.logo, "payments", "a logo (optional, square picture)")}`;
  return `<form class="form" id="aForm" novalidate>
    <h3>${isNew ? "Add to" : "Edit in"} ${A.tab === "news" ? "" : MODE_NAMES()[A.mode] + " "}${TAB_NAMES[A.tab]}</h3>
    ${fields}
    <div class="err" id="aErr" role="alert"></div>
    <div class="row"><button class="btn" type="submit">Save</button><button class="btn ghost" type="button" data-act="cancel">Cancel</button></div>
  </form>`;
}

function chipRow(label, act, current, map) {
  return `<div class="filter-row"><span class="lbl">${label}</span>${Object.entries(map).map(([k, v]) =>
    `<button type="button" class="pick" data-act="${act}" data-v="${k}" aria-pressed="${current === k}">${v}</button>`).join("")}</div>`;
}

/* ---------- page ---------- */
function renderAdmin() {
  const root = $("#adminRoot");
  if (!ADMIN) {
    root.innerHTML = `
      <h2 class="section-title">Staff login</h2>
      <p class="section-lead">Log in with the staff account the owner created for you in Supabase.</p>
      ${ONLINE ? "" : `<div class="notice">Supabase isn't connected yet. Fill in <code>SUPABASE.url</code> and <code>SUPABASE.publishableKey</code> in <code>js/config.js</code> (see README.md).</div>`}
      <form class="form" id="loginForm" novalidate style="max-width:420px">
        <label>Email<input name="email" type="email" autocomplete="username" required></label>
        <label>Password<input name="pass" type="password" autocomplete="current-password" required></label>
        <div class="err" id="loginErr" role="alert"></div>
        <div class="row"><button class="btn" type="submit" ${ONLINE ? "" : "disabled"}>Log in</button><a class="btn ghost" href="#home">Back to site</a></div>
      </form>`;
    return;
  }
  const list = A.tab === "news" ? POSTS : DB[dbKey()];
  const listView = `
    <div class="row2" style="margin-top:26px"><button type="button" class="btn" data-act="new">+ ${A.tab === "news" ? "Write a post" : "Add new"}</button><span class="result-count" style="margin:0">${list.length} item${list.length === 1 ? "" : "s"}</span></div>
    <div class="alist">${list.length ? list.map((it, i) => rowHTML(it, i, list.length)).join("") : `<p class="empty">Nothing here yet.</p>`}</div>`;
  root.innerHTML = `
    <div class="admin-bar">
      <div><h2 class="section-title" style="margin:0">Admin panel</h2><p class="section-lead">Logged in as <strong>${esc(ADMIN.name)}</strong>. Changes go live for everyone as soon as you save.</p></div>
      <div class="row2"><a class="btn ghost" href="#home">View site</a><button type="button" class="btn ghost" data-act="logout">Log out</button></div>
    </div>
    ${chipRow("Area", "mode", A.mode, MODE_NAMES())}
    ${chipRow("Section", "tab", A.tab, tabsFor(A.mode))}
    ${A.tab === "about" || A.editing !== null ? formHTML() : listView}
    ${A.tab === "news" ? "" : `
    <h3 style="margin-top:56px">Backup &amp; restore</h3>
    <p class="result-count">Download a backup before big changes. "Restore defaults" puts this section back to the starting content from <code>js/config.js</code>.</p>
    <div class="row2" style="margin-top:12px">
      <button type="button" class="mini" data-act="export">Download backup (JSON)</button>
      <button type="button" class="mini" data-act="import">Import backup</button>
      <button type="button" class="mini danger" data-act="reset">Restore defaults for this section</button>
    </div>`}`;
}

/* ---------- clicks ---------- */
$("#adminRoot").addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b || A.busy) return;
  const act = b.dataset.act, i = +b.dataset.i, key = dbKey();
  if (act === "tab") { A.tab = b.dataset.v; A.editing = null; return renderAdmin(); }
  if (act === "mode") { A.mode = b.dataset.v; if (!tabsFor(A.mode)[A.tab]) A.tab = A.mode === "site" ? "news" : "features"; A.editing = null; return renderAdmin(); }
  if (act === "new") { A.editing = "new"; return renderAdmin(); }
  if (act === "edit") { A.editing = i; return renderAdmin(); }
  if (act === "cancel") { A.editing = null; return renderAdmin(); }
  if (act === "logout") { await signOut(); ADMIN = null; await loadPosts(); renderAll(); return renderAdmin(); }

  A.busy = true;
  try {
    if (act === "del") {
      if (!confirm("Delete this item? This can't be undone.")) return;
      if (A.tab === "news") {
        try { await deletePost(POSTS[i].id); renderAll(); toast("Post deleted."); }
        catch (er) { toast("Couldn't delete: " + errText(er)); }
      } else await commit(key, l => { l.splice(i, 1); }, "Deleted.");
      return renderAdmin();
    }
    if (act === "up" || act === "down") {
      const j = act === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= DB[key].length) return;
      await commit(key, l => { [l[i], l[j]] = [l[j], l[i]]; }, "Moved.");
      return renderAdmin();
    }
    if (act === "export") {
      const blob = new Blob([JSON.stringify(DB, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `floreon-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      return;
    }
    if (act === "import") {
      const raw = prompt("Paste the backup JSON:"); if (!raw) return;
      let data;
      try { data = JSON.parse(raw); } catch (er) { toast("That JSON didn't look right."); return; }
      const keys = CONTENT_KEYS.filter(k => Array.isArray(DEFAULTS[k]) ? Array.isArray(data[k]) : (data[k] && typeof data[k] === "object"));
      if (!keys.length) { toast("No usable sections in that JSON."); return; }
      if (!confirm(`Replace ${keys.length} section(s) on the live site with the backup?`)) return;
      const before = clone(DB);
      keys.forEach(k => DB[k] = data[k]);
      try { await saveSections(keys); renderAll(); toast("Backup imported!"); }
      catch (er) { DB = before; renderAll(); toast("Couldn't import: " + errText(er)); }
      return renderAdmin();
    }
    if (act === "reset") {
      if (!confirm(`Put "${TAB_NAMES[A.tab]}" back to the starting content? Your edits to this section will be lost.`)) return;
      await commit(key, () => clone(DEFAULTS[key]), "Section restored.");
      return renderAdmin();
    }
  } finally { A.busy = false; }
});

/* ---------- picture field helper ---------- */
async function readImageField(f, current, folder, max, png) {
  const file = f.elements.file && f.elements.file.files[0];
  if (file) return uploadImage(file, folder, max, png);
  if (f.elements.noimg && f.elements.noimg.checked) return "";
  const url = (f.elements.url.value || "").trim();
  if (url) {
    if (safeUrl(url, "") === "") throw new Error("That image link isn't allowed. Use an https:// link or a file path.");
    return url;
  }
  return current && current.includes("/storage/v1/") ? current : "";
}

/* ---------- form submits ---------- */
$("#adminRoot").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target;
  const btn = f.querySelector("button[type=submit]");

  if (f.id === "loginForm") {
    const v = Object.fromEntries(new FormData(f));
    btn.disabled = true;
    try { ADMIN = await signIn((v.email || "").trim(), v.pass || ""); await loadPosts(); renderAdmin(); }
    catch (er) { $("#loginErr").textContent = /invalid login/i.test(errText(er)) ? "Wrong email or password." : errText(er); btn.disabled = false; }
    return;
  }
  if (f.id !== "aForm" || A.busy) return;

  const err = $("#aErr"), key = dbKey();
  const isNew = A.editing === "new";
  const v = Object.fromEntries(new FormData(f));
  const fail = m => { err.textContent = m; btn.disabled = false; A.busy = false; };
  btn.disabled = true; A.busy = true;

  try {
    if (A.tab === "news") {
      const old = isNew ? {} : POSTS[A.editing];
      const title = (v.title || "").trim();
      if (!title) return fail("Please enter a title.");
      let body = (v.body || "").trim();
      if (body && !/<(p|ul|ol|div|h\d)\b/i.test(body)) body = paras(body).map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
      const image_url = await readImageField(f, old.image_url, "news", 1600, false);
      await savePost({ id: old.id, title, body, image_url, pinned: !!v.pinned, published: !!v.published, author_name: ADMIN.name });
      A.editing = null; renderAll(); renderAdmin(); toast("Post saved!");
      return;
    }
    if (A.tab === "about") {
      const ok = await commit(key, () => ({ lead: (v.lead || "").trim(), about: paras(v.paras) }));
      if (!ok) return fail("Saving failed. Check your connection and try again.");
      A.editing = null; renderAdmin();
      return;
    }

    const old = isNew ? {} : DB[key][A.editing];
    let item;
    if (A.tab === "features") {
      const name = (v.name || "").trim();
      if (!name) return fail("Please enter a name.");
      item = { name, text: (v.text || "").trim() };
      const chipList = (v.chips || "").split(",").map(s => s.trim()).filter(Boolean);
      if (chipList.length) item.chips = chipList;
    } else if (A.tab === "faqs") {
      const q = (v.q || "").trim(), a = (v.a || "").trim();
      if (!q || !a) return fail("Please fill in both the question and the answer.");
      item = { q, a };
    } else if (A.tab === "series") {
      const name = (v.name || "").trim();
      const rows = lines(v.rows).map(l => l.split("|").map(s => s.trim()));
      if (!name) return fail("Please enter the series name.");
      const bad = rows.findIndex(r => r.length !== 2 || !r[0] || !r[1]);
      if (bad >= 0) return fail(`Line ${bad + 1} needs to look like: Trainer | Item`);
      item = { name, rows };
    } else if (A.tab === "spawns" || A.tab === "legendaries") {
      const name = (v.name || "").trim();
      if (!name) return fail("Please enter a name.");
      item = { name, cond: lines(v.cond), biomes: lines(v.biomes), blocks: lines(v.blocks) };
      if (A.tab === "spawns") item.kind = v.kind === "ultra" ? "ultra" : "paradox";
      else { item.structure = v.structure === "yes"; item.paras = item.structure ? paras(v.paras) : []; }
    } else if (A.tab === "team") {
      const name = (v.name || "").trim(), role = (v.role || "").trim();
      if (!name || !role) return fail("Please enter a name and a role.");
      item = { name, role, row: Math.max(1, parseInt(v.row, 10) || 1) };
      const mc = (v.mc || "").trim();
      if (mc) item.mc = mc;
      const head = await readImageField(f, old.head, "heads", 256, true);
      if (head) item.head = head;
    } else if (A.tab === "rules") {
      const title = (v.title || "").trim();
      if (!title) return fail("Please enter a title.");
      item = { title, text: (v.text || "").trim() };
    } else if (A.tab === "votes") {
      const name = (v.name || "").trim(), url = (v.url || "").trim() || "#";
      if (!name) return fail("Please enter the site name.");
      if (url !== "#" && !/^https?:\/\//i.test(url)) return fail("The vote link should start with https://");
      item = { name, reward: (v.reward || "").trim(), url };
    } else if (A.tab === "plans") {
      const name = (v.name || "").trim();
      if (!name) return fail("Please enter the rank name.");
      item = { id: PLAN_COLORS.includes(v.planColor) ? v.planColor : "sakura", name, price: Number(v.price) || 0, perks: lines(v.perks) };
    } else {
      const name = (v.name || "").trim();
      if (!name) return fail("Please enter a name.");
      item = { name, color: safeColor(v.color), logo: await readImageField(f, old.logo, "payments", 128, true) };
    }
    const ok = await commit(key, l => { if (isNew) l.push(item); else l[A.editing] = item; });
    if (!ok) return fail("Saving failed. Check your connection and try again.");
    A.editing = null; renderAdmin();
  } catch (er) {
    fail(errText(er));
  } finally {
    A.busy = false;
  }
});

/* =====================================================
   START-UP: show built-in content instantly, then swap in
   the live content from Supabase as soon as it arrives.
   ===================================================== */
renderAll();
show(location.hash.slice(1));
(async () => {
  if (!ONLINE) return;
  const [ok] = await Promise.all([loadContent(), loadPosts()]);
  ADMIN = await currentAdmin();
  renderAll();
  if (location.hash === "#admin") renderAdmin();
  if (!ok) console.warn("Floreon: showing built-in content because the database couldn't be reached.");
})();
