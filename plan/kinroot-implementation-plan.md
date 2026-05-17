# Kinroot — Full Implementation Plan
### MacBook Air M2 · Fresh Setup · Zero to Working App

---

## Overview

This plan takes you from a brand-new MacBook to a running Kinroot app. It is divided into phases, each building on the last. Every command is copy-paste ready. Estimated total time: **8–12 weeks part-time** (2–3 hours/day).

---

## Phase 0 — Mac Setup (Day 1, ~2 hours)

### 0.1 Install Xcode Command Line Tools

This gives you `git`, `make`, and basic compilers. macOS will prompt you automatically when you run the next command, but you can trigger it manually:

```bash
xcode-select --install
```

Click "Install" in the dialog. Wait for it to finish (~5 min).

### 0.2 Install Homebrew

Homebrew is the package manager for macOS. Everything else installs through it.

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

After it finishes, it will print two commands starting with `echo` and `eval`. **Run both of them** — they add Homebrew to your PATH for Apple Silicon (M2).

Verify it works:

```bash
brew --version
```

### 0.3 Install Node.js

Use `nvm` (Node Version Manager) — it lets you switch Node versions and avoids permission issues.

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Restart your terminal, then install the latest LTS Node
nvm install --lts
nvm use --lts

# Verify
node --version   # should print v20.x.x or higher
npm --version
```

### 0.4 Install PostgreSQL

```bash
brew install postgresql@16
brew services start postgresql@16

# Add postgres to your PATH (Homebrew will print the exact command — run it)
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify
psql --version
```

### 0.5 Install VS Code

Download from https://code.visualstudio.com — drag to Applications.

Then install the CLI:

1. Open VS Code
2. Press `Cmd+Shift+P`
3. Type "Shell Command: Install 'code' command in PATH"
4. Hit Enter

Recommended extensions to install:

```
Prisma.prisma
dbaeumer.vscode-eslint
esbenp.prettier-vscode
bradlc.vscode-tailwindcss
ms-vscode.vscode-typescript-next
```

### 0.6 Install Git and configure it

```bash
brew install git

git config --global user.name "Your Name"
git config --global user.email "your@email.com"
git config --global init.defaultBranch main
```

### 0.7 Install useful global tools

```bash
npm install -g pnpm        # faster package manager (use instead of npm)
npm install -g tsx         # run TypeScript files directly
```

---

## Phase 1 — Project Scaffolding (Day 1–2, ~3 hours)

### 1.1 Create the project structure

```bash
mkdir kinroot
cd kinroot
git init
```

Create this folder structure:

```
kinroot/
├── apps/
│   ├── web/          ← React frontend (Vite)
│   └── api/          ← Node.js backend (Express)
├── packages/
│   └── shared/       ← Shared types (TypeScript)
├── .gitignore
├── .env.example
└── README.md
```

```bash
mkdir -p apps/web apps/api packages/shared
```

### 1.2 Create root .gitignore

```bash
cat > .gitignore << 'EOF'
node_modules/
dist/
build/
.env
.env.local
*.log
.DS_Store
.turbo/
EOF
```

### 1.3 Create root package.json (monorepo)

```bash
cat > package.json << 'EOF'
{
  "name": "kinroot",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "concurrently \"pnpm --filter api dev\" \"pnpm --filter web dev\"",
    "build": "pnpm --filter api build && pnpm --filter web build"
  }
}
EOF

pnpm add -w concurrently
```

---

## Phase 2 — Database Setup (Day 2–3, ~3 hours)

### 2.1 Create the Postgres database

```bash
createdb kinroot_dev
createdb kinroot_test
```

### 2.2 Set up the API project with Prisma

```bash
cd apps/api
pnpm init

# Install dependencies
pnpm add express cors helmet dotenv
pnpm add @prisma/client
pnpm add -D prisma typescript @types/node @types/express tsx nodemon
```

Initialize TypeScript:

```bash
npx tsc --init
```

Edit `tsconfig.json` — set these key values:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### 2.3 Initialize Prisma

```bash
npx prisma init
```

This creates `prisma/schema.prisma` and a `.env` file. Edit `.env`:

```
DATABASE_URL="postgresql://your_mac_username@localhost:5432/kinroot_dev"
```

Replace `your_mac_username` with your Mac username (run `whoami` to check).

### 2.4 The full Prisma schema

Replace the contents of `prisma/schema.prisma` with this complete schema:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Core entities ───────────────────────────────────────────────────

model User {
  id          String   @id @default(cuid())
  email       String?  @unique
  name        String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  persons     Person[]
  trees       Tree[]
  memories    Memory[]
}

model Tree {
  id          String   @id @default(cuid())
  name        String
  description String?
  color       String?  // hex color for sidebar dot
  ownerId     String
  owner       User     @relation(fields: [ownerId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  persons     PersonTree[]
}

model Person {
  id              String    @id @default(cuid())

  // Identity — all optional
  fullName        String?
  nickname        String?
  aliases         String[]  // array of alternate names
  maidenName      String?
  nativeNameScript String?  // name in native language/script

  // Gender & pronouns
  gender          String?
  pronouns        String?

  // Dates — flexible for uncertainty
  birthDateExact  DateTime?
  birthYearEst    Int?      // estimated birth year when exact unknown
  birthAgeMin     Int?      // for age range estimates
  birthAgeMax     Int?
  birthPlace      String?
  deathDateExact  DateTime?
  deathYearEst    Int?
  deathPlace      String?
  causeOfDeath    String?

  // Status
  isDeceased      Boolean   @default(false)
  isLiving        Boolean?  // null = unknown
  isUncertain     Boolean   @default(false)
  confidenceScore Int?      // 0–100

  // Life information
  profession      String?
  education       String?
  religion        String?
  community       String?
  languages       String[]
  skills          String[]
  achievements    String[]

  // Contact — optional, private by default
  phone           String?   // stored encrypted
  email           String?   // stored encrypted
  website         String?

  // Privacy
  visibility      Visibility @default(PRIVATE)
  addedById       String?
  addedBy         User?      @relation(fields: [addedById], references: [id])

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  trees           PersonTree[]
  relationshipsA  Relationship[] @relation("PersonA")
  relationshipsB  Relationship[] @relation("PersonB")
  memories        Memory[]
  media           Media[]
}

// Many-to-many: Person ↔ Tree
model PersonTree {
  person    Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  personId  String
  tree      Tree   @relation(fields: [treeId], references: [id], onDelete: Cascade)
  treeId    String

  @@id([personId, treeId])
}

model Relationship {
  id              String           @id @default(cuid())
  personAId       String
  personA         Person           @relation("PersonA", fields: [personAId], references: [id], onDelete: Cascade)
  personBId       String
  personB         Person           @relation("PersonB", fields: [personBId], references: [id], onDelete: Cascade)

  // Type — flexible, not an enum so you can add custom types later
  type            RelationshipType
  customType      String?          // when type = CUSTOM

  // Direction: is this relationship directional? (parent-child yes, sibling no)
  isDirectional   Boolean          @default(false)
  // If directional: personA is [type] of personB
  // e.g. personA is BIOLOGICAL_PARENT of personB

  // Temporal
  startDate       DateTime?
  startYearEst    Int?
  endDate         DateTime?
  endYearEst      Int?
  isOngoing       Boolean          @default(true)

  // Uncertainty
  isUncertain     Boolean          @default(false)
  confidenceScore Int?             // 0–100
  notes           String?
  sourceNote      String?          // citation or evidence reference

  visibility      Visibility       @default(PRIVATE)
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
}

model Memory {
  id          String     @id @default(cuid())
  personId    String
  person      Person     @relation(fields: [personId], references: [id], onDelete: Cascade)

  content     String     // the memory / story / anecdote text
  isUncertain Boolean    @default(false)
  attribution String?    // who this memory came from
  addedById   String?
  addedBy     User?      @relation(fields: [addedById], references: [id])

  visibility  Visibility @default(PRIVATE)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  // Threaded replies
  parentId    String?
  parent      Memory?    @relation("MemoryThread", fields: [parentId], references: [id])
  replies     Memory[]   @relation("MemoryThread")
}

model Media {
  id          String    @id @default(cuid())
  personId    String
  person      Person    @relation(fields: [personId], references: [id], onDelete: Cascade)

  type        MediaType
  url         String    // local file path or CDN URL
  caption     String?
  takenYear   Int?
  takenPlace  String?

  visibility  Visibility @default(PRIVATE)
  createdAt   DateTime   @default(now())
}

// ─── Enums ───────────────────────────────────────────────────────────

enum Visibility {
  PUBLIC
  SHARED
  FAMILY_ONLY
  CONTRIBUTORS_ONLY
  PRIVATE
  ADMIN_ONLY
}

enum RelationshipType {
  // Parent types
  BIOLOGICAL_PARENT
  ADOPTIVE_PARENT
  FOSTER_PARENT
  STEP_PARENT
  GUARDIAN
  SURROGATE_PARENT
  UNKNOWN_PARENT

  // Partner types
  MARRIED
  DIVORCED
  ENGAGED
  PARTNER
  LIFE_PARTNER
  SEPARATED
  WIDOWED
  FORMER_PARTNER

  // Sibling types
  SIBLING
  HALF_SIBLING
  STEP_SIBLING

  // Extended family
  COUSIN
  GRANDPARENT
  AUNT_UNCLE
  NIECE_NEPHEW

  // Non-biological
  MENTOR
  CARETAKER
  FRIEND
  COMMUNITY
  TEACHER
  STUDENT
  BUSINESS

  // Non-human
  PET

  // Fallback
  CUSTOM
  UNKNOWN
}

enum MediaType {
  PHOTO
  DOCUMENT
  AUDIO
  VIDEO
}
```

### 2.5 Run the migration

```bash
npx prisma migrate dev --name init
```

This creates your database tables. You should see "Your database is now in sync."

View your database in a visual GUI:

```bash
npx prisma studio
```

It opens at `http://localhost:5555` — you can browse and edit data here.

---

## Phase 3 — Backend API (Days 3–7, ~1 week)

### 3.1 Project structure for the API

```
apps/api/src/
├── index.ts          ← entry point
├── db.ts             ← Prisma client singleton
├── middleware/
│   ├── auth.ts
│   └── errorHandler.ts
└── routes/
    ├── persons.ts
    ├── relationships.ts
    ├── memories.ts
    └── trees.ts
```

```bash
mkdir -p src/middleware src/routes
```

### 3.2 Prisma client singleton (src/db.ts)

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

### 3.3 Entry point (src/index.ts)

```typescript
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import 'dotenv/config'

import { personsRouter } from './routes/persons'
import { relationshipsRouter } from './routes/relationships'
import { memoriesRouter } from './routes/memories'
import { treesRouter } from './routes/trees'

const app = express()
const PORT = process.env.PORT || 3001

app.use(helmet())
app.use(cors({ origin: 'http://localhost:5173' }))  // Vite dev port
app.use(express.json())

// Routes
app.use('/api/persons', personsRouter)
app.use('/api/relationships', relationshipsRouter)
app.use('/api/memories', memoriesRouter)
app.use('/api/trees', treesRouter)

// Health check
app.get('/health', (_, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`)
})
```

### 3.4 Persons router (src/routes/persons.ts)

This is your most important route. Build it in full:

```typescript
import { Router } from 'express'
import { db } from '../db'

export const personsRouter = Router()

// GET /api/persons — list all (with optional tree filter)
personsRouter.get('/', async (req, res) => {
  try {
    const { treeId, search } = req.query

    const persons = await db.person.findMany({
      where: {
        ...(treeId ? { trees: { some: { treeId: String(treeId) } } } : {}),
        ...(search ? {
          OR: [
            { fullName: { contains: String(search), mode: 'insensitive' } },
            { nickname: { contains: String(search), mode: 'insensitive' } },
            { aliases: { has: String(search) } },
            { birthPlace: { contains: String(search), mode: 'insensitive' } },
          ]
        } : {}),
      },
      include: {
        trees: { include: { tree: true } },
        _count: { select: { memories: true, media: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(persons)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch persons' })
  }
})

// GET /api/persons/:id — single person with all relations
personsRouter.get('/:id', async (req, res) => {
  try {
    const person = await db.person.findUnique({
      where: { id: req.params.id },
      include: {
        trees: { include: { tree: true } },
        memories: { orderBy: { createdAt: 'desc' } },
        media: true,
        relationshipsA: {
          include: { personB: true },
        },
        relationshipsB: {
          include: { personA: true },
        },
      },
    })

    if (!person) return res.status(404).json({ error: 'Person not found' })

    res.json(person)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch person' })
  }
})

// GET /api/persons/:id/graph — person + their network (2 hops)
personsRouter.get('/:id/graph', async (req, res) => {
  try {
    const person = await db.person.findUnique({
      where: { id: req.params.id },
      include: {
        relationshipsA: { include: { personB: { include: {
          relationshipsA: { include: { personB: true } },
          relationshipsB: { include: { personA: true } },
        }}}},
        relationshipsB: { include: { personA: { include: {
          relationshipsA: { include: { personB: true } },
          relationshipsB: { include: { personA: true } },
        }}}},
      },
    })

    if (!person) return res.status(404).json({ error: 'Not found' })

    // Build flat node + edge lists for the graph view
    const nodes = new Map()
    const edges: any[] = []

    const addNode = (p: any) => {
      if (!nodes.has(p.id)) nodes.set(p.id, {
        id: p.id,
        fullName: p.fullName,
        nickname: p.nickname,
        birthYearEst: p.birthYearEst,
        birthDateExact: p.birthDateExact,
        deathYearEst: p.deathYearEst,
        isDeceased: p.isDeceased,
        isUncertain: p.isUncertain,
        gender: p.gender,
      })
    }

    addNode(person)

    const processRel = (rel: any, personA: any, personB: any) => {
      addNode(personA)
      addNode(personB)
      edges.push({
        id: rel.id,
        source: personA.id,
        target: personB.id,
        type: rel.type,
        isUncertain: rel.isUncertain,
        confidenceScore: rel.confidenceScore,
        startYearEst: rel.startYearEst,
      })
    }

    person.relationshipsA.forEach((r: any) => processRel(r, person, r.personB))
    person.relationshipsB.forEach((r: any) => processRel(r, r.personA, person))

    res.json({
      nodes: Array.from(nodes.values()),
      edges,
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to build graph' })
  }
})

// POST /api/persons — create (all fields optional)
personsRouter.post('/', async (req, res) => {
  try {
    const {
      fullName, nickname, aliases, gender, pronouns,
      birthYearEst, birthDateExact, birthPlace,
      deathYearEst, isDeceased, isUncertain,
      profession, languages, visibility,
      treeId,
    } = req.body

    const person = await db.person.create({
      data: {
        fullName,
        nickname,
        aliases: aliases || [],
        gender,
        pronouns,
        birthYearEst,
        birthDateExact: birthDateExact ? new Date(birthDateExact) : undefined,
        birthPlace,
        deathYearEst,
        isDeceased: isDeceased || false,
        isUncertain: isUncertain || false,
        profession,
        languages: languages || [],
        visibility: visibility || 'PRIVATE',
        ...(treeId ? {
          trees: { create: { treeId } }
        } : {}),
      },
    })

    res.status(201).json(person)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create person' })
  }
})

// PATCH /api/persons/:id — update any fields
personsRouter.patch('/:id', async (req, res) => {
  try {
    const person = await db.person.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(person)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update person' })
  }
})

// DELETE /api/persons/:id — soft delete (set visibility to PRIVATE + flag)
personsRouter.delete('/:id', async (req, res) => {
  try {
    // Soft delete: just set visibility to PRIVATE
    // For hard delete, use db.person.delete()
    const person = await db.person.update({
      where: { id: req.params.id },
      data: { visibility: 'PRIVATE' },
    })
    res.json({ ok: true, id: person.id })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete person' })
  }
})
```

### 3.5 Relationships router (src/routes/relationships.ts)

```typescript
import { Router } from 'express'
import { db } from '../db'

export const relationshipsRouter = Router()

// POST /api/relationships
relationshipsRouter.post('/', async (req, res) => {
  try {
    const {
      personAId, personBId, type, customType,
      isDirectional, startYearEst, endYearEst,
      isUncertain, confidenceScore, notes, sourceNote,
      visibility,
    } = req.body

    if (!personAId || !personBId || !type) {
      return res.status(400).json({ error: 'personAId, personBId, and type are required' })
    }

    const relationship = await db.relationship.create({
      data: {
        personAId, personBId, type, customType,
        isDirectional: isDirectional || false,
        startYearEst, endYearEst,
        isUncertain: isUncertain || false,
        confidenceScore,
        notes, sourceNote,
        visibility: visibility || 'PRIVATE',
      },
      include: {
        personA: true,
        personB: true,
      },
    })

    res.status(201).json(relationship)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create relationship' })
  }
})

// DELETE /api/relationships/:id
relationshipsRouter.delete('/:id', async (req, res) => {
  try {
    await db.relationship.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete relationship' })
  }
})
```

### 3.6 Add scripts to apps/api/package.json

```json
{
  "scripts": {
    "dev": "nodemon --exec tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

### 3.7 Test the API

```bash
# Start the API
pnpm dev

# In another terminal, test it:
curl -X POST http://localhost:3001/api/persons \
  -H "Content-Type: application/json" \
  -d '{"fullName": "Gopal Sharma", "birthYearEst": 1928, "isDeceased": true, "isUncertain": true}'

# Should return the created person with an ID
```

---

## Phase 4 — Frontend (Days 8–14, ~1 week)

### 4.1 Scaffold the React app

```bash
cd apps/web
pnpm create vite . --template react-ts
pnpm install
```

Install key dependencies:

```bash
# Graph visualization
pnpm add @xyflow/react

# HTTP client
pnpm add axios

# Routing
pnpm add react-router-dom

# UI utilities
pnpm add clsx

# Icons (already using Tabler in the prototype)
pnpm add @tabler/icons-react
```

### 4.2 Project structure for the frontend

```
apps/web/src/
├── main.tsx
├── App.tsx
├── api/
│   ├── client.ts       ← axios instance
│   ├── persons.ts
│   └── relationships.ts
├── components/
│   ├── graph/
│   │   ├── GraphView.tsx
│   │   ├── PersonNode.tsx
│   │   └── RelationshipEdge.tsx
│   ├── panel/
│   │   ├── DetailPanel.tsx
│   │   └── MemoryCard.tsx
│   ├── modals/
│   │   └── AddPersonModal.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       └── Topbar.tsx
├── pages/
│   ├── GraphPage.tsx
│   ├── PeoplePage.tsx
│   └── TimelinePage.tsx
├── hooks/
│   ├── usePersons.ts
│   └── useGraph.ts
├── types/
│   └── index.ts
└── styles/
    └── global.css
```

### 4.3 API client (src/api/client.ts)

```typescript
import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
})

// Add auth token later when you add authentication
// api.interceptors.request.use(config => {
//   const token = localStorage.getItem('token')
//   if (token) config.headers.Authorization = `Bearer ${token}`
//   return config
// })
```

### 4.4 Persons API hooks (src/api/persons.ts)

```typescript
import { api } from './client'

export const personsApi = {
  list: (params?: { treeId?: string; search?: string }) =>
    api.get('/persons', { params }).then(r => r.data),

  get: (id: string) =>
    api.get(`/persons/${id}`).then(r => r.data),

  getGraph: (id: string) =>
    api.get(`/persons/${id}/graph`).then(r => r.data),

  create: (data: Partial<Person>) =>
    api.post('/persons', data).then(r => r.data),

  update: (id: string, data: Partial<Person>) =>
    api.patch(`/persons/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/persons/${id}`).then(r => r.data),
}
```

### 4.5 Graph view with React Flow (src/components/graph/GraphView.tsx)

```typescript
import { useCallback, useEffect, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { personsApi } from '../../api/persons'
import { PersonNode } from './PersonNode'

const nodeTypes = { person: PersonNode }

interface GraphViewProps {
  rootPersonId?: string
  onNodeClick: (personId: string) => void
}

export function GraphView({ rootPersonId, onNodeClick }: GraphViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!rootPersonId) return
    setLoading(true)

    personsApi.getGraph(rootPersonId).then(({ nodes: gNodes, edges: gEdges }) => {
      // Auto-layout: place nodes in a simple radial layout
      const center = { x: 400, y: 300 }
      const radius = 200

      const reactFlowNodes: Node[] = gNodes.map((n: any, i: number) => {
        const isCenter = n.id === rootPersonId
        const angle = (i / gNodes.length) * 2 * Math.PI
        return {
          id: n.id,
          type: 'person',
          position: isCenter
            ? center
            : { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) },
          data: n,
        }
      })

      const reactFlowEdges: Edge[] = gEdges.map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.type.toLowerCase().replace(/_/g, ' '),
        style: {
          stroke: e.isUncertain ? '#8a8078' : '#b8934a',
          strokeDasharray: e.isUncertain ? '5 3' : undefined,
          strokeWidth: 1.5,
        },
        labelStyle: { fontSize: 10, fill: '#8a8078' },
      }))

      setNodes(reactFlowNodes)
      setEdges(reactFlowEdges)
      setLoading(false)
    })
  }, [rootPersonId])

  const handleNodeClick = useCallback((_: any, node: Node) => {
    onNodeClick(node.id)
  }, [onNodeClick])

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {loading && <div style={{ padding: 24, color: '#8a8078' }}>Loading graph…</div>}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
      >
        <Background color="#e2ddd4" gap={40} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  )
}
```

### 4.6 Custom person node (src/components/graph/PersonNode.tsx)

```typescript
import { Handle, Position } from '@xyflow/react'

interface PersonNodeProps {
  data: {
    id: string
    fullName?: string
    nickname?: string
    birthYearEst?: number
    deathYearEst?: number
    isDeceased: boolean
    isUncertain: boolean
    gender?: string
  }
  selected: boolean
}

export function PersonNode({ data, selected }: PersonNodeProps) {
  const initials = data.fullName
    ? data.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : data.nickname?.[0]?.toUpperCase() || '?'

  const displayName = data.fullName || data.nickname || 'Unknown'
  const years = data.birthYearEst || data.deathYearEst
    ? `${data.birthYearEst ? 'c.' + data.birthYearEst : '?'} ${data.deathYearEst ? '– ' + data.deathYearEst : data.isDeceased ? '– ?' : ''}`
    : null

  return (
    <div style={{
      background: '#f7f4ef',
      border: `1px ${data.isUncertain ? 'dashed' : 'solid'} ${selected ? '#b8934a' : 'rgba(26,23,20,0.15)'}`,
      borderRadius: 12,
      padding: '10px 12px',
      minWidth: 110,
      textAlign: 'center',
      opacity: data.isDeceased ? 0.75 : 1,
      boxShadow: selected ? '0 0 0 3px rgba(184,147,74,0.2)' : '0 2px 8px rgba(26,23,20,0.08)',
      cursor: 'pointer',
    }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />

      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: '#e3edf7', color: '#1d5a8a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 6px',
        fontFamily: 'Cormorant Garamond, serif',
        fontSize: 15, fontWeight: 500,
      }}>
        {initials}
      </div>

      <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1714', lineHeight: 1.3 }}>
        {displayName}
      </div>

      {years && (
        <div style={{ fontSize: 10, color: '#8a8078', marginTop: 2 }}>{years}</div>
      )}

      {data.isUncertain && (
        <div style={{
          fontSize: 9, padding: '1px 5px', borderRadius: 20,
          border: '1px dashed #8a8078', color: '#8a8078',
          display: 'inline-block', marginTop: 4,
        }}>
          Uncertain
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  )
}
```

### 4.7 Add Vite env config

Create `apps/web/.env.local`:

```
VITE_API_URL=http://localhost:3001/api
```

### 4.8 Run the frontend

```bash
pnpm dev
```

Opens at `http://localhost:5173`. The graph view will connect to your API at port 3001.

---

## Phase 5 — Authentication (Week 3, ~3 days)

Authentication is a full topic. The fastest approach for a personal/family tool is **Clerk**.

### 5.1 Option A: Clerk (recommended for speed)

```bash
# Sign up at https://clerk.com — free tier is sufficient
# Create an application, get your API keys

# In apps/web:
pnpm add @clerk/clerk-react

# In apps/api:
pnpm add @clerk/express
```

In `apps/web/src/main.tsx`:

```typescript
import { ClerkProvider } from '@clerk/clerk-react'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
    <App />
  </ClerkProvider>
)
```

In `apps/api/src/middleware/auth.ts`:

```typescript
import { clerkMiddleware, requireAuth } from '@clerk/express'

export { clerkMiddleware, requireAuth }
```

Then in `apps/api/src/index.ts`:

```typescript
import { clerkMiddleware } from './middleware/auth'
app.use(clerkMiddleware())

// Protect routes
app.use('/api/persons', requireAuth(), personsRouter)
```

### 5.2 Option B: Simple JWT (no third party)

If you want full control and no external service, use JWT with bcrypt for a password-based auth flow. This takes an extra 2–3 days to implement correctly. Choose this if you want truly self-hosted.

---

## Phase 6 — Privacy & Permissions (Week 4, ~3 days)

### 6.1 Add user ID to all entities

After auth is set up, every create call should attach the authenticated user's ID:

```typescript
// In the persons router, after setting up auth middleware:
personsRouter.post('/', requireAuth(), async (req, res) => {
  const userId = req.auth.userId  // from Clerk (or your JWT)

  const person = await db.person.create({
    data: {
      ...req.body,
      addedById: userId,
    },
  })
  res.status(201).json(person)
})
```

### 6.2 Filter by visibility

Add this helper to `src/db.ts`:

```typescript
export function visibilityFilter(userId?: string) {
  if (!userId) return { visibility: 'PUBLIC' as const }
  return {
    OR: [
      { visibility: 'PUBLIC' as const },
      { addedById: userId },
    ],
  }
}
```

Use it in queries:

```typescript
const persons = await db.person.findMany({
  where: {
    ...visibilityFilter(req.auth?.userId),
    // other filters...
  }
})
```

---

## Phase 7 — Seed Data & Local Testing (Ongoing)

### 7.1 Create a seed file (apps/api/prisma/seed.ts)

```typescript
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  // Create a tree
  const tree = await db.tree.create({
    data: {
      name: 'Sharma family',
      color: '#b8934a',
      owner: { create: { name: 'Ravi Sharma' } }
    },
    include: { owner: true }
  })

  // Create persons
  const gopal = await db.person.create({
    data: {
      fullName: 'Gopal Sharma',
      birthYearEst: 1928,
      deathYearEst: 1994,
      birthPlace: 'Hisar, Haryana',
      isDeceased: true,
      isUncertain: true,
      confidenceScore: 65,
      trees: { create: { treeId: tree.id } },
      addedById: tree.ownerId,
    }
  })

  const savitri = await db.person.create({
    data: {
      fullName: 'Savitri Bai',
      birthYearEst: 1932,
      deathYearEst: 2008,
      isDeceased: true,
      trees: { create: { treeId: tree.id } },
      addedById: tree.ownerId,
    }
  })

  // Create marriage relationship
  await db.relationship.create({
    data: {
      personAId: gopal.id,
      personBId: savitri.id,
      type: 'MARRIED',
      startYearEst: 1955,
      isUncertain: true,
    }
  })

  // Add a memory
  await db.memory.create({
    data: {
      personId: gopal.id,
      content: 'Used to travel village-to-village selling handmade tools.',
      attribution: 'Family oral history',
      isUncertain: true,
      addedById: tree.ownerId,
    }
  })

  console.log('Seed complete.')
}

main().then(() => db.$disconnect()).catch(console.error)
```

Run the seed:

```bash
pnpm db:seed
```

---

## Phase 8 — Polish & Additional Features (Weeks 5–8)

These are ordered by impact — do them in this sequence.

### 8.1 Export to JSON / CSV

Add a route to export a full tree:

```typescript
// GET /api/trees/:id/export
treesRouter.get('/:id/export', async (req, res) => {
  const persons = await db.person.findMany({
    where: { trees: { some: { treeId: req.params.id } } },
    include: {
      relationshipsA: true,
      relationshipsB: true,
      memories: true,
    }
  })

  res.setHeader('Content-Disposition', `attachment; filename="kinroot-export-${req.params.id}.json"`)
  res.json({ exportedAt: new Date(), persons })
})
```

### 8.2 Fuzzy search

Install `fuse.js` for client-side fuzzy search:

```bash
pnpm add fuse.js   # in apps/web
```

```typescript
import Fuse from 'fuse.js'

const fuse = new Fuse(persons, {
  keys: ['fullName', 'nickname', 'aliases', 'birthPlace'],
  threshold: 0.35,  // 0 = exact, 1 = anything
})

const results = fuse.search(query).map(r => r.item)
```

### 8.3 Timeline view

Query all persons with dates, sort chronologically, render as a vertical list. The prototype HTML already has the design — port it to React with real data from your API.

### 8.4 File uploads (photos, documents)

```bash
# In apps/api:
pnpm add multer @types/multer

# For local storage (start here, migrate to S3 later)
```

```typescript
import multer from 'multer'
import path from 'path'

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (_, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`)
  }
})

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })  // 10MB

mediaRouter.post('/:personId', upload.single('file'), async (req, res) => {
  const media = await db.media.create({
    data: {
      personId: req.params.personId,
      type: 'PHOTO',
      url: `/uploads/${req.file?.filename}`,
      caption: req.body.caption,
    }
  })
  res.json(media)
})
```

### 8.5 GEDCOM import (future)

GEDCOM is the standard genealogy file format. When ready:

```bash
pnpm add parse-gedcom
```

Write an import route that parses a .ged file and bulk-creates Person + Relationship records.

---

## Phase 9 — Deployment (When Ready)

### 9.1 Self-hosted on your Mac (LAN access)

To access Kinroot from other devices on your home network:

1. Find your Mac's local IP: `ipconfig getifaddr en0`
2. Change the Vite config to bind to `0.0.0.0`:

```typescript
// apps/web/vite.config.ts
export default defineConfig({
  server: { host: '0.0.0.0', port: 5173 }
})
```

3. Access from phone/tablet at `http://192.168.x.x:5173`

### 9.2 Production deployment (cloud)

When you're ready to put it online:

**Database**: Railway (https://railway.app) or Supabase — both have free Postgres tiers.

**API**: Railway or Render — connect your GitHub repo, set environment variables, deploy.

**Frontend**: Vercel — connect your GitHub repo, set `VITE_API_URL` to your deployed API URL.

Cost: ~$0–$7/month on free tiers.

---

## Quick Reference — Daily Commands

```bash
# Start everything (from root)
pnpm dev

# Start just the API
cd apps/api && pnpm dev

# Start just the frontend
cd apps/web && pnpm dev

# Open database GUI
cd apps/api && pnpm db:studio

# Create a new database migration after schema change
cd apps/api && npx prisma migrate dev --name describe_your_change

# Reset the database (wipes all data)
cd apps/api && npx prisma migrate reset

# Run the seed file
cd apps/api && pnpm db:seed

# Check what's running on a port
lsof -i :3001
lsof -i :5173

# Kill a process on a port
kill -9 $(lsof -t -i:3001)
```

---

## Milestones Checklist

- [ ] Phase 0 — Mac fully set up (Node, Postgres, VS Code)
- [ ] Phase 1 — Monorepo scaffolded, git initialized
- [ ] Phase 2 — Database schema migrated, Prisma Studio working
- [ ] Phase 3 — API running, can create a person via curl
- [ ] Phase 4 — React app running, graph view fetches real data
- [ ] Phase 5 — Auth working, login/logout functional
- [ ] Phase 6 — Privacy filters applied, private data protected
- [ ] Phase 7 — Seed data loaded, all views working end-to-end
- [ ] Phase 8a — JSON export working
- [ ] Phase 8b — Fuzzy search working
- [ ] Phase 8c — Photo upload working
- [ ] Phase 9 — Accessible on home network or deployed to cloud

---

## Resources

| Topic | Resource |
|---|---|
| Prisma docs | https://prisma.io/docs |
| React Flow | https://reactflow.dev |
| Express | https://expressjs.com |
| Vite | https://vitejs.dev |
| Clerk auth | https://clerk.com/docs |
| Tailwind CSS | https://tailwindcss.com |
| Homebrew | https://brew.sh |
| nvm | https://github.com/nvm-sh/nvm |

---

*Generated for Kinroot — Human Relationship Archive*
*Stack: React + Vite · Node.js + Express · PostgreSQL + Prisma · React Flow*
