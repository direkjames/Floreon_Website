// Every block type the page builder offers. Must match docs/content-model.md and the public site renderer.
// fields: what the editor shows. make(): a new block's starting values. summary(b): one line shown on the collapsed block.
const strip = h => String(h ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const ALIGN = [["left", "Left"], ["center", "Centered"]];
const count = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const sectionLink = (route, label) => ({ type: "note", html: `The content comes from <a href="#/${route}">${label}</a> in the sidebar. This block only places it on the page.` });

export const BLOCKS = {
  hero: {
    label: "Banner", icon: "image", group: "Layout",
    text: "Big picture slideshow with the logo or a title.",
    make: () => ({ size: "large", logo: true, title: "", subtitle: "", images: [], petals: true }),
    summary: b => [b.size === "small" ? "Small banner" : "Large banner", b.logo ? "with logo" : b.title, count((b.images || []).length, "picture")].filter(Boolean).join(", "),
    fields: [
      { k: "size", label: "Size", type: "select", options: [["large", "Large (home page)"], ["small", "Small (section pages)"]] },
      { k: "logo", label: "Show the Floreon word logo", type: "toggle" },
      { k: "title", label: "Title", help: "Shown when the logo is off" },
      { k: "subtitle", label: "Subtitle" },
      { k: "images", label: "Slideshow pictures", type: "images", folder: "banners", help: "Leave empty for the built-in pixel scenes" },
      { k: "petals", label: "Falling petals", type: "toggle" }
    ]
  },
  heading: {
    label: "Heading", icon: "pages", group: "Text",
    text: "Section title with an optional intro line.",
    make: () => ({ eyebrow: "", title: "New section", lead: "", align: "left" }),
    summary: b => b.title || "(no title)",
    fields: [
      { k: "title", label: "Title" },
      { k: "lead", label: "Intro line", type: "textarea", rows: 2 },
      { k: "eyebrow", label: "Small label above the title", help: "Optional, e.g. Cozymon" },
      { k: "align", label: "Alignment", type: "select", options: ALIGN }
    ]
  },
  text: {
    label: "Text", icon: "rules", group: "Text",
    text: "Paragraphs with bold, links, lists and pictures.",
    make: () => ({ html: "<p></p>", card: false }),
    summary: b => strip(b.html).slice(0, 80) || "(empty)",
    fields: [
      { k: "html", label: "Text", type: "richtext" },
      { k: "card", label: "Show inside a white card", type: "toggle" }
    ]
  },
  image: {
    label: "Picture", icon: "image", group: "Media",
    text: "One picture with an optional caption.",
    make: () => ({ url: "", alt: "", caption: "", size: "normal" }),
    summary: b => b.caption || b.alt || (b.url ? "Picture" : "(no picture chosen)"),
    fields: [
      { k: "url", label: "Picture", type: "image", folder: "pages" },
      { k: "alt", label: "Description", help: "For screen readers" },
      { k: "caption", label: "Caption" },
      { k: "size", label: "Width", type: "select", options: [["normal", "Normal"], ["wide", "Wide"], ["full", "Full width"]] }
    ]
  },
  gallery: {
    label: "Gallery", icon: "image", group: "Media",
    text: "A grid of pictures that open bigger when clicked.",
    make: () => ({ images: [] }),
    summary: b => count((b.images || []).length, "picture"),
    fields: [
      { k: "images", label: "Pictures", type: "repeater", itemName: "picture", summary: "caption", fields: [
        { k: "url", label: "Picture", type: "image", folder: "pages" },
        { k: "caption", label: "Caption" },
        { k: "alt", label: "Description", help: "For screen readers" }
      ]}
    ]
  },
  cards: {
    label: "Cards", icon: "card", group: "Lists",
    text: "Feature cards with flowers, or big link cards like “Pick a gamemode”.",
    make: () => ({ style: "flowers", search: false, items: [] }),
    summary: b => `${b.style === "links" ? "Link cards" : "Feature cards"}, ${count((b.items || []).length, "card")}`,
    fields: [
      { k: "style", label: "Style", type: "select", options: [["flowers", "Feature cards with pixel flowers"], ["links", "Big link cards"]] },
      { k: "search", label: "Show a search box", type: "toggle" },
      { k: "items", label: "Cards", type: "repeater", itemName: "card", summary: "name", fields: [
        { k: "name", label: "Title" },
        { k: "text", label: "Description", type: "textarea", rows: 2 },
        { k: "chips", label: "Tags", type: "tags", help: "Optional, separate with commas" },
        { k: "url", label: "Link", help: "Only for link cards, e.g. /cozymon" },
        { k: "color", label: "Accent color", type: "select", options: [["sakura", "Pink"], ["dahlia", "Purple"], ["hibiscus", "Coral"], ["moss", "Green"]] }
      ]}
    ]
  },
  steps: {
    label: "Steps", icon: "menu", group: "Lists",
    text: "Numbered steps, like “How to get whitelisted”.",
    make: () => ({ items: [] }),
    summary: b => count((b.items || []).length, "step"),
    fields: [
      { k: "items", label: "Steps", type: "repeater", itemName: "step", summary: "title", fields: [
        { k: "title", label: "Title" },
        { k: "text", label: "Text", type: "richtext" }
      ]}
    ]
  },
  faq: {
    label: "FAQ", icon: "info", group: "Lists",
    text: "Questions that fold open, with search.",
    make: () => ({ search: true, items: [] }),
    summary: b => count((b.items || []).length, "question"),
    fields: [
      { k: "search", label: "Show a search box", type: "toggle" },
      { k: "items", label: "Questions", type: "repeater", itemName: "question", summary: "q", fields: [
        { k: "q", label: "Question" },
        { k: "a", label: "Answer", type: "richtext", help: "Use “Picture” to add screenshots" }
      ]}
    ]
  },
  tables: {
    label: "Tables", icon: "menu", group: "Lists",
    text: "One or more tables side by side, like the series guide.",
    make: () => ({ columns: ["Name", "Details"], tables: [] }),
    summary: b => count((b.tables || []).length, "table"),
    fields: [
      { k: "columns", label: "Column headings", type: "tags" },
      { k: "tables", label: "Tables", type: "repeater", itemName: "table", summary: "name", fields: [
        { k: "name", label: "Table title" },
        { k: "rows", label: "Rows", type: "lines", rows: 12, help: "One row per line, cells separated by |", placeholder: "Gym Leader Roark | Smooth Rock" }
      ]}
    ]
  },
  buttons: {
    label: "Buttons", icon: "external", group: "Layout",
    text: "One or more buttons, e.g. “Join Discord and apply”.",
    make: () => ({ align: "left", items: [{ label: "Join our Discord", url: "", style: "primary", discord: true }] }),
    summary: b => (b.items || []).map(i => i.label).join(", ") || "(no buttons)",
    fields: [
      { k: "align", label: "Alignment", type: "select", options: ALIGN },
      { k: "items", label: "Buttons", type: "repeater", itemName: "button", summary: "label", fields: [
        { k: "label", label: "Text" },
        { k: "discord", label: "Go to our Discord (uses the link from Settings)", type: "toggle" },
        { k: "url", label: "Link", help: "Ignored when the Discord option is on. e.g. /rules or https://…" },
        { k: "style", label: "Style", type: "select", options: [["primary", "Pink"], ["ghost", "Outline"]] }
      ]}
    ]
  },
  rules: {
    label: "Rules", icon: "rules", group: "Lists",
    text: "Numbered rules with a short explanation each.",
    make: () => ({ items: [] }),
    summary: b => count((b.items || []).length, "rule"),
    fields: [
      { k: "items", label: "Rules", type: "repeater", itemName: "rule", summary: "title", fields: [
        { k: "title", label: "Rule" },
        { k: "text", label: "Explanation", type: "richtext" }
      ]}
    ]
  },
  votes: {
    label: "Vote sites", icon: "heart", group: "Lists",
    text: "Cards with a “Vote now” button for each site.",
    make: () => ({ items: [] }),
    summary: b => count((b.items || []).length, "site"),
    fields: [
      { k: "items", label: "Vote sites", type: "repeater", itemName: "site", summary: "name", fields: [
        { k: "name", label: "Site name" },
        { k: "reward", label: "Reward" },
        { k: "url", label: "Vote link", help: "Leave empty while it isn't ready" }
      ]}
    ]
  },
  news: {
    label: "Latest news", icon: "news", group: "Site parts",
    text: "The newest posts, with “Show older posts”.",
    make: () => ({ limit: 3 }),
    summary: b => `Shows ${b.limit || 3} posts at a time`,
    fields: [{ k: "limit", label: "Posts shown at first", type: "number", min: 1, max: 20 }, sectionLink("news", "News")]
  },
  team: {
    label: "Team", icon: "users", group: "Site parts",
    text: "Staff members with their Minecraft heads.",
    make: () => ({}), summary: () => "Staff list",
    fields: [sectionLink("team", "Team")]
  },
  store: {
    label: "Store", icon: "store", group: "Site parts",
    text: "Rank cards, the “How to buy” popup and payment methods.",
    make: () => ({ title: "Choose your rank", lead: "", note: "" }),
    summary: b => b.title || "Store",
    fields: [
      { k: "title", label: "Title" },
      { k: "lead", label: "Intro", type: "textarea", rows: 3 },
      { k: "note", label: "Small note under the ranks" },
      { type: "note", html: 'Ranks and perks are edited in <a href="#/store">Store ranks</a>; payment options in <a href="#/payments">Payment methods</a>.' }
    ]
  },
  spawns: {
    label: "Spawns", icon: "ball", group: "Site parts",
    text: "Searchable Paradox and Ultra Beast spawn cards.",
    make: () => ({}), summary: () => "Spawn finder",
    fields: [sectionLink("spawns", "Spawns")]
  },
  legendaries: {
    label: "Legendaries", icon: "star", group: "Site parts",
    text: "Legendary picker with how to get each one.",
    make: () => ({}), summary: () => "Legendary guide",
    fields: [sectionLink("legendaries", "Legendaries")]
  }
};

export const BLOCK_GROUPS = ["Text", "Media", "Lists", "Layout", "Site parts"];

// Fields every block has, tucked under "More options"
export const COMMON_FIELDS = [
  { k: "anchor", label: "Jump link name", help: "Lets links like /#whitelist jump straight here. Lowercase letters and dashes.", max: 40 },
  { k: "hidden", label: "Hide this block on the site (keeps it saved here)", type: "toggle" }
];

export const blockId = () => "b" + Math.random().toString(36).slice(2, 8);
export function newBlock(type) {
  return { id: blockId(), type, ...BLOCKS[type].make() };
}
