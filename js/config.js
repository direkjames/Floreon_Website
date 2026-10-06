/* =====================================================
   FLOREON SITE CONTENT + SETTINGS
   This is the starting content. Once Supabase is connected, anything
   saved in the admin panel replaces the matching section below.
   ===================================================== */
const CONFIG = {
  serverName: "Floreon",
  tagline: "A cozy Minecraft community for building, exploring, and making friends.",
  serverIP: "play.yourserver.net",
  discordURL: "https://discord.gg/your-invite",
  modpackURL: "",             // link to your modpack download (shown in step 3 of the whitelist guide)
  currency: "₱",
  // Hero carousel pictures. Add your own screenshots, e.g. ["images/spawn.jpg", "images/spring.jpg"]
  // Leave [] to use the 3 built-in pixel scenes (day, sunset, night)
  heroImages: [],
  czHeroImages: [],           // Cozymon banner pictures (leave [] for the built-in pixel scenes)
  obHeroImages: [],           // Oneblock banner pictures
  heroInterval: 6000,         // milliseconds per picture
  oneblockEnabled: false      // set to true when the Oneblock pages are ready to show
};

/* Supabase connection. Find both values in Supabase: Project Settings > API Keys.
   The "publishable" key (starts with sb_publishable_) is SAFE to put here: it is public
   by design, and the database security rules (supabase/schema.sql) decide what it can do.
   A legacy "anon" key also works here.
   NEVER put the "secret" key (sb_secret_...) or the legacy "service_role" key in this file.
   Leave the key empty to run the site with the built-in content below (no admin saving). */
const SUPABASE = {
  url: "https://wvsjszvoengmjhnrksxw.supabase.co",
  publishableKey: "sb_publishable_Lb_s7UI4vUOWOLqg3ZftTA_qf6Y3gi-",
  imageBucket: "site-images"
};

/* Each inner array is ONE ROW on the page.
   Row 1: owner + developer, row 2: moderators, and so on. Add/remove rows freely. */
const TEAM = [
  [
    { name: "YourName",   role: "Owner" },
    { name: "DevName",    role: "Developer" }
  ],
  [
    { name: "AdminName",  role: "Admin" },
    { name: "Mod1",       role: "Moderator" },
    { name: "Mod2",       role: "Moderator" }
  ],
  [
    { name: "Helper1",    role: "Helper" },
    { name: "Helper2",    role: "Helper" },
    { name: "Helper3",    role: "Helper" }
  ],
  [
    { name: "Trial1",     role: "Trial Helper" },
    { name: "Trial2",     role: "Trial Helper" },
    { name: "Trial3",     role: "Trial Helper" },
    { name: "Trial4",     role: "Trial Helper" }
  ],
  [
    { name: "EventsName", role: "Events Manager" }
  ]
];
// "name" is shown on the card AND used as the Minecraft username to fetch the skin head.
// Different display name? add  mc: "ActualMinecraftName".
// Prefer your own image file? add  head: "heads/yourname.png".

/* ---------------- COZYMON ---------------- */
const COZYMON = {
  lead: "Our Cobblemon survival server. Catch, train, and battle Pokémon while you build your dream home.",
  about: [
    "Cozymon is a <strong>Cobblemon</strong> server built around a relaxed pace. There's a level cap that rises as you beat trainers, legendaries you can hunt, a casino, a player economy, and plenty of events.",
    "New here? Head to the home page to see how to get whitelisted, then check the <strong>Features</strong> and <strong>FAQs</strong> pages to get started."
  ]
};

const MODS = [
  { name: "Simple Voice Chat", text: "Talk to nearby players with proximity voice chat." },
  { name: "Dream Display",     text: "Create in-game screens to stream your favorite videos in Minecraft." },
  { name: "Cobblemon",         text: "Catch, train, and battle Pokémon in Minecraft." },
  { name: "Battle Tower",      text: "Cobblemon add-on: a tower of battles to test your team." },
  { name: "Cobblemon Booster Packs", text: "Cobblemon add-on with booster packs to open." },
  { name: "Global Trading System", text: "Trade Pokémon with other players on the server." },
  { name: "Trowel",            text: "A very small QoL mod to make placing random blocks less tedious." },
  { name: "Dynamax",           text: "Cobblemon add-on: Dynamax battles." },
  { name: "Mega Evolution",    text: "Cobblemon add-on: Mega Evolution in battle." },
  { name: "Photography",       text: "Take pictures in game using a functional camera." },
  { name: "Delight mods",      text: "Cooking and farming add-ons with lots of new food.",
    chips: ["Farmer's", "Flora", "End", "Ube", "Vegan"] },
  { name: "Yuushya Townscape", text: "A powerful Minecraft mod and resource pack combination designed to help players build detailed, realistic, and lively towns, cozy houses, and intricate streetscapes." },
  { name: "Waystone",          text: "Fast travel between waystones." },
  { name: "Lootr",             text: "Every player gets their own loot from chests." },
  { name: "Emotecraft",        text: "Play custom emotes and animations." },
  { name: "Kaleidoscope",      text: "Adds immersive cooking and tavern experience systems." },
  { name: "Macaw's Furniture", text: "Furniture for decorating your home." },
  { name: "Sophisticated Backpack", text: "Upgradeable backpacks for extra storage." },
  { name: "Grave",             text: "A death chest. When you die, your items are stored in a grave so you can go back and get them." },
  { name: "And more!",         text: "We add new mods over time. Check Discord for updates." }
];

// Resource pack order for the FAQ (top to bottom). Example: ["Floreon Pack", "Cobblemon Pack"]
const RESOURCE_PACKS = [];

/* Reference picture under each FAQ paragraph.
   IMG()                       -> shows a placeholder box for now
   IMG("images/trainer.png")   -> replace with your real picture later */
const IMG = (src = "", alt = "Reference picture") => src
  ? `<img class="ref" src="${src}" alt="${alt}" loading="lazy">`
  : `<div class="ph"><div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 9"/></svg>Image placeholder<br><small>Reference picture goes here</small></div></div>`;

const FAQS = [
  { q: "How to locate Trainers?", a: `
    <p>You can locate trainers by exploring the world. You will see a small arrow in your Trainer Card when you hold it.</p>${IMG()}
    <p>You can also spawn trainers using their signature item, which you can find in your Trainer Card. Explore the world and wait for them to spawn around you, or spawn them with a Trainer Spawner and their signature item.</p>${IMG()}` },
  { q: "How to fix my Resource Pack?", a: `
    <p>If your game crashed and you only see a substitute dummy (a brown stuffed toy), it means all your resource packs got disabled. Just put them back in the order below so the server textures don't bug out.</p>${IMG()}
    ${RESOURCE_PACKS.length ? "<ol>" + RESOURCE_PACKS.map(x => `<li>${x}</li>`).join("") + "</ol>" : ""}` },
  { q: "How to progress?", a: `
    <p>To increase your Pokémon's level cap, you should defeat trainers in your series. Don't have a series yet? Go to <code>/warp tp Series</code> to exchange your Trainer Card for a series. Pick between Brilliant Diamond or Radical Red. The series guide at the bottom of this page lists every trainer.</p>${IMG()}` },
  { q: "How to earn Money?", a: `
    <p>Just like in the regular games, the money on the server is called Pokémon Dollars (or PokéDollars). Here's how you can make some cash in Floreon:</p>${IMG()}
    <ul>
      <li>Sell items to the CobbleMerchant</li>
      <li>Beat trainers in battles</li>
      <li>Find them in crates</li>
      <li>Win at the Casino (<code>/warp tp Casino</code>)</li>
      <li>Send your Pokémon on an expedition</li>
    </ul>` },
  { q: "How to sell items?", a: `
    <p>You can sell items to any CobbleMerchant on the server. There's one over at <code>/warp tp Shop</code>, or you can make your own by putting a Display Case near a Villager to give them the job.</p>${IMG()}
    <p>To sell your stuff, just click on a CobbleMerchant and hit the Bank button under your inventory. This switches the menu over to the selling screen, where you can drop in whatever you want to sell!</p>${IMG()}` },
  { q: "How to create a Claim?", a: `
    <p>To claim land, you'll need a Golden Hoe. If you ever want to check who owns a specific spot, just right-click the area with a stick. You'll also get more claim blocks automatically just by playing and staying online!</p>${IMG()}` },
  { q: "How do I add someone to a claim?", a: `
    <p>To give a friend permission in your claim, type <code>/flan menu</code>, click "Edit permission group," and left-click the paper that says "Trusted." After that, click the Anvil and type in their player name.</p>${IMG()}` },
  { q: "How to create a Chest Shop?", a: `
    <p>You can create a chest shop by right-clicking a chest with a paper.</p>${IMG()}
    <ul>
      <li>The shop type is from a customer's perspective! BUY means your customers can buy from your shop, SELL means your customers can sell their items to your shop.</li>
      <li>For a SELL shop, you must allocate a budget so as to not drain your entire balance. You must already have the amount to deposit when creating the shop.</li>
      <li>Destroying the sign or chest will remove the shop. Any sell budget will be added to your claimable balance in <code>/chestshop</code>.</li>
      <li>Use <code>/chestshop</code> to check all your shop locations, claim your sales, and see your remaining budget.</li>
      <li>You must have Flan <code>open container</code> permission in the area to create a shop.</li>
    </ul>` }
];

const SERIES = [
  { name: "Brilliant Diamond / Shining Pearl", rows: [
    ["Gym Leader Roark","Smooth Rock"],["Commander Mars","Wide Lens"],["Commander Jupiter","Scope Lens"],
    ["Gym Leader Gardenia","Sunflower"],["Pokemon Trainer Cedric","Everstone"],["Gym Leader Maylene","Black Belt"],
    ["Gym Leader Wake","Nautilus Shell"],["Pokemon Trainer Cedric","Eviolite"],["Gym Leader Fantina","Ender Eye"],
    ["Pokemon Trainer Cedric","Dawn Stone"],["Gym Leader Byron","Metal Coat"],["Commander Saturn","Zoom Lens"],
    ["Commander Mars","Fire Charge"],["Gym Leader Candice","Ice Stone"],["Team Galactic Boss Cyrus","Clock"],
    ["Commander Saturn","Wind Charge"],["Commander Mars &amp; Jupiter","Smoke Ball"],["Team Galactic Boss Cyrus","Echo Shard"],
    ["Gym Leader Volkner","Thunder Stone"],["Pokemon Trainer Cedric","Shiny Stone"],["Elite Four Aaron","Silver Powder"],
    ["Elite Four Bertha","Soft Sand"],["Elite Four Flint","Fire Stone"],["Elite Four Lucian","Psychic Seed"],
    ["Champion Cy","Prism Scale"]
  ]},
  { name: "Radical Red", rows: [
    ["Leader Brock","Hard Stone"],["Rocket Admin Archer","Black Tumblestone"],["Rival Terry","Gold Nugget"],
    ["Leader Misty","Mystic Water"],["Trainer Brendan","Silk Scarf"],["Leader Lt. Surge","Magnet"],
    ["Leader Erika","Miracle Seed"],["Boss Giovanni","Upgrade"],["Rival Terry","Soothe Bell"],
    ["Rocket Admin Archer &amp; Diana","Black Sludge"],["Boss Giovanni","Dubious Disc"],["Leader Sabrina","Twisted Spoon"],
    ["Trainer Brendan","Expert Belt"],["Leader Koga","Poison Barb"],["Trainer May","Vivichoke"],
    ["Leader Blaine","Charcoal Stick"],["Rocket Admin Archer","Covert Cloak"],["Rocket Admin Ariana","Utility Umbrella"],
    ["Boss Giovanni","Destiny Knot"],["Leader Clair","Dragon Scale"],["Rival Terry","Lucky Egg"],
    ["Trainer Brendan","Choice Scarf"],["Elite Four Agatha","Cleanse Tag"],["Elite Four Bruno","Focus Band"],
    ["Elite Four Lance","Dragon Fang"],["Elite Four Lorelei","Never Melt Ice"],["Champion Terry","Life Orb"]
  ]}
];

/* ---- Legendary structures (Articuno-style cards). Add more entries here. ---- */
const STRUCTURES = [
  {
    name: "Articuno",
    paras: [
      "To obtain Articuno you need to craft a <strong>\"Urn of Frost\"</strong> and defeat <strong>50 ice-type Pokémon</strong>, either by using melee or through Pokémon battle, while you have the urn in your inventory. (You can't fill multiple urns at the same time.)",
      "Once the urn is filled, all you need to do is right-click with it in your hand and a <strong>level 40 Articuno</strong> will spawn, with a 2% chance of it being shiny.",
      "You will also receive an <strong>\"Arctic Stone\"</strong> upon using the filled urn. You can put it together with the other 2 bird stones to craft the <strong>\"Vortex Stone\"</strong> to obtain Lugia. To obtain the Galarian form, simply use a <strong>\"Galarian Urn\"</strong> instead."
    ]
  }
];

/* ---- Spawn data: one block per Pokémon, separated by a blank line.
   First line = name. Lines before "Biome(s):" = conditions.
   After "Biome(s):" = biomes. After "Needed nearby blocks:" = blocks.
   (These are the starting data. After that, edit them in the admin panel.) ---- */
const PARADOX_TXT = `
Great Tusk
Can see the sky
Biome:
Is arid

Brute Bonnet
Can see the sky
Biome:
Is jungle

Screamtail
Biomes:
Is dripstone
Is magical

Fluttermane
Biomes:
Is dripstone
Is mountain

Slitherwing
Can see the sky
Biomes:
Is arid
Is jungle
Is badlands
Is crimson

Sandy Shocks
Biomes:
Is dripstone
Is deep dark
Is hills
Is mountain

Iron Treads
Biomes:
Is arid
Is badlands
Is mountain

Iron Bundle
Biomes:
Is freezing
Is glacial
Is tundra

Iron Hands
Can see the sky
Biome:
Is mountain

Iron Moth
Can see the sky
Daytime
Biome:
Is hills

Iron Jugulis
Night time
Biome:
Is deep dark

Iron Thorns
Night time
Biome:
Is mountain
Needed nearby blocks:
Lightning Rod

Roaring Moon
Night time
Biome:
Is mountain

Iron Valiant
Night time
Biomes:
Is plains
Is dripstone
Needed nearby blocks:
Lightning Rod

Walking Wake
Biome:
Is deep dark

Iron Leaves
Night time
Biome:
Is forest

Gouging Fire
Daytime
Biome:
Is volcanic

Iron Boulder
Night time
Biomes:
Is mountain
Is forest

Raging Bolt
Biome:
Is plains

Iron Crown
Night time
Biomes:
Is lush
Is forest
`;

const ULTRA_TXT = `
Nihilego
Biome:
Is End

Buzzwole
Can see the sky
Biome:
Is swamp

Pheromosa
Can see the sky
Biomes:
Is desert
Is End

Xurkitree
Biomes:
Is swamp
Is End

Celesteela
Can see the sky
Biomes:
Is bamboo
Is End

Guzzlord
Biome:
Is End

Kartana
Can see the sky
Biome:
Is bamboo

Poipole
Biome:
Is End
Needed nearby blocks:
Purpur Block

Stakataka
Can see the sky
Biomes:
Is peak
Is End

Blacephalon
Biome:
Is spooky
`;

const LEGEND_TXT = `
Groudon
Biomes:
Is volcanic
Is desert
Is arid
Is thermal
Is badlands

Kyogre
Rainy weather
Biomes:
Is deep ocean
Is ocean
Is frozen ocean

Rayquaza
Daylight
Not raining
Biomes:
Is sky
Is End
Is highlands

Jirachi
Biomes:
Is magical
Is mirage island
Is mushroom

Deoxys
Biomes:
Is End

Manaphy
Biomes:
Is ocean
Is deep ocean

Shaymin
Can see the sky
Night time
Not raining
Biomes:
Is floral
Is highlands

Tornadus
Rainy weather
Biomes:
Is jungle
Is bamboo

Landorus
Not raining
Biomes:
Is floral
Is savanna
Is desert

Thundurus
Thunderstorm weather
Biomes:
Is plains
Is mountain
Is badlands

Genesect
Biomes:
Is End

Meloetta
Biomes:
Is floral

Xerneas
Daytime
Biomes:
Is forest
Is magical
Is floral

Yveltal
Night time
Biomes:
Is swamp
Is spooky

Zygarde
Min. sky light is 0
Max sky light is 7
Max Y=0 to -48
Biomes:
Is forest
Is cave
Is swamp
Is deep dark

Diancie
Min. sky light is 0
Max. sky light is 7
Max Y = 0
No sky
Biomes:
Is cave
Is lush
Is overworld
Needed nearby blocks:
Amethyst Block
Amethyst Cluster
Budding Amethyst
Large Amethyst Bud
Medium Amethyst Bud
Small Amethyst Bud

Volcanion
Daytime
Can see the sky
Biomes:
Is Nether
Is volcanic

Type: Null
Biomes:
Is deep dark
Is End

Tapu Koko
Min. sky light is 8
Max. sky light is 15
Biomes:
Is jungle
Is tropical island
Is beach

Tapu Lele
Biomes:
Is jungle
Is tropical island
Is beach

Tapu Bulu
Biomes:
Is jungle
Is tropical island
Is beach

Tapu Fini
Biomes:
Is jungle
Is tropical island
Is beach

Necrozma
Biomes:
Is deep dark
Is End

Magearna
Biomes:
Is deep dark
Is End

Marshadow
No sky
Biome:
Is swamp

Zeraora
Can see the sky
Biome:
Is savanna

Kubfu
Biomes:
Is jungle
Is bamboo

Zarude
Biome:
Is jungle

Glastrier
Biomes:
Is snowy forest
Is taiga
Is mountain

Spectrier
Biomes:
Is forest
Is spooky
Is plains

Calyrex
Biomes:
Has season/autumn
Is floral

Enamorus
Biomes:
Is floral
Is swamp

Koraidon
Biomes:
Is badlands
Is savanna
Is plateau
Is mountain

Miraidon
Biome:
Is deep dark

Okidogi
Can see the sky
Biome:
Is savanna

Munkidori
Can see the sky
Biome:
Is jungle

Ogerpon
Biomes:
Is floral
Is bamboo
Is jungle

Fezandipiti
Can see the sky
Biome:
Is peak

Pecharunt
Can see the sky
Biomes:
Is swamp
Is spooky

Terapagos
Min. sky light is 0
Max. sky light is 7
Max Y = 0 to -32
Biomes:
Is mountain
Is magical
Is river
Is jungle
Is cave
`;

/* ---------------- ONEBLOCK (placeholder content – replace with yours) ---------------- */
const ONEBLOCK = {
  lead: "Start with a single block floating in the void and grow your own island, one break at a time.",
  about: [
    "Oneblock is our <strong>skyblock-style</strong> gamemode. You begin with one block that keeps giving: ores, mobs, chests, and new phases as you progress.",
    "Team up with friends on a shared island, and climb the phases. <strong>(Replace this text with your own description.)</strong>"
  ],
  features: [
    { name: "Phases",         text: "Break the block to move through phases with new blocks, mobs, and loot." },
    { name: "Island Teams",   text: "Invite friends to build and grow your island together." },
    { name: "Island Upgrades",text: "Expand your border and unlock perks as you progress." },
    { name: "Oneblock Shop",  text: "Buy and sell resources to speed up your island." },
    { name: "Events",         text: "Seasonal events and community challenges with prizes." },
    { name: "And more!",      text: "We'll keep adding to this list. Check Discord for updates." }
  ],
  faqs: [
    { q: "How do I start my island?", a: `<p>Join the server and use <code>/ob create</code> (replace with your real command). Your island will be generated with your first block.</p>${IMG()}` },
    { q: "How do I invite a friend?", a: `<p>Use <code>/ob invite name</code> (replace with your real command) and ask them to accept.</p>${IMG()}` },
    { q: "How do I move to the next phase?", a: `<p>Keep breaking the block. Phases change after a set number of blocks. Check your island menu to see your progress.</p>${IMG()}` }
  ]
};

const RULES = [
  { title: "Be kind and respectful", text: "Treat everyone nicely. No harassment, hate, or toxic behavior." },
  { title: "No griefing or stealing", text: "Don't break, steal, or damage other players' builds and items." },
  { title: "No cheating", text: "Hacked clients, x-ray, and duping exploits are not allowed." },
  { title: "Keep chat friendly", text: "No spam, advertising, or inappropriate content in game or Discord." },
  { title: "One account per player", text: "Play on the Minecraft account you applied with. Alt accounts are not allowed." },
  { title: "Listen to the team", text: "Follow staff instructions. If you disagree, talk to us in Discord." }
];

const PLANS = [
  { id: "dahlia",   name: "Dahlia",   price: 200,  perks: ["Dahlia chat prefix", "3 player homes", "Starter kit every week", "Access to the Dahlia lounge"] },
  { id: "hibiscus", name: "Hibiscus", price: 400, perks: ["Everything in Dahlia", "6 player homes", "Colored name in chat", "Particle trail & pet cosmetic"] },
  { id: "sakura",   name: "Sakura",   price: 800, perks: ["Everything in Hibiscus", "10 player homes", "Priority join when server is full", "Exclusive Sakura cosmetics & kit"] }
];

/* Accepted payments. To use an official logo, add  logo: "payments/gcash.png"  (a square image).
   Without a logo, a colored badge with the first letter is shown. */
const PAYMENTS = [
  { name: "GCash",    color: "#007cfe", logo: "" },
  { name: "MariBank", color: "#f26b21", logo: "" },
  { name: "Maya",     color: "#00b56a", logo: "" },
  { name: "PayPal",   color: "#003087", logo: "" }
];

const VOTES = [
  { name: "Vote site 1", reward: "Vote to earn an in-game reward.", url: "#" },
  { name: "Vote site 2", reward: "Vote to earn an in-game reward.", url: "#" },
  { name: "Vote site 3", reward: "Vote to earn an in-game reward.", url: "#" },
  { name: "Vote site 4", reward: "Vote to earn an in-game reward.", url: "#" },
  { name: "Vote site 5", reward: "Vote to earn an in-game reward.", url: "#" }
];

/* News posts shown on the home page. Real posts come from Supabase (admin panel > News).
   These are only shown when Supabase is not connected yet. */
const SAMPLE_POSTS = [
  { id: "sample-1", title: "Welcome to the new Floreon website!", body: "<p>This is a sample news post. Once Supabase is connected, staff can write posts from the admin panel.</p>", image_url: "", pinned: true, published: true, created_at: "2026-10-07T00:00:00Z" }
];
