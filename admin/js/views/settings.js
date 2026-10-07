// Site settings: name, tagline, Discord link, logos, currency, banner timing, footer and social links.
import { contentEditor } from "../lib/editor.js";

const FIELDS = [
  { k: "serverName", label: "Server name", max: 40, help: "Shown in the sidebar and browser tab" },
  { k: "tagline", label: "Tagline", type: "textarea", rows: 2, help: "The line under the logo on the home banner" },
  { k: "discordURL", label: "Discord invite link", placeholder: "https://discord.gg/…", help: "Used by every “Join Discord” button and the Discord menu link. Set the invite to never expire in Discord." },
  { k: "logo", label: "Flower logo", type: "image", folder: "banners", help: "Square logo in the sidebar and browser tab" },
  { k: "wordLogo", label: "Word logo", type: "image", folder: "banners", help: "The “floreon” logo on the home banner" },
  { k: "currency", label: "Currency symbol", max: 4, help: "Shown before store prices, e.g. ₱" },
  { k: "heroSeconds", label: "Seconds per banner picture", type: "number", min: 2, max: 30 },
  { type: "note", html: "<strong>Footer</strong> at the bottom of every page. The end year updates by itself." },
  { k: "copyrightOwner", label: "Copyright name", max: 60, placeholder: "Complex Gaming" },
  { k: "copyrightStart", label: "Copyright start year", type: "number", min: 1990, max: 2100 },
  { k: "disclaimer", label: "Disclaimer line", max: 160, placeholder: "We are not affiliated with Mojang AB." },
  { k: "tiktokURL", label: "TikTok link", placeholder: "https://www.tiktok.com/@…", help: "Leave a link empty to hide its button" },
  { k: "youtubeURL", label: "YouTube link", placeholder: "https://www.youtube.com/@…" },
  { k: "facebookURL", label: "Facebook link", placeholder: "https://www.facebook.com/…" },
  { k: "instagramURL", label: "Instagram link", placeholder: "https://www.instagram.com/…" },
  { k: "xURL", label: "X (Twitter) link", placeholder: "https://x.com/…" },
  { k: "showDiscordInFooter", label: "Also show a Discord button in the footer", type: "toggle" }
];
const SOCIAL_KEYS = ["tiktokURL", "youtubeURL", "facebookURL", "instagramURL", "xURL"];

export function renderSettings(root) {
  return contentEditor(root, {
    title: "Settings", lead: "Things used all over the site.",
    key: "siteSettings",
    fallback: { serverName: "Floreon", tagline: "", discordURL: "", currency: "₱", logo: "/images/floreon-logo.webp", wordLogo: "/images/floreon-word.webp", heroInterval: 6000,
      copyrightOwner: "Complex Gaming", copyrightStart: 2016, disclaimer: "We are not affiliated with Mojang AB." },
    fields: () => FIELDS,
    savedText: "Settings saved.",
    // the banner timing is stored in milliseconds but edited in seconds
    toForm: v => {
      const { heroInterval, footer, ...rest } = v; // "footer" was the old single footer line
      return { copyrightOwner: "Complex Gaming", copyrightStart: 2016, disclaimer: "We are not affiliated with Mojang AB.",
               ...rest, heroSeconds: Math.round((heroInterval || 6000) / 1000) };
    },
    prepare: v => {
      const { heroSeconds, ...rest } = v;
      SOCIAL_KEYS.forEach(k => { rest[k] = String(rest[k] || "").trim(); });
      return { ...rest, serverName: (v.serverName || "").trim(), discordURL: (v.discordURL || "").trim(),
               copyrightOwner: String(v.copyrightOwner || "").trim(), disclaimer: String(v.disclaimer || "").trim(),
               copyrightStart: parseInt(v.copyrightStart, 10) || null,
               heroInterval: Math.round((Number(heroSeconds) || 6) * 1000) };
    },
    validate: v => {
      if (!v.serverName) return "The server name can't be empty.";
      if (v.discordURL && !/^https:\/\/(discord\.gg|discord\.com\/invite)\/[\w-]+$/i.test(v.discordURL)) return "The Discord link should look like https://discord.gg/abc123";
      if (v.heroInterval < 2000 || v.heroInterval > 30000) return "Seconds per banner picture should be between 2 and 30.";
      const bad = SOCIAL_KEYS.find(k => v[k] && !/^https:\/\/[^\s]+\.[^\s]+/i.test(v[k]));
      if (bad) return "Social links should be full web addresses starting with https://";
      if (v.copyrightStart && v.copyrightStart > new Date().getFullYear()) return "The copyright start year can't be in the future.";
    }
  });
}
