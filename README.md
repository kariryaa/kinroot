# Kinroot

Kinroot is a private, self-hostable family history app for mapping people, relationships, memories, and uncertain ancestral knowledge. It treats a family archive as a graph rather than a strict tree, so it can represent biological, adopted, foster, step, partner, sibling, community, unknown, and custom relationships without forcing every person into a narrow genealogy model.

The project is currently a pnpm monorepo with a React frontend, an Express REST API, PostgreSQL, and Prisma 6.

## Why Kinroot Exists

Most genealogy tools assume exact dates, documented names, two biological parents, and public-ish sharing defaults. Kinroot is built for messier and more private family history:

- every person field is optional
- uncertain people and relationships are first-class data
- visibility defaults to private
- oral memories are stored alongside dates and places
- people can belong to multiple trees
- relationships are modeled as graph edges, not hard-coded parent fields

## Current Features

- Focused family tree view with React Flow
- Wider relationship graph view
- People list with search, sorting, status filters, and confidence bars
- Timeline view based on known or estimated birth years
- Right-side person detail panel
- Add, edit, and delete people through the UI
- Add and delete relationships through the UI
- JSON export for a tree
- REST API routes for people, trees, relationships, and memories
- PostgreSQL schema for users, trees, people, relationships, memories, and media
- Seed dataset for the Sharma family tree with uncertain relationships and oral memories

## Not Built Yet

The plan in [plan/](plan/) tracks the bigger roadmap. The main unfinished areas are:

- authentication
- privacy enforcement in API queries
- memory creation from the UI
- file uploads for photos and documents
- GEDCOM import/export
- richer migration maps and archive workflows

## Tech Stack

- Node.js: tested with `v24.15.0`
- pnpm: tested with `11.0.9`
- PostgreSQL: tested with `16.13`
- API: Express `5`, Prisma `6.19.3`, TypeScript `6`
- Web: React `19`, Vite `8`, React Flow `12`, TypeScript `6`

## Repository Layout

```text
kinroot/
├── apps/
│   ├── api/                 # Express API + Prisma schema/migrations/seed
│   │   ├── prisma/
│   │   └── src/
│   └── web/                 # React + Vite frontend
│       └── src/
├── packages/                # Reserved for future shared packages
├── plan/                    # Product overview and implementation roadmap
├── pnpm-workspace.yaml
├── package.json
└── setup.md                 # Fresh machine setup instructions
```

## Quick Start

For a full first-time setup, use [setup.md](setup.md).

```bash
pnpm install
createdb kinroot_dev
```

Create `apps/api/.env`:

```env
DATABASE_URL="postgresql://YOUR_MAC_USERNAME@localhost:5432/kinroot_dev"
```

Then run:

```bash
pnpm --filter api db:migrate
pnpm --filter api db:seed
pnpm dev
```

Open the web app at:

```text
http://localhost:5173
```

The API runs at:

```text
http://localhost:3001
```

## Useful Commands

```bash
pnpm dev                      # run API and web together
pnpm build                    # build API and web
pnpm --filter api dev         # run API only
pnpm --filter web dev         # run web only
pnpm --filter api db:migrate  # apply Prisma migrations
pnpm --filter api db:seed     # reset and seed local data
pnpm --filter api db:studio   # open Prisma Studio
pnpm --filter web lint        # lint frontend
```

## API Surface

The API is mounted under `/api`.

- `GET /api/trees`
- `GET /api/trees/:id`
- `POST /api/trees`
- `PATCH /api/trees/:id`
- `DELETE /api/trees/:id`
- `GET /api/trees/:id/export`
- `GET /api/persons`
- `GET /api/persons/:id`
- `GET /api/persons/:id/graph`
- `POST /api/persons`
- `PATCH /api/persons/:id`
- `DELETE /api/persons/:id`
- `POST /api/relationships`
- `DELETE /api/relationships/:id`
- memory routes under `/api/memories`

There is also a health check at:

```text
GET /health
```

## Data Model

Kinroot stores people as nodes and relationships as edges. `PersonTree` connects people to one or more trees. Relationship metadata includes type, direction, uncertainty, confidence score, notes, and visibility.

The schema intentionally keeps most person fields nullable so incomplete entries are valid. A person can be created from a partial memory, an uncertain nickname, or a suspected connection and enriched later.

## Privacy Note

The schema and UI are private-by-default, but authentication and API-level privacy filtering are not finished yet. Do not expose the API publicly until those phases are implemented.

## License

MIT. See [LICENSE](LICENSE).
