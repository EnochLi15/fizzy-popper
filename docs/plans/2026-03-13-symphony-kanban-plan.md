# Symphony Kanban Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a standalone AI Kanban board using a Vue 3 frontend and Node.js + Hono + Prisma + SQLite backend.

**Architecture:** A pnpm workspaces monorepo containing `packages/web` (Vue 3/Vite/Tailwind) and `packages/api` (Hono/Prisma/WebSocket).

**Tech Stack:** Vue 3, Vite, TailwindCSS, Pinia, Node.js, Hono, Prisma, SQLite, WebSockets.

---

### Task 1: Scaffold monorepo & pnpm workspace

**Files:**
- Create: `pnpm-workspace.yaml`
- Modify: `package.json`

**Step 1: Initialize workspaces config**
```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

**Step 2: Update root package.json**
Add simple scaffolding or update `package.json` to support the new workspace if needed. Currently it has `workspaces: ["packages/*"]` for npm, we will switch it to pnpm workspace.
```bash
npm install -g pnpm
```

**Step 3: Commit**
```bash
git add pnpm-workspace.yaml package.json
git commit -m "chore: setup pnpm workspace"
```

---

### Task 2: Scaffold Backend (packages/api)

**Files:**
- Create: `packages/api/package.json`
- Create: `packages/api/prisma/schema.prisma`
- Create: `packages/api/src/index.ts`

**Step 1: Init package & deps**
```bash
mkdir -p packages/api/src
cd packages/api
pnpm init
pnpm add hono @hono/node-server @prisma/client sqlite3 ws
pnpm add -D prisma typescript @types/node tsx vitest @types/ws
```

**Step 2: Create Prisma Schema**
```prisma
// packages/api/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./symphony.db"
}

model Issue {
  id           String   @id @default(cuid())
  title        String
  description  String
  status       String   @default("todo") // todo, in_progress, in_review, done
  assignee     String?  // human, ai
  agentStatus  String?  // initializing, writing_code, waiting_input, completed
  workspaceUrl String?
  startTime    DateTime?
  agentConfig  String?  // JSON serialized

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

**Step 3: Setup minimal Hono server**
```typescript
// packages/api/src/index.ts
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client'

const app = new Hono()
const prisma = new PrismaClient()

app.get('/api/health', (c) => c.json({ status: 'ok' }))

const port = 3001
serve({ fetch: app.fetch, port }, () => {
  console.log(`API running on http://localhost:${port}`)
})
```

**Step 4: Commit**
```bash
git add packages/api
git commit -m "feat(api): scaffold hono backend and prisma schema"
```

---

### Task 3: Scaffold Frontend (packages/web)

**Files:**
- Create: `packages/web/package.json`
- Create: `packages/web/vite.config.ts`

**Step 1: Create Vue 3 project**
```bash
cd packages
pnpm create vite web --template vue-ts
cd web
pnpm add vue-router pinia tailwindcss @tailwindcss/vite
```

**Step 2: Setup Tailwind**
```typescript
// packages/web/vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
```

**Step 3: Commit**
```bash
git add packages/web
git commit -m "feat(web): scaffold vue 3 frontend with tailwind"
```

---

### Task 4: Implement API Routes for Issues

**Files:**
- Create: `packages/api/src/routes/issues.ts`
- Modify: `packages/api/src/index.ts`

**Step 1: Implement Issue CRUD routes**
```typescript
// packages/api/src/routes/issues.ts
import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client'

const router = new Hono()
const prisma = new PrismaClient()

router.get('/', async (c) => {
  const issues = await prisma.issue.findMany()
  return c.json(issues)
})

router.post('/', async (c) => {
  const body = await c.req.json()
  const issue = await prisma.issue.create({ data: body })
  return c.json(issue)
})

router.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const issue = await prisma.issue.update({ where: { id }, data: body })
  return c.json(issue)
})

export default router
```

**Step 2: Register in index**
```typescript
// packages/api/src/index.ts
import issueRoutes from './routes/issues'
// ...
app.route('/api/issues', issueRoutes)
```

**Step 3: Commit**
```bash
git add packages/api
git commit -m "feat(api): implement issues CRUD routes"
```

---

### Task 5: Implement WebSocket Streaming Hub

**Files:**
- Create: `packages/api/src/ws.ts`
- Modify: `packages/api/src/index.ts`

**Step 1: Implement Hub**
```typescript
// packages/api/src/ws.ts
import { WebSocketServer, WebSocket } from 'ws'

const clients = new Set<WebSocket>()

export const initWebSocket = (server: any) => {
  const wss = new WebSocketServer({ server })
  
  wss.on('connection', (ws) => {
    clients.add(ws)
    ws.on('close', () => clients.delete(ws))
  })
}

export const broadcastEvent = (issueId: string, event: any) => {
  const payload = JSON.stringify({ issueId, ...event })
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload)
    }
  }
}
```

**Step 2: Integrate with Hono node server**
```typescript
// packages/api/src/index.ts
import { initWebSocket } from './ws'
// ...
const server = serve({ fetch: app.fetch, port }, () => {
  console.log(`API running on http://localhost:${port}`)
})
initWebSocket(server as any)
```

**Step 3: Commit**
```bash
git add packages/api
git commit -m "feat(api): add websocket hub for agent logs"
```
