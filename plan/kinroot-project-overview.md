# Kinroot — Project Overview & Decision Log

*Last updated: May 2026*

---

## What Is Kinroot?

Kinroot is a private, self-hostable platform for mapping and preserving human
relationships across generations. It is built as a personal project to archive
family history, oral memories, uncertain ancestral connections, and the full
complexity of how people relate to one another — across biological, adopted,
step, foster, social, and cultural lines.

The name reflects the idea of tracing roots: not just a family tree, but the
entire network of human connections that shaped a person's existence.

---

## The Problem It Solves

Existing genealogy tools (Ancestry, MyHeritage, FamilySearch) are built around
a narrow model of family: two biological parents, legal marriages, documented
births and deaths. They work well for Western, well-documented family histories.
They work poorly for:

- Families from oral traditions where exact dates were never recorded
- Families where relationships are uncertain, disputed, or partially remembered
- Non-biological relationships: adopted children, foster parents, guardians,
  community elders, mentors
- Families where the exact structure is unknown ("grandfather's brother, we
  think, from the same village")
- People who want to preserve stories and memories, not just dates and names
- Situations where privacy is critical — many family members are living and
  their information should not be exposed publicly

Kinroot is designed from the ground up to handle all of these gracefully.

---

## Core Philosophy

**Every field is optional.**
A person can be added with nothing more than a nickname and a vague
connection. "Unknown man from grandfather's village, possibly related" is a
valid and useful entry.

**Uncertainty is a first-class citizen.**
Dates can be estimated. Relationships can be marked uncertain. Confidence
scores can be attached to any piece of data. The UI communicates uncertainty
visually (dashed borders, italic text, uncertainty badges) rather than hiding
or refusing it.

**Privacy by default.**
All data is private unless explicitly shared. Living people are protected.
Sensitive fields (phone, email, exact birthdate) are optional and hidden by
default. The platform is designed to be self-hosted so data never leaves the
user's own infrastructure.

**Gradual enrichment.**
A family archive is never complete. The system is designed to accept incomplete
data today and be enriched over years or decades. Information can be corrected,
disputed, or refined at any time.

**Memory preservation over data collection.**
The most valuable content in Kinroot is often not a birth date but a story:
"She used to sing folk songs every evening." "He traveled village-to-village
selling tools." These oral memories are treated as primary data, not
annotations.

---

## What It Is Not

Kinroot is not a social network. There are no feeds, no likes, no public
profiles by default.

Kinroot is not a DNA service. It does not infer biological relationships from
genetic data (though future integration is possible).

Kinroot is not a document scanner or OCR tool (though this is a future
possibility).

Kinroot is not a rigid family tree tool. The underlying data model is a
**graph**, not a hierarchy. A person can have multiple parents, belong to
multiple trees, be connected across clusters, and have relationships of any
type — including ones that don't fit traditional family categories.

---

## Data Model Decisions

### People as nodes, relationships as edges

The fundamental model is a graph: people are nodes, and every connection
between them is a labelled, directed or undirected edge with metadata.

This was chosen over a hierarchical "mother/father/child" model because:
- It naturally represents non-binary family structures
- It handles uncertain connections without special-casing
- It allows multiple parents, multiple partners, step relationships, and
  non-family connections within the same schema
- It supports future graph queries like "find the shortest relationship path
  between person A and person B"

### PostgreSQL over Neo4j

Despite the graph data model, PostgreSQL was chosen as the database rather
than a native graph database (Neo4j). Reasons:

- Simpler operations: PostgreSQL is easier to back up, restore, self-host,
  and reason about for a solo developer
- The relationship queries needed at this scale (hundreds to low thousands of
  people per tree) do not require graph-native traversal performance
- Prisma ORM has excellent PostgreSQL support but limited Neo4j support
- Migration to Neo4j is possible later if query complexity demands it

The graph is modelled relationally: a `Person` table, a `Relationship` table
(person_a_id → type → person_b_id with metadata), and a `PersonTree` join
table for many-to-many tree membership.

### Flexible relationship types

Relationships are typed using an enum (`BIOLOGICAL_PARENT`, `MARRIED`,
`SIBLING`, `FRIEND`, `UNKNOWN`, etc.) but a `customType` string field allows
any type to be described beyond the enum. This avoids locking the model to a
fixed vocabulary while still enabling filtering and visualisation by type.

### Every field nullable

The Prisma schema was designed with every person field nullable except `id`.
This was a deliberate decision: forcing any field (even name) creates friction
for adding uncertain or partially-known people. The application layer handles
display gracefully when fields are missing.

### Confidence scores

Every person and relationship can carry a `confidenceScore` integer from 0 to
100. This is a pragmatic addition for family history work where "I'm 60% sure
this is the right Gopal Sharma" is a meaningful statement. Scores are shown
visually as progress bars in the UI.

### Visibility levels

A `Visibility` enum is attached to every entity:
`PUBLIC → SHARED → FAMILY_ONLY → CONTRIBUTORS_ONLY → PRIVATE → ADMIN_ONLY`

All entities default to `PRIVATE`. This was a deliberate default — users
should have to explicitly choose to share, never accidentally expose.

---

## Architecture Decisions

### Monorepo structure

The project uses a pnpm workspace monorepo with two apps (`api` and `web`) and
a shared `packages/shared` directory. This was chosen to:
- Keep frontend types in sync with backend types without a separate package
- Run both servers from a single root command (`pnpm dev`)
- Prepare for future packages (e.g. a mobile app, a CLI import tool)

### API-first backend

The backend is a REST API (Express) rather than a server-rendered application.
This was chosen for:
- Clean separation between data and presentation
- Future flexibility to add a mobile app, CLI, or desktop client
- Easier testing of business logic independently of UI

GraphQL was considered but REST was chosen for simplicity at this stage.
The relationship graph is fetched as a flat `{ nodes, edges }` structure
purpose-built for the frontend graph renderer, rather than a nested GraphQL
response.

### React + Vite frontend

React was chosen for the frontend because:
- Large ecosystem of graph/visualization libraries
- Component model maps well to the person card / detail panel / modal pattern
- TypeScript support is excellent
- Vite provides fast hot-module reload during development

Next.js was considered but rejected: server-side rendering adds complexity
that isn't needed for a private, single-user or small-group application that
doesn't require SEO.

### React Flow for graph visualisation

React Flow was chosen over D3.js for the interactive relationship graph because:
- Built-in support for draggable nodes, zoom/pan, minimap, and custom controls
- Much less boilerplate than D3 for an interactive node-edge graph
- Handles the rendering loop and state management internally
- Custom node components are standard React components

D3 remains an option for the migration map and timeline visualisations where
React Flow's node-edge model is not the right fit.

### Prisma 6 (not 7)

The project uses Prisma 6 rather than the latest Prisma 7. Prisma 7 changed
the client import path from `@prisma/client` to `prisma/client`, which would
have required updates across the entire codebase. Prisma 6 was pinned
explicitly:

```bash
pnpm add @prisma/client@6 prisma@6
```

This will be revisited when the codebase is more stable.

### Authentication: Clerk first, self-hosted JWT later

Clerk was chosen for the initial authentication implementation because:
- Zero-configuration, working login/logout in under an hour
- No need to build password reset, email verification, or session management
- Free tier is sufficient for a personal project

The long-term plan is to replace Clerk with a self-hosted JWT + bcrypt
implementation. The migration is clean because auth is abstracted to a single
middleware function — the rest of the codebase only sees `req.auth.userId`
regardless of which auth system provides it.

---

## UI & UX Decisions

### Archival aesthetic

The visual design uses a warm, archival palette: aged paper tones (`#f7f4ef`),
ink brown (`#1a1714`), muted gold (`#b8934a`), and teal (`#2a6b6a`). Cormorant
Garamond is used for names, years, and headings; DM Sans for interface
elements.

This was a deliberate departure from the clinical blue-and-white aesthetic
of most genealogy software. The goal is for the product to feel like a
handcrafted family ledger — something with gravitas and warmth — rather than
a database interface.

### Uncertainty as a visual language

Uncertain people and relationships are communicated through:
- Dashed node borders (vs solid for confirmed)
- Italic text for uncertain names and dates
- A small help icon (?) on uncertain fields
- Dashed edge lines on uncertain relationships
- An "Uncertain" badge on node cards

This creates an immediate visual distinction between "we know this" and "we
think this" without requiring the user to read labels carefully.

### Generation-aware graph layout

The relationship graph uses a custom layout algorithm that assigns each person
a generation relative to the selected root person. Parents go one row up,
children one row down, partners and siblings stay on the same row. This
produces a layout that reads like a traditional family tree while remaining
flexible enough to handle non-traditional structures.

The root person is configurable per tree (`Tree.rootPersonId`). If not set,
the first person added to the tree is used as the default anchor.

### Detail panel on the right

Clicking a node loads a detail panel on the right side rather than a
popup/modal. This was chosen because:
- It allows the graph to remain visible while reading a person's details
- It supports the "explore and discover" use case: click one person, see their
  relationships, click through to another
- It avoids the disorienting experience of a modal that covers the graph

---

## Current State (May 2026)

### What is working

- Full PostgreSQL schema with persons, relationships, memories, media, trees,
  and users
- REST API with CRUD endpoints for all entities
- Relationship graph endpoint that returns the full tree as `{ nodes, edges }`
- React frontend with:
  - Interactive relationship graph (React Flow, generation-aware layout)
  - People list with search and confidence bars
  - Detail panel showing identity, relationships, and memories
  - Add person modal
  - Reset view button, minimap, zoom controls
- Seed data: two family trees (Sharma and Kumar), 10 people, full
  relationship graph, oral memories
- Privacy banner and private-by-default UI

### What is not yet built

- **Add relationship UI** — persons can be created but not linked through the
  interface (only via seed/API directly)
- **Edit person modal** — read-only detail panel, no in-app editing yet
- **Add memory from UI** — memories exist in seed data but cannot be added
  through the interface
- **Authentication** — the API is currently unprotected; Clerk integration
  is the next phase
- **Privacy enforcement** — visibility fields exist in the schema but are not
  yet filtered in API queries
- **Timeline view** — designed in prototype but not yet connected to real data
- **Export** — endpoint exists in the API but no UI button yet

---

## Seed Data

The application ships with a representative seed dataset:

**Sharma family tree** (root: Arjun Sharma)
- Gopal Sharma (c.1928–1994) — patriarch, travelling merchant, uncertain dates
- Savitri Bai (c.1932–2008) — matriarch, oral tradition keeper
- Ramesh Sharma (b.1958) — government officer, son of Gopal & Savitri
- Priya Kumar (b.1962) — married into Sharma family, also in Kumar tree
- Meena Devi (b.1960) — daughter of Gopal & Savitri, school teacher
- Arjun Sharma (b.1988) — software engineer, root person
- Kavya Sharma (b.1991) — sibling of Arjun
- Unknown man from grandfather's village — uncertain connection, 20% confidence

**Kumar lineage tree** (root: Priya Kumar)
- Bhupender Kumar (c.1935–2001) — farmer, uncertain dates
- Kamla Devi (b.1938) — living matriarch
- Priya Kumar — shared with Sharma tree, demonstrating cross-tree membership

The seed data is designed to exercise every feature of the system: certain and
uncertain relationships, living and deceased people, oral memories, estimated
dates, confidence scores, and cross-tree person membership.

---

## File Structure

```
kinroot/
├── apps/
│   ├── api/                        ← Node.js + Express backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma       ← Full database schema
│   │   │   └── seed.ts             ← Seed data script
│   │   └── src/
│   │       ├── index.ts            ← Entry point, middleware setup
│   │       ├── db.ts               ← Prisma client singleton
│   │       └── routes/
│   │           ├── persons.ts      ← CRUD + graph endpoint
│   │           ├── relationships.ts
│   │           ├── memories.ts
│   │           └── trees.ts        ← CRUD + export endpoint
│   └── web/                        ← React + Vite frontend
│       └── src/
│           ├── api/                ← Axios API clients
│           ├── components/
│           │   ├── graph/
│           │   │   ├── GraphView.tsx     ← React Flow canvas + layout
│           │   │   └── PersonNode.tsx    ← Custom node component
│           │   ├── panel/
│           │   │   └── DetailPanel.tsx   ← Right-side person detail
│           │   ├── modals/
│           │   │   └── AddPersonModal.tsx
│           │   └── layout/
│           │       └── Sidebar.tsx
│           ├── pages/
│           │   ├── GraphPage.tsx
│           │   └── PeoplePage.tsx
│           ├── types/index.ts      ← Shared TypeScript types
│           └── styles/global.css
└── packages/
    └── shared/                     ← Shared types (future use)
```

---

## What Comes Next

1. **Phase 5** — Relationship management UI (add/delete relationships, edit
   persons, add memories from the interface)
2. **Phase 6** — Clerk authentication
3. **Phase 7** — Privacy enforcement (visibility filters, living person
   protection)
4. **Phase 8** — Fuzzy search, JSON export, timeline view
5. **Phase 9** — File uploads (photos, documents)
6. **Phase 10** — Self-hosted JWT auth replacing Clerk
7. **Future** — GEDCOM import/export, migration map, AI-assisted connection
   suggestions, multilingual support, offline-first mode

---

*Built with: Node.js · Express · PostgreSQL · Prisma 6 · React · Vite ·
React Flow · TypeScript · pnpm workspaces*
