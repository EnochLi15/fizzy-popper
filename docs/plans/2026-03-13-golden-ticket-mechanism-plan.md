# Golden Ticket Mechanism Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement automated agent dispatch based on Kanban column states using "Golden Tickets" (special configuration issues).

**Architecture:** Extend the `Issue` model with configuration fields. Implement auto-triggering logic in the status update route. Update the agent manager to build prompts using these tickets and hierarchical context. Add a dedicated configuration UI to column headers.

**Tech Stack:** Prisma (SQLite), Hono, Vue 3, Pinia, Tailwind CSS.

---

### Task 1: Backend Schema Update

**Files:**
- Modify: `packages/api/prisma/schema.prisma`

**Step 1: Update Prisma schema with Golden Ticket fields**

```prisma
model Issue {
  // ... existing fields ...
  isGoldenTicket Boolean @default(false)
  tags           String? // Comma-separated tags: #claude, #move-to-done, etc.
  // ... existing fields ...
}
```

**Step 2: Run migration**

Run: `cd packages/api && npx prisma migrate dev --name add_golden_ticket_fields`
Expected: SUCCESS

**Step 3: Commit**

```bash
git add packages/api/prisma/schema.prisma
git commit -m "feat(api): Add Golden Ticket fields to Issue model"
```

---

### Task 2: Backend Discovery and Auto-Dispatch

**Files:**
- Modify: `packages/api/src/routes/issues.ts`

**Step 1: Update PATCH /api/issues/:id to trigger agent on status change**

```typescript
router.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  
  const oldIssue = await prisma.issue.findUnique({ where: { id } })
  const issue = await prisma.issue.update({ where: { id }, data: body })
  
  // If status changed and it's not a golden ticket itself
  if (body.status && oldIssue?.status !== body.status && !issue.isGoldenTicket) {
    const goldenTicket = await prisma.issue.findFirst({
      where: { status: body.status, isGoldenTicket: true }
    })
    
    if (goldenTicket) {
      // Auto-start agent if a config exists for this column
      agentManager.start(id)
    }
  }
  
  return c.json(issue)
})
```

**Step 2: Commit**

```bash
git add packages/api/src/routes/issues.ts
git commit -m "feat(api): Implement auto-dispatch on status change"
```

---

### Task 3: Agent Manager Enhancements (Prompt & Context)

**Files:**
- Modify: `packages/api/src/agent-manager.ts`

**Step 1: Update `start` method to assemble prompt from Golden Ticket and hierarchy**

```typescript
async start(issueId: string) {
  // ... existing check ...
  const issue = await prisma.issue.findUnique({ 
    where: { id: issueId },
    include: { parent: true } 
  })
  if (!issue) return

  // Find Golden Ticket for current column
  const goldenTicket = await prisma.issue.findFirst({
    where: { status: issue.status, isGoldenTicket: true }
  })

  // Assemble system instructions
  let systemPrompt = goldenTicket?.description || "Work on the following issue."
  
  // Add hierarchical context if sub-task
  let context = ""
  if (issue.parent) {
    context = `\n\nParent Issue Context:\nTitle: ${issue.parent.title}\nDescription: ${issue.parent.description}\n---\n`
  }

  const finalPrompt = `${systemPrompt}${context}\n\nTask to complete:\nTitle: ${issue.title}\nDescription: ${issue.description}`

  // ... Update SDK prompt call with finalPrompt ...
}
```

**Step 2: Commit**

```bash
git add packages/api/src/agent-manager.ts
git commit -m "feat(api): Support prompt assembly and hierarchical context"
```

---

### Task 4: UI - Agent Configuration Modal

**Files:**
- Create: `packages/web/src/components/AgentConfigModal.vue`
- Modify: `packages/web/src/components/KanbanColumn.vue`

**Step 1: Create AgentConfigModal.vue**

Form to edit `description` (System Prompt) and `tags` (Backend/Action) for the column's Golden Ticket. Use `isGoldenTicket: true` and current `status`.

**Step 2: Integrate into KanbanColumn.vue header**

Add a gear icon next to the column title that opens the modal.

**Step 3: Commit**

```bash
git add packages/web/src/components/AgentConfigModal.vue packages/web/src/components/KanbanColumn.vue
git commit -m "feat(web): Add column configuration UI"
```

---

### Task 4: UI - Kanban Filtering

**Files:**
- Modify: `packages/web/src/components/KanbanBoard.vue`

**Step 1: Filter out Golden Tickets from the main board**

```vue
<!-- KanbanBoard.vue -->
<KanbanColumn 
  :issues="store.issues.filter(i => i.status === col.id && !i.isGoldenTicket)"
  ...
/>
```

**Step 2: Commit**

```bash
git add packages/web/src/components/KanbanBoard.vue
git commit -m "feat(web): Filter out Golden Tickets from Kanban view"
```

---

### Task 5: UI - Visual Feedback (Pulse & Status)

**Files:**
- Modify: `packages/web/src/components/IssueCard.vue`

**Step 1: Add pulse animation when in_progress**

**Step 2: Display current agentStatus**

**Step 3: Commit**

```bash
git add packages/web/src/components/IssueCard.vue
git commit -m "feat(web): Add pulse animation and status display to cards"
```
