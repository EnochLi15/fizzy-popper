import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client'
import issueRoutes from './routes/issues'
import { initWebSocket } from './ws'

const app = new Hono()
const prisma = new PrismaClient()

app.get('/api/health', (c) => c.json({ status: 'ok' }))
app.route('/api/issues', issueRoutes)

const port = 3001
const server = serve({ fetch: app.fetch, port }, () => {
  console.log(`API running on http://localhost:${port}`)
})
initWebSocket(server as any)
