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
