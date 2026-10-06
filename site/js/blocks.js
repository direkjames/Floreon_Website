// Draws each block type (see docs/content-model.md) and wires up its interactive parts.
// render(block, ctx) returns HTML; init(sectionElement, block, ctx) adds behaviour after it's on the page.
import { $, $$, esc, clean, safeUrl, safeColor, toast, fmtDate, icon } from "./util.js";

/* =========================================================
   Banner art: pixel scenes, slideshow, falling petals
   ========================================================= */
const SCENES = [
  { seed: 7, sky: ["#fbd3e0","#fbd9df","#fddfdc","#fee5d8","#ffecd6","#fff2d6"], sun: { x: 30, y: 40, c: "#fff6c9", moon: false }, cloud: "#fff", cloudOp: .85, stars: 0,
    hills: "#cfe6c9", grass: "#9ad39a", dirt: "#c9a087", dirtDark: "#b8886f", trunk: "#8a5f4b", pinks: ["#f9b8cf","#f6a3c1","#fcd0df","#ffffff"], fall: "#f9b8cf" },
  { seed: 21, sky: ["#6f5aa8","#9a64a8","#c56fa0","#e88b94","#f5a98c","#fcc79a"], sun: { x: 26, y: 50, c: "#ffd9a0", moon: false }, cloud: "#ffd2c4", cloudOp: .6, stars: 0,
    hills: "#9b78a6", grass: "#6fa07a", dirt: "#8f6a73", dirtDark: "#7d5963", trunk: "#5e4048", pinks: ["#f6a3c1","#f48fb4","#fbc0d6","#ffe3ee"], fall: "#f6a3c1" },
  { seed: 33, sky: ["#1e1a3d","#27234d","#322b5c","#3f3470","#4d3f80","#5c4a8c"], sun: { x: 24, y: 14, c: "#f4f1ff", moon: true }, cloud: "#8c80b8", cloudOp: .35, stars: 36,
    hills: "#3a3a6a", grass: "#4f8f78", dirt: "#5a4a6a", dirtDark: "#4d3f5c", trunk: "#3d2f45", pinks: ["#e48bb0","#d97aa3","#f2b3cd","#ffe0ec"], fall: "#e48bb0" }
];
function pixelScene(v) {
  const NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 160 90"); svg.setAttribute("preserveAspectRatio", "xMidYMid slice"); svg.setAttribute("shape-rendering", "crispEdges");
  let seed = v.seed;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rect = (x, y, w, h, fill, op) => {
    const r = document.createElementNS(NS, "rect");
    r.setAttribute("x", x); r.setAttribute("y", y); r.setAttribute("width", w); r.setAttribute("height", h); r.setAttribute("fill", fill);
    if (op) r.setAttribute("opacity", op);
    svg.appendChild(r);
  };
  v.sky.forEach((c, i) => rect(0, i * 12, 160, 13, c));
  for (let i = 0; i < v.stars; i++) rect(Math.floor(rnd() * 80) * 2, Math.floor(rnd() * 20) * 2, 1, 1, "#fff", .5 + rnd() * .5);
  const { x, y, c, moon } = v.sun;
  if (moon) { rect(x, y, 10, 10, c); rect(x - 1, y + 1, 12, 8, c); }
  else { rect(x, y, 14, 14, c); rect(x - 2, y + 2, 18, 10, c); rect(x + 2, y - 2, 10, 18, c); }
  [[12, 12, 22], [78, 20, 28], [122, 8, 20]].forEach(([cx, cy, w]) => { rect(cx, cy + 3, w, 4, v.cloud, v.cloudOp); rect(cx + 4, cy, w - 10, 4, v.cloud, v.cloudOp); });
  for (let hx = 0; hx < 160; hx += 4) { const h = 6 + Math.round(4 * Math.sin(hx / 14 + v.seed) + 3 * Math.sin(hx / 5)); rect(hx, 66 - h, 4, h + 10, v.hills); }
  rect(0, 70, 160, 3, v.grass); rect(0, 73, 160, 17, v.dirt);
  for (let i = 0; i < 40; i++) rect(Math.floor(rnd() * 80) * 2, 74 + Math.floor(rnd() * 8) * 2, 2, 2, v.dirtDark);
  rect(116, 44, 5, 27, v.trunk); rect(113, 66, 11, 4, v.trunk); rect(110, 53, 6, 2, v.trunk); rect(121, 50, 6, 2, v.trunk);
  for (let px = 88; px < 150; px += 2) for (let py = 12; py < 52; py += 2) {
    const dx = (px - 119) / 31, dy = (py - 32) / 20;
    if (dx * dx + dy * dy < 1 && rnd() > 0.16) rect(px, py, 2, 2, v.pinks[Math.floor(rnd() * v.pinks.length)]);
  }
  for (let i = 0; i < 18; i++) rect(96 + Math.floor(rnd() * 28) * 2, 70, 2, 1, v.fall);
  return svg;
}
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function slideshow(hero, images, interval, cleanups) {
  const slidesEl = $(".slides", hero), dotsEl = $(".dots", hero);
  const urls = (images || []).map(u => safeUrl(u)).filter(Boolean);
  const slides = (urls.length ? urls : SCENES).map(item => {
    const d = document.createElement("div");
    d.className = "slide";
    if (urls.length) d.style.backgroundImage = `url("${item.replace(/"/g, "%22")}")`; else d.appendChild(pixelScene(item));
    slidesEl.appendChild(d); return d;
  });
  let cur = 0, timer, paused = false;
  const dots = slides.map((_, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.setAttribute("aria-label", `Show picture ${i + 1}`);
    b.addEventListener("click", () => { go(i); restart(); });
    dotsEl.appendChild(b); return b;
  });
  function go(i) {
    cur = (i + slides.length) % slides.length;
    slides.forEach((el, n) => el.classList.toggle("on", n === cur));
    dots.forEach((el, n) => { el.classList.toggle("on", n === cur); el.setAttribute("aria-current", n === cur); });
  }
  function restart() {
    clearInterval(timer);
    if (slides.length < 2 || reduceMotion()) return;
    timer = setInterval(() => { if (!paused && !document.hidden) go(cur + 1); }, interval);
  }
  hero.addEventListener("mouseenter", () => paused = true);
  hero.addEventListener("mouseleave", () => paused = false);
  if (slides.length < 2) dotsEl.hidden = true;
  go(0); restart();
  cleanups.push(() => clearInterval(timer));
}
function petals(box, n, from = 0, span = 110) {
  for (let i = 0; i < n; i++) {
    const p = document.createElement("i");
    p.style.left = (from + Math.random() * span) + "%";
    p.style.animationDuration = (9 + Math.random() * 8) + "s";
    p.style.animationDelay = (-Math.random() * 14) + "s";
    p.style.transform = `scale(${0.7 + Math.random() * 0.8})`;
    box.appendChild(p);
  }
}

/* =========================================================
   Pixel flowers (feature cards) and pixel heads (team fallback)
   ========================================================= */
const FLOWERS = {
  daisy:     ["...P.P...","..PPPPP..",".PPPCPPP.","..PPPPP..","...P.P...","....G....","..G.G.G..","...GGG...","....G....","....G...."],
  tulip:     ["..P.P.P..","..PPPPP..","..PPPPP..","...PPP...","....G....","..G.G....","..GGG....","....GGG..","....G.G..","....G...."],
  blossom:   ["..PP.PP..",".PPPPPPP.","PPPPCPPPP",".PPPPPPP.","..PP.PP..","....G....","..G.G....","..GGG.G..","....GGG..","....G...."],
  rose:      ["..PPPPP..",".PPDDDPP.",".PDDPDDP.",".PDPPPDP.","..PPDPP..","...PPP...","..G.G....","..GGG.G..","....GGG..","....G...."],
  sunflower: ["..P.P.P..",".PPPPPPP.","PPDDDDDPP",".PDDDDDP.","PPDDDDDPP",".PPPPPPP.","..P.G.P..","..G.G....","..GGG....","....G.G.."]
};
const FLOWER_COLORS = [{ p: "#f6a3c1", d: "#d9739d" }, { p: "#b79ae0", d: "#8c6bc4" }, { p: "#ef8a76", d: "#cf5f4c" },
  { p: "#ffd35c", d: "#e0a92e" }, { p: "#8fb8f0", d: "#5f8fd6" }, { p: "#f7c7a3", d: "#e09a6c" }];
function flowerIcon(i) {
  const names = Object.keys(FLOWERS), shape = names[i % names.length];
  let pal = FLOWER_COLORS[i % FLOWER_COLORS.length], center = "#ffe08a";
  if (shape === "sunflower") pal = { p: "#ffc93c", d: "#8a5a3c" }; else if (pal.p === "#ffd35c") center = "#e58a5c";
  const col = { P: pal.p, D: pal.d, C: center, G: "#6cbf84" };
  let svg = `<svg viewBox="0 0 9 10" shape-rendering="crispEdges" aria-hidden="true">`;
  FLOWERS[shape].forEach((row, y) => [...row].forEach((c, x) => { if (c !== ".") svg += `<rect x="${x}" y="${y}" width="1" height="1" fill="${col[c]}"/>`; }));
  return { svg: svg + "</svg>", tint: pal.p };
}
export function pixelHead(seedText) {
  const h = [...String(seedText)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const hair = ["#5b3a29", "#2b2b3a", "#d98b4a", "#a24b5b", "#e8d39a"][h % 5], skin = ["#f1c9a5", "#e7b98f", "#f6d5b5", "#c99572"][(h >> 3) % 4];
  const shirt = ["#e58aa8", "#9a7fc0", "#6fb7a3", "#ee7f6d", "#8fb8f0"][(h >> 5) % 5];
  const px = ["HHHHHHHH","HHHHHHHH","HSSSSSSH","SSESSESS","SSSSSSSS","SSSMMSSS","TTTTTTTT","TTTTTTTT"];
  const col = { H: hair, S: skin, E: "#3b2f45", M: "#c0707a", T: shirt };
  let out = `<svg class="head" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">`;
  px.forEach((row, y) => [...row].forEach((c, x) => out += `<rect x="${x}" y="${y}" width="1" height="1" fill="${col[c]}"/>`));
  return out + "</svg>";
}

/* =========================================================
   Shared bits
   ========================================================= */
const searchBox = (placeholder, cls = "") => `<div class="toolbar ${cls}"><label class="search">${icon("search")}<input type="search" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}"></label></div>`;
const COLOR_VARS = { sakura: "var(--sakura)", dahlia: "var(--dahlia)", hibiscus: "var(--hibiscus)", moss: "var(--check)" };
const tags = (list, cls) => `<div class="tags">${list.map(x => `<span class="tag ${cls}">${esc(x)}</span>`).join("")}</div>`;
const reqGroups = p => `
  ${p.cond?.length ? `<div class="scard-group"><h4>Conditions</h4>${tags(p.cond, "cond")}</div>` : ""}
  ${p.biomes?.length ? `<div class="scard-group"><h4>${p.biomes.length > 1 ? "Biomes" : "Biome"}</h4>${tags(p.biomes, "")}</div>` : ""}
  ${p.blocks?.length ? `<div class="scard-group"><h4>Needed nearby blocks</h4>${tags(p.blocks, "block")}</div>` : ""}`;
const haystack = p => [p.name, ...(p.cond || []), ...(p.biomes || []), ...(p.blocks || [])].join(" ").toLowerCase();
const fillBiomes = (sel, list) => {
  [...new Set(list.flatMap(p => p.biomes || []))].sort((a, b) => a.localeCompare(b)).forEach(v => {
    const o = document.createElement("option"); o.value = o.textContent = v; sel.appendChild(o);
  });
};
const linkAttrs = url => /^https?:\/\//i.test(url) && !url.startsWith(location.origin) ? ' target="_blank" rel="noopener"' : "";
export const resolveLink = (url, discord, ctx) => discord || url === "discord" ? (ctx.settings.discordURL || "#") : safeUrl(url, "#");

/* =========================================================
   Blocks
   ========================================================= */
export const BLOCKS = {
  hero: {
    full: true,
    render: (b, ctx) => `
      <div class="hero ${b.size === "small" ? "cat-hero" : ""}">
        <div class="slides" aria-hidden="true"></div>
        ${b.petals !== false ? '<div class="petals" aria-hidden="true"></div>' : ""}
        <div class="dots" aria-label="Banner pictures"></div>
        ${b.size === "small" && !b.logo && !b.title && !b.subtitle ? "" : `<div class="hero-inner">
          ${b.logo ? `<h1><img class="word-logo" src="${esc(safeUrl(ctx.settings.wordLogo, "/images/floreon-word.webp"))}" alt="${esc(ctx.settings.serverName || "Floreon")}" width="1200" height="488" fetchpriority="high"></h1>`
                   : b.title ? `<h1 class="hero-title">${esc(b.title)}</h1>` : ""}
          ${b.subtitle ? `<p>${esc(b.subtitle)}</p>` : ""}
        </div>`}
      </div>`,
    init: (el, b, ctx) => {
      slideshow($(".hero", el), b.images, ctx.settings.heroInterval || 6000, ctx.cleanups);
      const p = $(".petals", el); if (p) petals(p, b.size === "small" ? 10 : 14, b.size === "small" ? 0 : 30, b.size === "small" ? 110 : 90);
    }
  },

  heading: {
    render: b => `<div class="heading ${b.align === "center" ? "center" : ""}">
      ${b.eyebrow ? `<span class="eyebrow">${esc(b.eyebrow)}</span>` : ""}
      ${b.title ? `<h2 class="section-title">${esc(b.title)}</h2>` : ""}
      ${b.lead ? `<p class="section-lead">${esc(b.lead)}</p>` : ""}</div>`
  },

  text: { render: b => `<div class="${b.card ? "about-card prose" : "prose"}">${clean(b.html)}</div>` },

  image: {
    render: b => b.url ? `<figure class="pic ${["wide", "full"].includes(b.size) ? b.size : ""}">
      <img src="${esc(safeUrl(b.url))}" alt="${esc(b.alt || "")}" loading="lazy">
      ${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ""}</figure>` : ""
  },

  gallery: {
    render: b => `<div class="gallery">${(b.images || []).filter(i => i.url).map(i => `
      <figure class="shot"><button type="button" data-zoom="${esc(safeUrl(i.url))}" aria-label="Open picture${i.caption ? ": " + esc(i.caption) : ""}">
        <img src="${esc(safeUrl(i.url))}" alt="${esc(i.alt || "")}" loading="lazy"></button>
        ${i.caption ? `<figcaption>${esc(i.caption)}</figcaption>` : ""}</figure>`).join("")}</div>`
  },

  cards: {
    render: (b, ctx) => {
      const items = b.items || [];
      if (b.style === "links") return `<div class="gm-grid">${items.map(c => {
        const url = resolveLink(c.url, false, ctx);
        return `<a class="gm-card" href="${esc(url)}"${linkAttrs(url)} style="--c:${COLOR_VARS[c.color] || COLOR_VARS.sakura}">
          <h3>${esc(c.name)}</h3>${c.text ? `<p>${esc(c.text)}</p>` : ""}<span>Explore ${esc(c.name)}</span></a>`;
      }).join("")}</div>`;
      return `${b.search ? searchBox("Search…") : ""}<div class="modes">${items.map((c, i) => {
        const f = flowerIcon(i);
        return `<article class="mode"><div class="ico" style="--p:${f.tint}">${f.svg}</div><h3>${esc(c.name)}</h3>
          ${c.text ? `<p>${esc(c.text)}</p>` : ""}${c.chips?.length ? `<div class="chips">${c.chips.map(x => `<span>${esc(x)}</span>`).join("")}</div>` : ""}</article>`;
      }).join("")}</div><p class="empty" hidden>Nothing matches your search.</p>`;
    },
    init: el => {
      const input = $(".search input", el); if (!input) return;
      input.addEventListener("input", () => {
        const q = input.value.trim().toLowerCase(); let n = 0;
        $$(".mode", el).forEach(m => { const hit = !q || m.textContent.toLowerCase().includes(q); m.hidden = !hit; if (hit) n++; });
        $(".empty", el).hidden = n > 0;
      });
    }
  },

  steps: {
    render: b => `<ol class="steps">${(b.items || []).map(s => `<li><h3>${esc(s.title)}</h3><div class="step-text">${clean(s.text)}</div></li>`).join("")}</ol>`
  },

  faq: {
    render: b => `${b.search ? searchBox("Search questions…") : ""}
      <div class="faqs">${(b.items || []).map(f => `<details class="faq"><summary>${esc(f.q)}</summary><div class="faq-body">${clean(f.a)}</div></details>`).join("")}</div>
      <p class="empty" hidden>No questions match your search.</p>`,
    init: el => {
      const input = $(".search input", el); if (!input) return;
      input.addEventListener("input", () => {
        const q = input.value.trim().toLowerCase(); let n = 0;
        $$("details.faq", el).forEach(d => { const hit = !q || d.textContent.toLowerCase().includes(q); d.hidden = !hit; if (hit) { n++; if (q) d.open = true; } });
        $(".empty", el).hidden = n > 0 || !q;
      });
    }
  },

  tables: {
    render: b => `<div class="series">${(b.tables || []).map(t => `
      <div class="series-col">${t.name ? `<h3>${esc(t.name)}</h3>` : ""}
        <table>${(b.columns || []).length ? `<thead><tr>${b.columns.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead>` : ""}
          <tbody>${(t.rows || []).map(r => `<tr>${r.map(c => `<td>${clean(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>
      </div>`).join("")}</div>`
  },

  buttons: {
    render: (b, ctx) => `<div class="btn-row ${b.align === "center" ? "center" : ""}">${(b.items || []).map(x => {
      const url = resolveLink(x.url, x.discord, ctx);
      return `<a class="btn ${x.style === "ghost" ? "ghost" : ""}" href="${esc(url)}"${x.discord ? ' target="_blank" rel="noopener"' : linkAttrs(url)}>${esc(x.label)}</a>`;
    }).join("")}</div>`
  },

  rules: {
    render: b => `<ol class="rules">${(b.items || []).map(r => `<li><div><h3>${esc(r.title)}</h3><div class="rule-text">${clean(r.text)}</div></div></li>`).join("")}</ol>`
  },

  votes: {
    render: b => `<div class="votes">${(b.items || []).map(v => {
      const url = safeUrl(v.url);
      return `<article class="vote"><h3>${esc(v.name)}</h3>${v.reward ? `<p>${esc(v.reward)}</p>` : ""}
        ${url && url !== "#" ? `<a class="btn" href="${esc(url)}" target="_blank" rel="noopener">Vote now</a>` : `<button type="button" class="btn" data-not-ready>Vote now</button>`}</article>`;
    }).join("")}</div>`,
    init: el => el.addEventListener("click", e => { if (e.target.closest("[data-not-ready]")) toast("This vote site isn't set up yet."); })
  },

  news: {
    render: () => `<div class="news"></div><div class="news-more"><button class="btn ghost" type="button" hidden>Show older posts</button></div>`,
    init: (el, b, ctx) => {
      const step = Math.max(1, Number(b.limit) || 3);
      let shown = step;
      const posts = ctx.posts.filter(p => p.published !== false);
      const draw = () => {
        $(".news", el).innerHTML = posts.length ? posts.slice(0, shown).map(p => `
          <article class="post${p.pinned ? " pinned" : ""}">
            ${p.image_url ? `<img class="post-img" src="${esc(safeUrl(p.image_url))}" alt="" loading="lazy">` : ""}
            <div class="post-body">
              <div class="post-meta">${p.pinned ? `<span class="pin">Pinned</span>` : ""}<time datetime="${esc(p.created_at)}">${esc(fmtDate(p.created_at))}</time>${p.author_name ? `<span>by ${esc(p.author_name)}</span>` : ""}</div>
              <h3>${esc(p.title)}</h3><div class="post-text">${clean(p.body)}</div>
            </div></article>`).join("") : `<p class="empty">No news yet. Check back soon!</p>`;
        $(".news-more button", el).hidden = posts.length <= shown;
      };
      $(".news-more button", el).addEventListener("click", () => { shown += step; draw(); });
      draw();
    }
  },

  team: {
    render: (b, ctx) => {
      const rows = {};
      (ctx.lists.siteTeam || []).forEach(m => (rows[m.row || 1] ||= []).push(m));
      return `<div class="team">${Object.keys(rows).sort((a, c) => a - c).map(k => `<div class="team-row">${rows[k].map(m => {
        const src = safeUrl(m.head) || `https://mc-heads.net/avatar/${encodeURIComponent(m.mc || m.name)}/128`;
        return `<article class="member"><img class="head" src="${esc(src)}" alt="" data-head="${esc(m.name)}" width="84" height="84" loading="lazy">
          <h3>${esc(m.name)}</h3><span>${esc(m.role)}</span></article>`;
      }).join("")}</div>`).join("")}</div>`;
    },
    init: el => $$("img[data-head]", el).forEach(img => img.addEventListener("error", () => { img.outerHTML = pixelHead(img.dataset.head); }, { once: true }))
  },

  store: {
    render: (b, ctx) => {
      const cur = esc(ctx.settings.currency || "₱");
      return `<div class="heading center">${b.title ? `<h2 class="section-title">${esc(b.title)}</h2>` : ""}${b.lead ? `<p class="section-lead">${esc(b.lead)}</p>` : ""}</div>
      <div class="plans">${(ctx.lists.sitePlans || []).map(p => {
        const color = COLOR_VARS[p.id] ? p.id : "sakura";
        return `<article class="plan ${color}">
          <div class="plan-head"><h3>${esc(p.name)}</h3><div class="plan-price">${cur}${esc(p.price)}<small> one-time</small></div></div>
          <div class="plan-body"><h4>${esc(p.name)} Rank</h4><ul class="perks">${(p.perks || []).map(x => `<li>${clean(x)}</li>`).join("")}</ul>
            <button class="buy" type="button" data-plan="${esc(p.name)}">Buy Now</button></div></article>`;
      }).join("")}</div>
      ${b.note ? `<p class="store-note">${esc(b.note)}</p>` : ""}
      ${(ctx.lists.sitePayments || []).length ? `<div class="pay"><h3>Accepted payments</h3><div class="pay-list">${ctx.lists.sitePayments.map(p => `<span class="pay-chip">${
        safeUrl(p.logo) ? `<img src="${esc(safeUrl(p.logo))}" alt="">` : `<i style="background:${safeColor(p.color)}">${esc((p.name || "?")[0])}</i>`}${esc(p.name)}</span>`).join("")}</div></div>` : ""}`;
    },
    init: (el, b, ctx) => el.addEventListener("click", e => {
      const btn = e.target.closest(".buy"); if (!btn) return;
      $("#buyPlan").textContent = btn.dataset.plan + " rank";
      $("#buyDiscord").href = ctx.settings.discordURL || "#";
      $("#buyModal").classList.add("open");
      $("#buyClose").focus();
    })
  },

  spawns: {
    render: () => `<div class="toolbar"><label class="search">${icon("search")}<input type="search" data-q placeholder="Search Pokémon, biome, condition…" aria-label="Search spawns"></label>
        <select data-type aria-label="Filter by type"><option value="">All types</option><option value="paradox">Paradox</option><option value="ultra">Ultra Beast</option></select>
        <select data-biome aria-label="Filter by biome"><option value="">All biomes</option></select></div>
      <p class="result-count"></p><div class="spawn-results"></div>`,
    init: (el, b, ctx) => {
      const all = ctx.lists.czSpawns || [];
      fillBiomes($("[data-biome]", el), all);
      const TITLES = { paradox: "Paradox Spawns", ultra: "Ultra Beast Spawns" };
      const draw = () => {
        const q = $("[data-q]", el).value.trim().toLowerCase(), type = $("[data-type]", el).value, biome = $("[data-biome]", el).value;
        const list = all.filter(p => (!type || p.kind === type) && (!biome || (p.biomes || []).includes(biome)) && (!q || haystack(p).includes(q)));
        $(".result-count", el).textContent = `Showing ${list.length} of ${all.length} Pokémon`;
        $(".spawn-results", el).innerHTML = !list.length ? `<p class="empty">No Pokémon match your search or filters.</p>`
          : ["paradox", "ultra"].map(kind => {
            const items = list.filter(p => (p.kind || "paradox") === kind);
            return items.length ? `<h2 class="section-title group-title">${TITLES[kind]} <small>${items.length}</small></h2>
              <div class="cards">${items.map(p => `<article class="scard ${kind}"><div class="scard-head"><h3>${esc(p.name)}</h3></div>
                <div class="scard-body">${reqGroups(p) || `<p class="scard-empty">No requirements listed.</p>`}</div></article>`).join("")}</div>` : "";
          }).join("");
      };
      el.addEventListener("input", draw);
      draw();
    }
  },

  legendaries: {
    render: () => `<div class="toolbar"><label class="search">${icon("search")}<input type="search" data-q placeholder="Search legendaries…" aria-label="Search legendaries"></label>
        <select data-status aria-label="Filter by structure"><option value="">All legendaries</option><option value="has">Has a structure</option><option value="none">No structure yet</option></select>
        <select data-biome aria-label="Filter by biome"><option value="">All biomes</option></select></div>
      <div class="legend-key"><span><i class="has"></i>Has a structure</span><span><i></i>No structure yet</span></div>
      <p class="result-count"></p>
      <div class="picker" role="group" aria-label="Choose a legendary"></div>
      <div class="detail hint" aria-live="polite">Select a legendary above to see its information.</div>`,
    init: (el, b, ctx) => {
      const all = ctx.lists.czLegendaries || [];
      let selected = "";
      fillBiomes($("[data-biome]", el), all);
      const drawPicker = () => {
        const q = $("[data-q]", el).value.trim().toLowerCase(), st = $("[data-status]", el).value, biome = $("[data-biome]", el).value;
        const shown = all.filter(p => (!st || (st === "has") === !!p.structure) && (!biome || (p.biomes || []).includes(biome)) && (!q || haystack(p).includes(q)));
        $(".result-count", el).textContent = `Showing ${shown.length} of ${all.length} legendaries`;
        $(".picker", el).innerHTML = shown.length ? shown.map(p => `<button type="button" class="pick dotted ${p.structure ? "has" : ""}" data-name="${esc(p.name)}" aria-pressed="${p.name === selected}">${esc(p.name)}</button>`).join("")
          : `<p class="empty" style="width:100%">No legendaries match your search or filters.</p>`;
      };
      const drawDetail = () => {
        const box = $(".detail", el), p = all.find(l => l.name === selected);
        if (!p) { box.className = "detail hint"; box.textContent = "Select a legendary above to see its information."; return; }
        const text = p.html ?? (p.paras || []).map(t => `<p>${t}</p>`).join("");
        box.className = "detail";
        box.innerHTML = `<div class="detail-head"><h3>${esc(p.name)}</h3><span class="badge">${p.structure ? "Has a structure" : "No structure yet"}</span></div>
          <div class="detail-body">
            ${p.structure ? `<div class="prose">${clean(text)}</div>` : `<p>${esc(p.name)} doesn't have a structure yet to manually summon it. It can only spawn if you meet its spawn requirements.</p>`}
            ${(p.images || []).length ? `<div class="gallery small">${p.images.map(u => `<figure class="shot"><button type="button" data-zoom="${esc(safeUrl(u))}" aria-label="Open picture"><img src="${esc(safeUrl(u))}" alt="" loading="lazy"></button></figure>`).join("")}</div>` : ""}
            ${reqGroups(p)}
          </div>`;
      };
      el.addEventListener("input", e => { if (e.target.closest(".toolbar")) drawPicker(); });
      $(".picker", el).addEventListener("click", e => {
        const btn = e.target.closest(".pick"); if (!btn) return;
        selected = btn.dataset.name; drawPicker(); drawDetail();
        $(".detail", el).scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "nearest" });
      });
      drawPicker();
    }
  }
};
