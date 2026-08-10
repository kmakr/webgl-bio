# Onboarding

How this repo is put together, and how a change on your laptop ends up on the live
websites. Written for someone who hasn't used Cloudflare or wrangler before — every
term is explained the first time it shows up.

Read time: about 10 minutes.

---

## 1. What's in here

Two separate websites, living in one repository:

```text
apps/
├── portfolio/   →  theoazriel.com
└── notes/       →  notes.theoazriel.com
```

They share nothing except this repo and a single `node_modules` folder. Different
frameworks, different builds, different deploys.

| | portfolio | notes |
|---|---|---|
| Built with | React + Vite + Three.js | Astro |
| What it is | one interactive page (the cloth) | a blog, one page per note |
| Content lives in | the code | Markdown files in `apps/notes/src/content/notes/` |

---

## 2. First-time setup

**Node 22 is required.** Not optional — the deploy tool refuses to start on anything
older, and this repo's default used to be Node 20, which caused real problems.

```bash
nvm use          # reads .nvmrc, which says 22
npm install      # run this from the repo root, not inside apps/
```

If `nvm use` says the version isn't installed: `nvm install 22`.

> **Why `npm install` at the root and not in each app?**
> See "workspaces" in section 4. Short version: one install covers both apps.

---

## 3. Running locally

```bash
npm run dev:portfolio    # opens on localhost:5173
npm run dev:notes        # opens on its own port, printed in the terminal
```

Both hot-reload — save a file and the browser updates.

---

## 4. The vocabulary

Four terms you'll keep bumping into. Here's what each one actually means in *this*
repo.

### "Workspace" — npm's word for one app inside a multi-app repo

The root `package.json` has this line:

```json
"workspaces": ["apps/*"]
```

That tells npm: *every folder under `apps/` that has its own `package.json` is a
separate mini-project.* There are two, and each declares its own name inside its own
`package.json`:

- `apps/portfolio/package.json` → `"name": "@theo/portfolio"`
- `apps/notes/package.json` → `"name": "@theo/notes"`

That name is how you point a command at one app. From the repo root:

```bash
npm run build --workspace @theo/notes    # build only the blog
```

Because that's tedious to type, the root `package.json` has nicknames for the common
ones — `npm run build:notes` does exactly the line above. Same for `dev:*` and
`deploy:*`.

**The folder location makes it a workspace. The `name` field is what you call it.**

### "Cloudflare Workers" — where the sites are hosted

Cloudflare Workers is normally a service for running server code close to users. But
both of these sites use it in its simplest possible mode: **as a file server**.

Neither site runs any server code. Look at `apps/portfolio/wrangler.toml`:

```toml
name = "wild-sun-9904"

[assets]
directory = "./dist"

[[routes]]
pattern = "theoazriel.com"
custom_domain = true
```

There is no `main = "..."` line. That's the tell — `main` is where you'd point at
server code, and its absence means this Worker only hands out the files in `./dist`.
Same for notes.

Reading that file top to bottom:

- `name` — what the Worker is called inside your Cloudflare account. The portfolio's
  is `wild-sun-9904` (an auto-generated name from when it was first created; ugly, but
  renaming it would break the link to the deployed thing, so it stays).
- `[assets] directory = "./dist"` — "serve the files in this folder." `dist` is what
  the build step produces.
- `[[routes]]` — which domain points at this Worker.

The notes one is the same shape, plus two options about URL handling
(`html_handling`, `not_found_handling`).

### "Static" — the sites have no backend

Both sites are static, meaning: everything is decided at build time, and nothing runs
on a server when someone visits. There's no database, no login, no API.

They're static in two slightly different ways, which is worth knowing:

- **notes** builds real HTML files — one per note, plus tag pages and `feed.xml`. If
  you view source on a note, the writing is right there in the HTML.
- **portfolio** builds an almost-empty HTML file plus one big JavaScript bundle. The
  page you see is drawn by JavaScript in your browser. If you view source, you'll see
  basically nothing — that's expected, not a bug.

### "wrangler" — the command that uploads to Cloudflare

`wrangler` is Cloudflare's command-line tool. In this repo it does exactly one job:
take the `dist` folder and upload it to the right Worker.

That's what `deploy` means in each app's `package.json`:

```json
"deploy": "wrangler deploy"
```

When it runs, it looks for a `wrangler.toml` in the folder it's run from, reads the
`name` and `[assets]` lines out of it, and uploads accordingly. That's the whole
mechanism — the config file is how it knows which site it's dealing with.

---

## 5. How GitHub is connected to Cloudflare

This is the part that trips people up, so here it is end to end.

**GitHub and Cloudflare have no built-in relationship.** GitHub doesn't know Cloudflare
exists. Pushing code does not, by itself, publish anything. What connects them is a
GitHub Actions workflow — a script that GitHub runs on its own computers whenever you
push.

There are two, one per site:

```text
.github/workflows/deploy-portfolio.yml
.github/workflows/deploy-notes.yml
```

Each one runs these steps on a fresh Linux machine:

```text
1. download the repo
2. install Node (the version from .nvmrc)
3. npm ci                    ← install dependencies
4. npm run build:<app>       ← also type-checks; fails here if the code is broken
5. npm run deploy:<app>      ← wrangler uploads to Cloudflare
```

The whole thing takes about 40 seconds. If step 4 fails, step 5 never runs — so a
broken build can't reach the live site.

### Only the app you changed gets deployed

Each workflow has a `paths:` filter. Change a note, and only the notes site
redeploys — the portfolio is left alone.

| what you changed | portfolio deploys | notes deploys |
|---|---|---|
| `apps/portfolio/**` | yes | no |
| `apps/notes/**` | no | yes |
| `package-lock.json` or `.nvmrc` | yes | yes |

The last row is deliberate: a change to dependencies or the Node version could affect
either build, so neither should be left behind on an old one.

### The API token, and why it's needed

The Linux machine running the workflow is brand new every time and knows nothing about
you. It has no browser and nobody sitting at it, so it can't do a normal login.

That's what the API token is for — a password-like string that proves to Cloudflare
that this machine is allowed to upload. It's stored in GitHub as an encrypted
**repository secret**, and the workflow hands it to wrangler at the moment it runs.

Two secrets are already set up, under
`GitHub repo → Settings → Secrets and variables → Actions`:

- `CLOUDFLARE_API_TOKEN` — the credential. Scoped to **Workers Scripts: Read + Write**
  and nothing else, so if it ever leaked, the worst someone could do is redeploy these
  two sites. It cannot touch DNS, storage, or billing.
- `CLOUDFLARE_ACCOUNT_ID` — just an identifier, not a secret in any real sense; it
  tells wrangler which account to target.

GitHub never reads or interprets the token. It stores it encrypted and injects it as an
environment variable while the workflow runs. It's masked in the logs.

### The whole chain

```text
you: git push / merge a PR
      ↓
GitHub sees a push to main
      ↓
does the change touch apps/notes/** ?  → yes → run deploy-notes.yml
      ↓
fresh Linux machine: install Node 22, npm ci, build, type-check
      ↓
wrangler deploy  (using CLOUDFLARE_API_TOKEN)
      ↓
Cloudflare updates the Worker
      ↓
notes.theoazriel.com serves the new files
```

---

## 6. Publishing a note

The everyday task:

1. Add a Markdown file to `apps/notes/src/content/notes/`.
2. Fill in the frontmatter at the top:

   ```yaml
   ---
   title: "Your title"                              # required
   date: 2026-08-11                                 # required
   summary: "One line, shown on the index page."    # required
   tags: ["design"]                                 # optional, defaults to []
   draft: false                                     # optional, defaults to false
   ---
   ```

   The rules live in `apps/notes/src/content.config.ts` if you ever want to change
   them.

3. Commit and push to `main`.
4. Wait about a minute. It's live.

`draft: true` keeps a note out of the site entirely — it won't appear on the homepage,
the archive, the tag pages, the RSS feed, or at its own URL. Useful for work in
progress.

If the frontmatter is wrong (missing field, bad date), the build fails and **nothing is
published** — the live site stays as it was. You'll get a red X on the commit in
GitHub. That's the safety net working.

You don't need to be at your laptop for any of this. Editing a file through
github.com's web editor works the same way.

---

## 7. Cheat sheet

```bash
nvm use                     # switch to Node 22 — do this first, every time

npm install                 # from the root; installs for both apps

npm run dev:portfolio       # local dev server
npm run dev:notes

npm run build:portfolio     # build one app
npm run build:notes
npm run build               # build both

npm run deploy:portfolio    # manual deploy — normally unnecessary
npm run deploy:notes
```

**You shouldn't normally need the deploy commands.** Merging to `main` does it. They're
there for emergencies, or if you want to publish without committing.

To deploy manually you first have to log in, which opens a browser:

```bash
npx wrangler login
```

That login is stored on your Mac and expires after a while. It has nothing to do with
the API token in GitHub — two separate credentials for two separate machines.

To redeploy without changing any code: GitHub → **Actions** tab → pick a workflow →
**Run workflow**.

---

## 8. When something breaks

Things that have actually gone wrong here, and the fix.

**"Wrangler requires at least Node.js v22"**
You're on the wrong Node version. `nvm use`. This is the single most common one.

**A deploy failed in GitHub Actions**
Go to the Actions tab and open the red run. Each step is expandable; the failing one is
marked. Build failures are usually a TypeScript error or bad note frontmatter — the log
will name the file.

**`npx wrangler login` says the token expired**
Run `npx wrangler login` again. Only affects manual deploys from your Mac; GitHub
Actions uses the API token and is unaffected.

**`Cannot find module './rolldown-binding...'` when building notes**
Dependencies were installed under the wrong Node version. Fix:

```bash
nvm use && rm -rf node_modules && npm install
```

**A merge didn't deploy anything**
Check whether the files you changed match a workflow's `paths:` filter (section 5). A
change to a README, for instance, deploys nothing — which is correct.

**Something looks stale on the live site**
Hard-refresh first. To confirm what's actually deployed, check the Actions tab for a
recent green run, or look at the deployment history in the Cloudflare dashboard.

---

## 9. Known stale bits in the main README

`README.md` predates some changes and is wrong in a few places. Worth fixing at some
point:

- It says *"Cloudflare builds and deploys the notes site"* — the outcome is right but
  the mechanism isn't. GitHub Actions builds and deploys it; Cloudflare only receives
  the files.
- It describes a *"changing quote"* on the cloth and *"click anywhere for a different
  quote"*. The quote was removed and there's no click-to-change behaviour.
- It describes a *"small material switch"* for choosing the silver or clear-tape
  version. The material is currently fixed to clear tape in the code.

---

## 10. Where things live

| | |
|---|---|
| Live sites | theoazriel.com, notes.theoazriel.com |
| Cloudflare Workers | `wild-sun-9904` (portfolio), `theo-notes` (notes) |
| Deploy config | `apps/*/wrangler.toml` |
| CI workflows | `.github/workflows/deploy-*.yml` |
| Repo secrets | GitHub → Settings → Secrets and variables → Actions |
| Node version | `.nvmrc` |
| Note content | `apps/notes/src/content/notes/*.md` |
| Note schema | `apps/notes/src/content.config.ts` |
