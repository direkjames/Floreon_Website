# Floreon – Minecraft Server Website

Plain HTML/CSS/JS site with a Supabase backend (database, staff logins, image storage), hosted on Netlify. No build step.

## Project layout

```
index.html            Page structure
css/styles.css        All styling
js/config.js          Settings (server IP, Discord, Supabase keys) + starting content
js/data.js            Everything that talks to Supabase
js/app.js             Renders the public pages
js/admin.js           Admin panel (#admin) + start-up code
images/               Put floreon-logo.png and floreon-word.png here
supabase/schema.sql   Database tables + security rules (run once in Supabase)
netlify.toml          Netlify settings + security headers
```

## Run it locally (VS Code)

1. Open the folder in VS Code and install the recommended extensions when prompted (Live Server, Prettier, ESLint, GitLens).
2. Right-click `index.html` > **Open with Live Server**. The page reloads every time you save.
3. Without Supabase keys, the site shows the built-in content from `js/config.js` and the admin login is disabled. That's expected.

## Set up Supabase (one time)

1. Create a project at supabase.com. Pick the region closest to your players (Singapore for the Philippines).
2. **SQL Editor > New query**, paste all of `supabase/schema.sql`, click **Run**.
3. **Authentication > Sign In / Providers**: turn **off** "Allow new users to sign up". Only you should create accounts.
4. **Authentication > Users > Add user**: create an account for each staff member (email + password, tick "Auto confirm").
5. Copy each staff member's **User UID** and run this in the SQL Editor:
   ```sql
   insert into public.admins (user_id, display_name) values ('PASTE-USER-UID', 'YourName');
   ```
6. **Project Settings > API Keys**: copy the **Project URL** and the **Publishable key** (`sb_publishable_...`) into `SUPABASE` in `js/config.js`.
   Never use the **Secret key** (`sb_secret_...`) or the legacy `service_role` key in this project.
7. Open the site, click the lock icon, log in, and you can edit everything. Sections you never edit keep showing the built-in content.

## Deploy to Netlify

1. Push this folder to a GitHub repo.
2. Netlify > **Add new site > Import an existing project** > pick the repo. Leave the build command empty; publish directory is `.` (already set in `netlify.toml`).
3. Every push to `main` redeploys automatically.
4. Add your domain under **Domain management**, then in Supabase **Authentication > URL Configuration** set the Site URL to it.

## Before going public

- [x] Discord invite in `js/config.js` (set the invite to never expire in Discord).
- [x] Logo images in `images/`.
- [ ] Review the Store perks against the Minecraft Usage Guidelines (kits, extra homes and priority join are the risky ones).
- [ ] Set `oneblockEnabled: true` only when the Oneblock pages are ready.
- [ ] Replace the placeholder team, vote sites and FAQ pictures.
- [ ] Download a backup from the admin panel now and then.

## Updating CSS or JS

When you change a file in `css/` or `js/`, also bump the `?v=` number on its line in `index.html` (for example `?v=4` to `?v=5`). That makes every visitor's browser load the new file.

## Editing content

| What | Where |
|---|---|
| News posts | Admin panel > Whole site > News posts |
| FAQs, features, spawns, legendaries, series guide, About text | Admin panel > Cozymon (or Oneblock) |
| Team, rules, vote sites, store ranks, payment methods | Admin panel > Whole site |
| Discord link, banner pictures | `js/config.js` (then push) |

Text fields that say "simple HTML allowed" are cleaned before display, so scripts and unsafe tags are removed automatically.
