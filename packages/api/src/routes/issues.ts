import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client'

const router = new Hono()
const prisma = new PrismaClient()

router.get('/', async (c) => {
  const issues = await prisma.issue.findMany({
    orderBy: { createdAt: 'asc' }
  })
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

router.delete('/:id', async (c) => {
  const id = c.req.param('id')
  await prisma.issue.delete({ where: { id } })
  return c.json({ success: true })
})

router.post('/:id/intervention', async (c) => {
  const id = c.req.param('id')
  const { content } = await c.req.json()
  console.log(`Intervention for \${id}: \${content}`)
  return c.json({ success: true })
})

router.post('/:id/kill', async (c) => {
  const id = c.req.param('id')
  console.log(`Kill agent for \${id}`)
  return c.json({ success: true })
})

export default router
