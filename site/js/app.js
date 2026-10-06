/* =====================================================
   APP – renders the public pages from DB / POSTS (see data.js)
   ===================================================== */

/* ---------- text from config ---------- */
document.querySelectorAll("[data-server-name]").forEach(el => el.textContent = CONFIG.serverName);
document.title = CONFIG.serverName + " – Minecraft Server";
$("#tagline").textContent = CONFIG.tagline;
$("#discordLink").href = CONFIG.discordURL;
$("#applyBtn").href = CONFIG.discordURL;
$("#buyDiscord").href = CONFIG.discordURL;
document.documentElement.classList.toggle("no-oneblock", !CONFIG.oneblockEnabled);

/* ---------- toast ---------- */
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

/* ---------- hero carousel ---------- */
const SCENES = [
  { // day
    seed: 7, sky: ["#fbd3e0","#fbd9df","#fddfdc","#fee5d8","#ffecd6","#fff2d6"],
    sun: { x: 30, y: 40, c: "#fff6c9", moon: false }, cloud: "#fff", cloudOp: .85, stars: 0,
    hills: "#cfe6c9", grass: "#9ad39a", dirt: "#c9a087", dirtDark: "#b8886f", trunk: "#8a5f4b",
    pinks: ["#f9b8cf","#f6a3c1","#fcd0df","#ffffff"], fall: "#f9b8cf"
  },
  { // sunset
    seed: 21, sky: ["#6f5aa8","#9a64a8","#c56fa0","#e88b94","#f5a98c","#fcc79a"],
    sun: { x: 26, y: 50, c: "#ffd9a0", moon: false }, cloud: "#ffd2c4", cloudOp: .6, stars: 0,
    hills: "#9b78a6", grass: "#6fa07a", dirt: "#8f6a73", dirtDark: "#7d5963", trunk: "#5e4048",
    pinks: ["#f6a3c1","#f48fb4","#fbc0d6","#ffe3ee"], fall: "#f6a3c1"
  },
  { // night
    seed: 33, sky: ["#1e1a3d","#27234d","#322b5c","#3f3470","#4d3f80","#5c4a8c"],
    sun: { x: 24, y: 14, c: "#f4f1ff", moon: true }, cloud: "#8c80b8", cloudOp: .35, stars: 36,
    hills: "#3a3a6a", grass: "#4f8f78", dirt: "#5a4a6a", dirtDark: "#4d3f5c", trunk: "#3d2f45",
    pinks: ["#e48bb0","#d97aa3","#f2b3cd","#ffe0ec"], fall: "#e48bb0"
  }
];

function pixelScene(v) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 160 90");
  svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
  svg.setAttribute("shape-rendering", "crispEdges");
  let seed = v.seed;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rect = (x, y, w, h, fill, op) => {
    const r = document.createElementNS(NS, "rect");
    r.setAttribute("x", x); r.setAttribute("y", y); r.setAttribute("width", w); r.setAttribute("height", h);
    r.setAttribute("fill", fill); if (op) r.setAttribute("opacity", op);
    svg.appendChild(r);
  };
  v.sky.forEach((c, i) => rect(0, i * 12, 160, 13, c));
  for (let i = 0; i < v.stars; i++) rect(Math.floor(rnd() * 80) * 2, Math.floor(rnd() * 20) * 2, 1, 1, "#fff", .5 + rnd() * .5);
  const { x, y, c, moon } = v.sun;
  if (moon) { rect(x, y, 10, 10, c); rect(x - 1, y + 1, 12, 8, c); }
  else { rect(x, y, 14, 14, c); rect(x - 2, y + 2, 18, 10, c); rect(x + 2, y - 2, 10, 18, c); }
  [[12, 12, 22], [78, 20, 28], [122, 8, 20]].forEach(([cx, cy, w]) => {
    rect(cx, cy + 3, w, 4, v.cloud, v.cloudOp); rect(cx + 4, cy, w - 10, 4, v.cloud, v.cloudOp);
  });
  for (let hx = 0; hx < 160; hx += 4) {
    const h = 6 + Math.round(4 * Math.sin(hx / 14 + v.seed) + 3 * Math.sin(hx / 5));
    rect(hx, 66 - h, 4, h + 10, v.hills);
  }
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

function carousel(hero, imgs) {
  const slidesEl = $(".slides", hero), dotsEl = $(".dots", hero);
  imgs = imgs || [];
  const slides = (imgs.length ? imgs : SCENES).map(item => {
    const d = document.createElement("div");
    d.className = "slide";
    if (imgs.length) d.style.backgroundImage = `url('${safeUrl(item, "")}')`;
    else d.appendChild(pixelScene(item));
    slidesEl.appendChild(d);
    return d;
  });
  const dots = slides.map((_, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-label", `Show picture ${i + 1}`);
    b.addEventListener("click", () => { go(i); restart(); });
    dotsEl.appendChild(b);
    return b;
  });
  let cur = 0, timer, paused = false;
  function go(i) {
    cur = (i + slides.length) % slides.length;
    slides.forEach((el, n) => el.classList.toggle("on", n === cur));
    dots.forEach((el, n) => { el.classList.toggle("on", n === cur); el.setAttribute("aria-selected", n === cur); });
  }
  function restart() {
    clearInterval(timer);
    if (slides.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timer = setInterval(() => { if (!paused && !document.hidden) go(cur + 1); }, CONFIG.heroInterval || 6000);
  }
  hero.addEventListener("mouseenter", () => paused = true);
  hero.addEventListener("mouseleave", () => paused = false);
  if (slides.length < 2) dotsEl.style.display = "none";
  go(0); restart();
}
carousel($("#hero"), CONFIG.heroImages);
carousel($("#czHero"), CONFIG.czHeroImages);
carousel($("#obHero"), CONFIG.obHeroImages);

/* ---------- falling petals (home + store) ---------- */
function petals(box, from, span, n) {
  for (let i = 0; i < n; i++) {
    const p = document.createElement("i");
    p.style.left = (from + Math.random() * span) + "%";
    p.style.animationDuration = (9 + Math.random() * 8) + "s";
    p.style.animationDelay = (-Math.random() * 14) + "s";
    p.style.transform = `scale(${0.7 + Math.random() * 0.8})`;
    box.appendChild(p);
  }
}
petals($("#petals"), 30, 90, 14);
petals($("#czHero .petals"), 0, 110, 10);
petals($("#obHero .petals"), 0, 110, 10);
petals($("#storePetals"), 0, 110, 22);

/* ---------- news posts (home page) ---------- */
const NEWS_PAGE = 3;
let newsShown = NEWS_PAGE;
const fmtDate = d => { try { return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }); } catch (e) { return ""; } };

function renderNews() {
  const list = POSTS.filter(p => p.published);
  const box = $("#newsList");
  if (!list.length) {
    box.innerHTML = `<p class="empty">No news yet. Check back soon!</p>`;
    $("#newsMore").hidden = true;
    return;
  }
  box.innerHTML = list.slice(0, newsShown).map(p => `
    <article class="post${p.pinned ? " pinned" : ""}">
      ${p.image_url ? `<img class="post-img" src="${esc(safeUrl(p.image_url, ""))}" alt="" loading="lazy">` : ""}
      <div class="post-body">
        <div class="post-meta">
          ${p.pinned ? `<span class="pin">Pinned</span>` : ""}
          <time datetime="${esc(p.created_at)}">${esc(fmtDate(p.created_at))}</time>
          ${p.author_name ? `<span>· ${esc(p.author_name)}</span>` : ""}
        </div>
        <h3>${esc(p.title)}</h3>
        <div class="post-text">${clean(p.body)}</div>
      </div>
    </article>`).join("");
  $("#newsMore").hidden = list.length <= newsShown;
}
$("#newsMore").addEventListener("click", () => { newsShown += NEWS_PAGE; renderNews(); });

/* ---------- team (Minecraft skin heads, one row per group) ---------- */
function pixelHead(seedText) {
  const h = [...seedText].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const hair = ["#5b3a29", "#2b2b3a", "#d98b4a", "#a24b5b", "#e8d39a"][h % 5];
  const skin = ["#f1c9a5", "#e7b98f", "#f6d5b5", "#c99572"][(h >> 3) % 4];
  const shirt = ["#e58aa8", "#9a7fc0", "#6fb7a3", "#ee7f6d", "#8fb8f0"][(h >> 5) % 5];
  const px = ["HHHHHHHH","HHHHHHHH","HSSSSSSH","SSESSESS","SSSSSSSS","SSSMMSSS","TTTTTTTT","TTTTTTTT"];
  const col = { H: hair, S: skin, E: "#3b2f45", M: "#c0707a", T: shirt };
  let out = `<svg viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">`;
  px.forEach((row, y) => [...row].forEach((c, x) => out += `<rect x="${x}" y="${y}" width="1" height="1" fill="${col[c]}"/>`));
  return out + "</svg>";
}
// if a skin can't load (offline / unknown name), show a pixel head instead
function headFallback(img) { img.outerHTML = pixelHead(img.alt || "x"); }

const skinSrc = m => safeUrl(m.head, "") || `https://mc-heads.net/avatar/${encodeURIComponent(m.mc || m.name)}/128`;
function renderTeam() {
  const rows = {};
  DB.siteTeam.forEach(m => { (rows[m.row || 1] = rows[m.row || 1] || []).push(m); });
  $("#team").innerHTML = Object.keys(rows).sort((a, b) => a - b).map(k => `
    <div class="team-row">
      ${rows[k].map(m => `<article class="member">
        <img class="head" src="${esc(skinSrc(m))}" alt="${esc(m.name)}" width="84" height="84" loading="lazy" onerror="headFallback(this)">
        <h3>${esc(m.name)}</h3>
        <span>${esc(m.role)}</span>
      </article>`).join("")}
    </div>`).join("");
}

/* ---------- gamemode "about" pages ---------- */
function renderAbout(mode, leadSel, boxSel) {
  $(leadSel).textContent = mode.lead;
  $(boxSel).innerHTML = mode.about.map(t => `<p>${clean(t)}</p>`).join("") + `<a class="btn" href="#whitelist">How to get whitelisted</a>`;
}

/* ---------- feature cards with pixel flowers ---------- */
const FLOWERS = {
  daisy:     ["...P.P...","..PPPPP..",".PPPCPPP.","..PPPPP..","...P.P...","....G....","..G.G.G..","...GGG...","....G....","....G...."],
  tulip:     ["..P.P.P..","..PPPPP..","..PPPPP..","...PPP...","....G....","..G.G....","..GGG....","....GGG..","....G.G..","....G...."],
  blossom:   ["..PP.PP..",".PPPPPPP.","PPPPCPPPP",".PPPPPPP.","..PP.PP..","....G....","..G.G....","..GGG.G..","....GGG..","....G...."],
  rose:      ["..PPPPP..",".PPDDDPP.",".PDDPDDP.",".PDPPPDP.","..PPDPP..","...PPP...","..G.G....","..GGG.G..","....GGG..","....G...."],
  sunflower: ["..P.P.P..",".PPPPPPP.","PPDDDDDPP",".PDDDDDP.","PPDDDDDPP",".PPPPPPP.","..P.G.P..","..G.G....","..GGG....","....G.G.."]
};
const FLOWER_COLORS = [
  { p: "#f6a3c1", d: "#d9739d" }, { p: "#b79ae0", d: "#8c6bc4" }, { p: "#ef8a76", d: "#cf5f4c" },
  { p: "#ffd35c", d: "#e0a92e" }, { p: "#8fb8f0", d: "#5f8fd6" }, { p: "#f7c7a3", d: "#e09a6c" }
];
function flowerIcon(i) {
  const names = Object.keys(FLOWERS);
  const shape = names[i % names.length];
  let pal = FLOWER_COLORS[i % FLOWER_COLORS.length], center = "#ffe08a";
  if (shape === "sunflower") pal = { p: "#ffc93c", d: "#8a5a3c" };
  else if (pal.p === "#ffd35c") center = "#e58a5c";
  const col = { P: pal.p, D: pal.d, C: center, G: "#6cbf84" };
  let svg = `<svg viewBox="0 0 9 10" shape-rendering="crispEdges" aria-hidden="true">`;
  FLOWERS[shape].forEach((row, y) => [...row].forEach((c, x) => { if (c !== ".") svg += `<rect x="${x}" y="${y}" width="1" height="1" fill="${col[c]}"/>`; }));
  return { svg: svg + "</svg>", tint: pal.p };
}
function renderCards(list, searchSel, boxSel, emptyText) {
  const q = $(searchSel).value.trim().toLowerCase();
  const shown = list.map((m, i) => ({ m, i })).filter(({ m }) =>
    !q || (m.name + " " + (m.text || "") + " " + (m.chips || []).join(" ")).toLowerCase().includes(q));
  $(boxSel).innerHTML = shown.length ? shown.map(({ m, i }) => {
    const f = flowerIcon(i);
    return `<article class="mode">
      <div class="ico" style="--p:${f.tint}">${f.svg}</div>
      <h3>${esc(m.name)}</h3>
      ${m.text ? `<p>${esc(m.text)}</p>` : ""}
      ${m.chips ? `<div class="chips">${m.chips.map(c => `<span>${esc(c)}</span>`).join("")}</div>` : ""}
    </article>`;
  }).join("") : `<p class="empty" style="grid-column:1/-1">${emptyText}</p>`;
}
const renderFeatureLists = () => {
  renderCards(DB.czFeatures, "#modSearch", "#modes", "No mods match your search.");
  renderCards(DB.obFeatures, "#obSearch", "#obModes", "No features match your search.");
};
$("#modSearch").addEventListener("input", renderFeatureLists);
$("#obSearch").addEventListener("input", renderFeatureLists);

/* ---------- spawn + legendary helpers ---------- */
const tags = (list, cls) => `<div class="tags">${list.map(x => `<span class="tag ${cls}">${esc(x)}</span>`).join("")}</div>`;
const reqGroups = p => `
  ${p.cond.length ? `<div class="scard-group"><h4>Conditions</h4>${tags(p.cond, "cond")}</div>` : ""}
  ${p.biomes.length ? `<div class="scard-group"><h4>${p.biomes.length > 1 ? "Biomes" : "Biome"}</h4>${tags(p.biomes, "")}</div>` : ""}
  ${p.blocks.length ? `<div class="scard-group"><h4>Needed nearby blocks</h4>${tags(p.blocks, "block")}</div>` : ""}`;
const haystack = p => [p.name, ...p.cond, ...p.biomes, ...p.blocks].join(" ").toLowerCase();
const uniqueBiomes = list => [...new Set(list.flatMap(p => p.biomes))].sort((a, b) => a.localeCompare(b));
function refillBiomes(sel, list) {
  const cur = sel.value; sel.length = 1;
  uniqueBiomes(list).forEach(v => { const o = document.createElement("option"); o.value = o.textContent = v; sel.appendChild(o); });
  sel.value = [...sel.options].some(o => o.value === cur) ? cur : "";
}

/* ---------- spawns: search + filters ---------- */
const SPAWN_TITLES = { paradox: "Paradox Spawns", ultra: "Ultra Beast Spawns" };
function renderSpawns() {
  const SPAWNS = DB.czSpawns;
  refillBiomes($("#spawnBiome"), SPAWNS);
  const q = $("#spawnSearch").value.trim().toLowerCase();
  const type = $("#spawnType").value, biome = $("#spawnBiome").value;
  const list = SPAWNS.filter(p => (!type || p.kind === type) && (!biome || p.biomes.includes(biome)) && (!q || haystack(p).includes(q)));
  $("#spawnCount").textContent = `Showing ${list.length} of ${SPAWNS.length} Pokémon`;
  if (!list.length) { $("#spawnResults").innerHTML = `<p class="empty">No Pokémon match your search or filters.</p>`; return; }
  $("#spawnResults").innerHTML = ["paradox", "ultra"].map(kind => {
    const items = list.filter(p => p.kind === kind);
    if (!items.length) return "";
    return `<h2 class="section-title group-title">${SPAWN_TITLES[kind]} <small>${items.length}</small></h2>
      <div class="cards">${items.map(p => `
        <article class="scard ${kind}">
          <div class="scard-head"><h3>${esc(p.name)}</h3></div>
          <div class="scard-body">${reqGroups(p) || `<p class="scard-empty">No requirements listed.</p>`}</div>
        </article>`).join("")}</div>`;
  }).join("");
}
["#spawnSearch", "#spawnType", "#spawnBiome"].forEach(s => $(s).addEventListener("input", renderSpawns));

/* ---------- legendaries: picker + info panel ---------- */
// Selection is remembered by NAME, so reordering in the admin panel can't show the wrong legendary.
let legSelected = "";
function renderLegPicker() {
  const LEGENDS = DB.czLegendaries;
  refillBiomes($("#legBiome"), LEGENDS);
  const q = $("#legSearch").value.trim().toLowerCase();
  const st = $("#legStatus").value, biome = $("#legBiome").value;
  const shown = LEGENDS.filter(p =>
    (!st || (st === "has") === !!p.structure) && (!biome || p.biomes.includes(biome)) && (!q || haystack(p).includes(q)));
  $("#legCount").textContent = `Showing ${shown.length} of ${LEGENDS.length} legendaries`;
  $("#legPicker").innerHTML = shown.length
    ? shown.map(p => `<button type="button" class="pick dotted ${p.structure ? "has" : ""}" data-name="${esc(p.name)}" aria-pressed="${p.name === legSelected}">${esc(p.name)}</button>`).join("")
    : `<p class="empty" style="width:100%">No legendaries match your search or filters.</p>`;
}
function renderLegDetail() {
  const box = $("#legDetail");
  const p = DB.czLegendaries.find(l => l.name === legSelected);
  if (!p) { legSelected = ""; box.className = "detail hint"; box.textContent = "Select a legendary above to see its information."; return; }
  box.className = "detail";
  box.innerHTML = `
    <div class="detail-head"><h3>${esc(p.name)}</h3><span class="badge">${p.structure ? "Has a structure" : "No structure yet"}</span></div>
    <div class="detail-body">
      ${p.structure
        ? (p.paras || []).map(t => `<p>${clean(t)}</p>${IMG("", p.name)}`).join("")
        : `<p>${esc(p.name)} doesn't have a structure yet to manually summon it. It can only spawn if you meet its spawn requirements.</p>`}
      ${p.structure && !(p.cond.length || p.biomes.length || p.blocks.length) ? "" : reqGroups(p)}
    </div>`;
}
$("#legPicker").addEventListener("click", e => {
  const b = e.target.closest(".pick"); if (!b) return;
  legSelected = b.dataset.name;
  renderLegPicker(); renderLegDetail();
  $("#legDetail").scrollIntoView({ behavior: "smooth", block: "nearest" });
});
["#legSearch", "#legStatus", "#legBiome"].forEach(s => $(s).addEventListener("input", renderLegPicker));

/* ---------- FAQ + series guide ---------- */
function faqFilter(listSel, searchSel, emptySel) {
  const q = $(searchSel).value.trim().toLowerCase();
  let n = 0;
  document.querySelectorAll(listSel + " details.faq").forEach(d => {
    const hit = !q || d.textContent.toLowerCase().includes(q);
    d.hidden = !hit; if (hit) n++;
    if (q && hit) d.open = true;
  });
  $(emptySel).hidden = n > 0 || !q;
}
function renderFaq(list, listSel, searchSel, emptySel) {
  $(listSel).innerHTML = list.map(f => `
    <details class="faq"><summary>${esc(f.q)}</summary><div class="faq-body">${clean(f.a)}</div></details>`).join("");
  faqFilter(listSel, searchSel, emptySel);
}
[["#faqSearch", "#faqList", "#faqEmpty"], ["#obFaqSearch", "#obFaqList", "#obFaqEmpty"]]
  .forEach(([s, l, m]) => $(s).addEventListener("input", () => faqFilter(l, s, m)));

function renderSeries() {
  $("#seriesList").innerHTML = DB.czSeries.map(sr => `
    <div class="series-col">
      <h3>${clean(sr.name)}</h3>
      <table>
        <thead><tr><th>Trainer name</th><th>Signature item</th></tr></thead>
        <tbody>${sr.rows.map(r => `<tr><td>${clean(r[0])}</td><td>${clean(r[1])}</td></tr>`).join("")}</tbody>
      </table>
    </div>`).join("");
}

/* ---------- rules + votes ---------- */
function renderRules() {
  $("#rulesList").innerHTML = DB.siteRules.map(r => `
    <li><div><h3>${esc(r.title)}</h3><p>${clean(r.text)}</p></div></li>`).join("");
}
function renderVotes() {
  $("#votesList").innerHTML = DB.siteVotes.map(v => {
    const url = safeUrl(v.url);
    return `<article class="vote">
      <h3>${esc(v.name)}</h3>
      <p>${esc(v.reward || "")}</p>
      <a class="btn" href="${esc(url)}" data-vote ${url !== "#" ? 'target="_blank" rel="noopener"' : ""}>Vote now</a>
    </article>`;
  }).join("");
}

/* ---------- store ---------- */
const PLAN_COLORS = ["dahlia", "hibiscus", "sakura"];
function renderStore() {
  $("#plans").innerHTML = DB.sitePlans.map(p => `
    <article class="plan ${PLAN_COLORS.includes(p.id) ? p.id : "sakura"}">
      <div class="plan-head">
        <h3>${esc(p.name)}</h3>
        <div class="plan-price">${esc(CONFIG.currency)}${esc(p.price)}<small> one-time</small></div>
      </div>
      <div class="plan-body">
        <h4>${esc(p.name)} Rank</h4>
        <ul class="perks">${(p.perks || []).map(x => `<li>${clean(x)}</li>`).join("")}</ul>
        <button class="buy" type="button" data-plan="${esc(p.name)}">Buy Now</button>
      </div>
    </article>`).join("");
  $("#payList").innerHTML = DB.sitePayments.map(p => `<span class="pay-chip">${p.logo
    ? `<img src="${esc(safeUrl(p.logo, ""))}" alt="">`
    : `<i style="background:${safeColor(p.color)}">${esc((p.name || "?")[0])}</i>`}${esc(p.name)}</span>`).join("");
}

document.addEventListener("click", e => {
  const b = e.target.closest(".buy");
  if (b) {
    $("#buyPlan").textContent = b.dataset.plan + " rank";
    $("#buyDiscord").href = CONFIG.discordURL;
    $("#buyModal").classList.add("open");
  }
  if (e.target.id === "buyModal" || e.target.closest("#buyClose")) $("#buyModal").classList.remove("open");
  const v = e.target.closest("[data-vote]");
  if (v && v.getAttribute("href") === "#") {
    e.preventDefault();
    toast("This vote link isn't set up yet.");
  }
});
document.addEventListener("keydown", e => { if (e.key === "Escape") $("#buyModal").classList.remove("open"); });

/* ---------- render everything ---------- */
function renderAll() {
  renderNews();
  renderRules(); renderVotes(); renderStore();
  renderTeam();
  renderAbout(DB.czAbout, "#czLead", "#czAbout");
  renderAbout(DB.obAbout, "#obLead", "#obAbout");
  renderSpawns(); renderLegPicker(); renderLegDetail();
  renderFeatureLists();
  renderFaq(DB.czFaqs, "#faqList", "#faqSearch", "#faqEmpty");
  renderFaq(DB.obFaqs, "#obFaqList", "#obFaqSearch", "#obFaqEmpty");
  renderSeries();
}

/* ---------- navigation: dropdown groups + view switching ---------- */
const groups = [...document.querySelectorAll(".nav-group")];
function setGroup(g, open) {
  g.classList.toggle("open", open);
  g.querySelector(".nav-parent").setAttribute("aria-expanded", open);
}
groups.forEach(g => g.querySelector(".nav-parent").addEventListener("click", () => setGroup(g, !g.classList.contains("open"))));

const views = ["home", "cozymon-about", "cozymon-features", "cozymon-faq", "spawns", "legendaries",
               "oneblock-about", "oneblock-features", "oneblock-faq", "admin", "rules", "vote", "store"];
const ALIASES = { features: "cozymon-features", faq: "cozymon-faq", about: "cozymon-about" }; // old links still work

function show(name) {
  let anchor = null;
  if (name === "whitelist") { anchor = "whitelist"; name = "home"; }
  name = ALIASES[name] || name;
  if (!views.includes(name) || (!CONFIG.oneblockEnabled && name.startsWith("oneblock"))) name = "home";
  views.forEach(v => $("#" + v).classList.toggle("active", v === name));
  document.querySelectorAll("#nav a[data-view]").forEach(a => a.classList.toggle("active", a.dataset.view === name));
  groups.forEach(g => {
    const has = !!g.querySelector(`a[data-view="${name}"]`);
    g.classList.toggle("has-active", has);
    if (has) setGroup(g, true);
  });
  if (name === "admin") renderAdmin();
  if (anchor) $("#" + anchor).scrollIntoView(); else window.scrollTo(0, 0);
  document.body.classList.remove("menu-open");
  $("#menuBtn").setAttribute("aria-expanded", "false");
  $("#buyModal").classList.remove("open");
}
window.addEventListener("hashchange", () => show(location.hash.slice(1)));

/* ---------- mobile menu ---------- */
$("#menuBtn").addEventListener("click", () => {
  const open = document.body.classList.toggle("menu-open");
  $("#menuBtn").setAttribute("aria-expanded", open);
});
$("#scrim").addEventListener("click", () => document.body.classList.remove("menu-open"));

/* ---------- theme toggle (remembered per visitor) ---------- */
try { const t = localStorage.getItem("floreon-theme"); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
$("#themeBtn").addEventListener("click", () => {
  const root = document.documentElement;
  const dark = root.dataset.theme === "dark" ||
    (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset.theme = dark ? "light" : "dark";
  try { localStorage.setItem("floreon-theme", root.dataset.theme); } catch (e) {}
});
