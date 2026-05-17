# Setup Kinroot From Scratch

These steps recreate the current local development setup for Kinroot on macOS. The repo has been tested with:

- Node.js `v24.15.0`
- pnpm `11.0.9`
- PostgreSQL `16.13`
- Prisma `6.19.3`

Node `24.15.0` is the safest choice for this repo because the locked Vite toolchain requires Node `^20.19.0`, `^22.13.0`, or `>=24`.

## 1. Install System Tools

Install Xcode Command Line Tools:

```bash
xcode-select --install
```

Install Homebrew if it is not already installed:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

For Apple Silicon Macs, add Homebrew to your shell if the installer asks you to:

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

Verify:

```bash
brew --version
```

## 2. Install Node.js

Install `nvm`:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

Restart your terminal, then install the known-good Node version:

```bash
nvm install 24.15.0
nvm use 24.15.0
nvm alias default 24.15.0
```

Verify:

```bash
node --version
```

Expected:

```text
v24.15.0
```

## 3. Install pnpm

Use Corepack to activate the exact pnpm version used locally:

```bash
corepack enable
corepack prepare pnpm@11.0.9 --activate
```

Verify:

```bash
pnpm --version
```

Expected:

```text
11.0.9
```

## 4. Install PostgreSQL

Install PostgreSQL 16:

```bash
brew install postgresql@16
brew services start postgresql@16
```

Add PostgreSQL 16 to your shell path:

```bash
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Verify:

```bash
psql --version
```

Known-good version:

```text
psql (PostgreSQL) 16.13
```

## 5. Clone The Repo

```bash
git clone <REPO_URL> kinroot
cd kinroot
```

If the repo already exists locally, just enter it:

```bash
cd /Users/kariryaa/projects/kinroot
```

## 6. Install Dependencies

From the repo root:

```bash
pnpm install
```

The lockfile pins the resolved dependency versions. Important current versions include:

- `@prisma/client` `6.19.3`
- `prisma` `6.19.3`
- `express` `5.2.1`
- `react` `19.2.6`
- `vite` `8.0.13`
- `typescript` `6.0.x`

## 7. Create The Local Database

Create the development database:

```bash
createdb kinroot_dev
```

Optional test database:

```bash
createdb kinroot_test
```

If `createdb` says the database already exists, you can continue.

## 8. Configure Environment Variables

Create `apps/api/.env`:

```bash
touch apps/api/.env
```

Add this value, replacing `YOUR_MAC_USERNAME` with the output of `whoami`:

```env
DATABASE_URL="postgresql://YOUR_MAC_USERNAME@localhost:5432/kinroot_dev"
```

For example:

```bash
whoami
```

If `whoami` prints `kariryaa`, use:

```env
DATABASE_URL="postgresql://kariryaa@localhost:5432/kinroot_dev"
```

The frontend does not need an env file for local development. By default it calls:

```text
http://localhost:3001/api
```

If you need to override that later, create `apps/web/.env.local`:

```env
VITE_API_URL="http://localhost:3001/api"
```

## 9. Apply Migrations

From the repo root:

```bash
pnpm --filter api db:migrate
```

This applies the migrations in `apps/api/prisma/migrations`.

## 10. Seed Local Data

```bash
pnpm --filter api db:seed
```

The seed script resets local data and creates the Sharma family dataset with people, relationships, and memories.

## 11. Run The App

Start the API and frontend together:

```bash
pnpm dev
```

Open:

```text
http://localhost:5173
```

The API should be available at:

```text
http://localhost:3001
```

Check the API health endpoint:

```bash
curl http://localhost:3001/health
```

Expected:

```json
{"ok":true}
```

## 12. Build For Verification

```bash
pnpm build
```

You can also run individual apps:

```bash
pnpm --filter api dev
pnpm --filter web dev
```

## 13. Prisma Studio

To inspect or edit local data:

```bash
pnpm --filter api db:studio
```

Prisma Studio usually opens at:

```text
http://localhost:5555
```

## Troubleshooting

If `pnpm install` complains about Node, confirm you are using the expected version:

```bash
node --version
nvm use 24.15.0
```

If the frontend says it cannot load the tree, make sure the API is running and the database has been migrated and seeded:

```bash
pnpm --filter api db:migrate
pnpm --filter api db:seed
pnpm --filter api dev
```

If Prisma cannot connect to the database, check `apps/api/.env` and confirm PostgreSQL is running:

```bash
brew services list
psql postgresql://$(whoami)@localhost:5432/kinroot_dev
```

If the database gets into a bad local state, reset it with:

```bash
dropdb kinroot_dev
createdb kinroot_dev
pnpm --filter api db:migrate
pnpm --filter api db:seed
```

Only use that reset command for local development because it deletes the local `kinroot_dev` database.
