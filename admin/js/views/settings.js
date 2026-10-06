// Site settings: name, tagline, Discord link, logos, currency, banner timing, footer.
import { contentEditor } from "../lib/editor.js";

const FIELDS = [
  { k: "serverName", label: "Server name", max: 40, help: "Shown in the sidebar and browser tab" },
  { k: "tagline", label: "Tagline", type: "textarea", rows: 2, help: "The line under the logo on the home banner" },
  { k: "discordURL", label: "Discord invite link", placeholder: "https://discord.gg/…", help: "Used by every “Join Discord” button and the Discord menu link. Set the invite to never expire in Discord." },
  { k: "logo", label: "Flower logo", type: "image", folder: "banners", help: "Square logo in the sidebar and browser tab" },
  { k: "wordLogo", label: "Word logo", type: "image", folder: "banners", help: "The “floreon” logo on the home banner" },
  { k: "currency", label: "Currency symbol", max: 4, help: "Shown before store prices, e.g. ₱" },
  { k: "heroSeconds", label: "Seconds per banner picture", type: "number", min: 2, max: 30 },
  { k: "footer", label: "Footer text", max: 160 }
];

export function renderSettings(root) {
  return contentEditor(root, {
    title: "Settings", lead: "Things used all over the site.",
    key: "siteSettings",
    fallback: { serverName: "Floreon", tagline: "", discordURL: "", currency: "₱", logo: "/images/floreon-logo.webp", wordLogo: "/images/floreon-word.webp", heroInterval: 6000, footer: "" },
    fields: () => FIELDS,
    savedText: "Settings saved.",
    // the banner timing is stored in milliseconds but edited in seconds
    toForm: v => { const { heroInterval, ...rest } = v; return { ...rest, heroSeconds: Math.round((heroInterval || 6000) / 1000) }; },
    prepare: v => {
      const { heroSeconds, ...rest } = v;
      return { ...rest, serverName: (v.serverName || "").trim(), discordURL: (v.discordURL || "").trim(),
               heroInterval: Math.round((Number(heroSeconds) || 6) * 1000) };
    },
    validate: v => {
      if (!v.serverName) return "The server name can't be empty.";
      if (v.discordURL && !/^https:\/\/(discord\.gg|discord\.com\/invite)\/[\w-]+$/i.test(v.discordURL)) return "The Discord link should look like https://discord.gg/abc123";
      if (v.heroInterval < 2000 || v.heroInterval > 30000) return "Seconds per banner picture should be between 2 and 30.";
    }
  });
}
