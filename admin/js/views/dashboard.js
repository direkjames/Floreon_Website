import { html, raw, list, icon, timeAgo, errText } from "../lib/ui.js";
import { recentPages, recentPosts } from "../lib/sb.js";
import { PUBLIC_SITE } from "../config.js";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};
const pageUrl = slug => PUBLIC_SITE + (slug === "home" ? "/" : "/" + slug);

export async function renderDashboard(root, { staff }) {
  root.innerHTML = html`
    <header class="page-head">
      <div><h1>${greeting()}, ${staff.name}</h1><p class="lead">What would you like to change today?</p></div>
      <a class="btn ghost" href="${PUBLIC_SITE}" target="_blank" rel="noopener">${raw(icon("external"))}View site</a>
    </header>
    <div class="quick">
      <a href="#/news" class="quick-link">${raw(icon("news"))}<span><strong>Write a news post</strong>Announce events and updates on the home page</span></a>
      <a href="#/pages" class="quick-link">${raw(icon("pages"))}<span><strong>Edit a page</strong>Change text, FAQs, pictures and layout</span></a>
      <a href="#/media" class="quick-link">${raw(icon("upload"))}<span><strong>Upload pictures</strong>Add screenshots to the media library</span></a>
    </div>
    <div class="two-col">
      <section class="panel"><h2>Recently edited pages</h2><ul class="rows" id="dPages"><li class="loading">Loading…</li></ul></section>
      <section class="panel"><h2>Latest news</h2><ul class="rows" id="dPosts"><li class="loading">Loading…</li></ul></section>
    </div>`;

  const [pages, posts] = await Promise.allSettled([recentPages(6), recentPosts(6)]);
  const pEl = root.querySelector("#dPages"), nEl = root.querySelector("#dPosts");
  if (!pEl) return; // user navigated away
  pEl.innerHTML = pages.status === "rejected" ? html`<li class="empty">Couldn't load pages: ${errText(pages.reason)}</li>`
    : !pages.value.length ? `<li class="empty">No pages yet. Run 003_seed_pages.sql in Supabase.</li>`
    : list(pages.value, p => html`
      <li><a href="#/pages/${p.id}">${p.title}</a>
        <span class="meta">${p.published ? "" : raw('<span class="tag draft">Draft</span>')}<a class="subtle" href="${pageUrl(p.slug)}" target="_blank" rel="noopener">/${p.slug === "home" ? "" : p.slug}</a><span>${timeAgo(p.updated_at)}</span></span></li>`).s;
  nEl.innerHTML = posts.status === "rejected" ? html`<li class="empty">Couldn't load news: ${errText(posts.reason)}</li>`
    : !posts.value.length ? `<li class="empty">No posts yet. <a href="#/news">Write the first one</a>.</li>`
    : list(posts.value, p => html`
      <li><a href="#/news">${p.title}</a>
        <span class="meta">${p.pinned ? raw('<span class="tag">Pinned</span>') : ""}${p.published ? "" : raw('<span class="tag draft">Draft</span>')}${p.author_name ? raw(html`<span>${p.author_name}</span>`) : ""}<span>${timeAgo(p.created_at)}</span></span></li>`).s;
}
