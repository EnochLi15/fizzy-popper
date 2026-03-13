import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
import { agentManager } from '../agent-manager.js'

const router = new Hono()

router.get('/', async (c) => {
  const issues = await prisma.issue.findMany({
    where: { parentId: null },
    orderBy: { createdAt: 'asc' }
  })
  return c.json(issues)
})

router.get('/:id/subtasks', async (c) => {
  const id = c.req.param('id')
  const subtasks = await prisma.issue.findMany({
    where: { parentId: id },
    orderBy: { createdAt: 'asc' }
  })
  return c.json(subtasks)
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

router.delete('/:id', async (c) => {
  const id = c.req.param('id')
  await prisma.issue.delete({ where: { id } })
  return c.json({ success: true })
})

router.post('/:id/start-agent', async (c) => {
  const id = c.req.param('id')
  agentManager.start(id)
  return c.json({ success: true })
})

router.post('/:id/intervention', async (c) => {
  const id = c.req.param('id')
  const { content } = await c.req.json()
  agentManager.sendIntervention(id, content)
  return c.json({ success: true })
})

router.post('/:id/kill', async (c) => {
  const id = c.req.param('id')
  agentManager.stop(id)
  return c.json({ success: true })
})

export default router
