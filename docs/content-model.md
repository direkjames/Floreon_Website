# Floreon content model

This is the contract between the **admin site** (writes) and the **public site** (reads).
Both must follow it. If you add a new block type, add it here first.

All data lives in Supabase:

| Where | What |
|---|---|
| `pages` table | Every page: `slug`, `title`, `description`, `published`, `blocks` |
| `content` table, key `siteSettings` | Server name, tagline, Discord link, logos, currency, banner timing |
| `content` table, key `siteNav` | The sidebar menu |
| `content` table, keys `siteTeam`, `sitePlans`, `sitePayments`, `czSpawns`, `czLegendaries` | Shared lists used by the matching blocks |
| `posts` table | News posts |
| `media` table + `site-images` bucket | Uploaded images |
| `edit_history` table | Old versions of pages and content (filled automatically) |

---

## Pages

| Field | Notes |
|---|---|
| `slug` | Web address without the leading slash. `home` is `/`. Lowercase letters, numbers and dashes, with `/` for sub-pages: `cozymon/faq` is `/cozymon/faq`. |
| `title` | Shown in the browser tab: `Title – Floreon`. |
| `description` | Shown in Google and Discord previews. |
| `published` | `false` = draft, only staff can see it. |
| `blocks` | Array of blocks, rendered top to bottom. |

## Blocks

Every block is an object with a unique `id` (short random string) and a `type`.
Optional on every block: `anchor` (lets links like `/#whitelist` jump to it), `hidden` (true = skip it without deleting).

The admin site's block catalog lives in `admin/js/lib/blocks.js`; keep it in step with this table.

Text fields marked **HTML** allow simple formatting (`<p> <strong> <em> <a> <ul> <ol> <li> <code> <br> <img>`). The public site cleans them with DOMPurify.

| type | Fields | Renders as |
|---|---|---|
| `hero` | `size` (`large`/`small`), `logo` (bool: show the word logo), `title`, `subtitle`, `images` (array of image URLs; empty = built-in pixel scenes), `petals` (bool) | Banner with slideshow |
| `heading` | `eyebrow`, `title`, `lead`, `align` (`left`/`center`) | Section title with intro line |
| `text` | `html` (**HTML**), `card` (bool: put it in a white card) | Rich text |
| `image` | `url`, `alt`, `caption`, `size` (`normal`/`wide`/`full`) | One picture |
| `gallery` | `images`: `[{ url, alt, caption }]` | Picture grid with zoom |
| `cards` | `style` (`flowers`/`links`), `search` (bool), `items`: `[{ name, text, chips[], url, color (sakura/dahlia/hibiscus/moss) }]` | Feature cards (`flowers`) or gamemode link cards (`links`) |
| `steps` | `items`: `[{ title, text (HTML) }]` | Numbered steps |
| `faq` | `search` (bool), `items`: `[{ q, a (HTML) }]` | Fold-out questions |
| `tables` | `columns` (header labels), `tables`: `[{ name, rows: [[cell, cell]] }]` | Tables side by side (e.g. the series guide) |
| `buttons` | `align`, `items`: `[{ label, url, style (primary/ghost), discord (bool: use the Discord link from settings) }]` | Row of buttons |
| `rules` | `items`: `[{ title, text (HTML) }]` | Numbered rule list |
| `votes` | `items`: `[{ name, reward, url }]` (empty `url` = not ready yet) | Vote site cards |
| `news` | `limit` (posts shown before "Show older") | Latest news posts |
| `team` | none, uses `siteTeam` | Team members by row |
| `store` | `note`, `title`, `lead`, uses `sitePlans` + `sitePayments` | Rank cards, buy popup, payment chips |
| `spawns` | none, uses `czSpawns` | Searchable spawn cards |
| `legendaries` | none, uses `czLegendaries` | Legendary picker + details |

## Shared lists (`content` table)

- `siteTeam`: `[{ name, role, row, mc?, head? }]`. `row` groups members into lines; `mc` = Minecraft username for the skin; `head` = custom image URL.
- `sitePlans`: `[{ id (dahlia/hibiscus/sakura or a hex color), name, price, perks[] (HTML) }]`
- `sitePayments`: `[{ name, color, logo }]`
- `czSpawns`: `[{ name, kind (paradox/ultra), cond[], biomes[], blocks[] }]`
- `czLegendaries`: `[{ name, structure (bool), paras[] (HTML), images[], cond[], biomes[], blocks[] }]`

## `siteSettings`

```json
{
  "serverName": "Floreon",
  "tagline": "A cozy Minecraft community…",
  "discordURL": "https://discord.gg/…",
  "currency": "₱",
  "logo": "/images/floreon-logo.webp",
  "wordLogo": "/images/floreon-word.webp",
  "heroInterval": 6000,
  "footer": "Not affiliated with Mojang or Microsoft."
}
```

## `siteNav`

An array of menu items, top to bottom:

```json
[
  { "type": "page",  "slug": "home", "label": "Home", "icon": "home" },
  { "type": "group", "label": "Cozymon", "icon": "ball", "children": [
      { "type": "page", "slug": "cozymon", "label": "About" }
  ]},
  { "type": "link",  "label": "Discord", "icon": "chat", "url": "discord" }
]
```

- `type`: `page` (links to a page by slug), `group` (fold-out with `children`), `link` (any URL; `"discord"` means the Discord link from settings).
- `icon`: one of `home`, `ball`, `cube`, `rules`, `heart`, `chat`, `bag`, `star`, `image`, `info`, `calendar`, `users`.
- Pages that aren't in the menu still work by address; they just aren't listed.
