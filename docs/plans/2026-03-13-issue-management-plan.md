# Single-level Issue Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement single-level issue decomposition (Sub-tasks) in `fizzy-popper` with local-only storage and a dedicated UI in the existing Kanban board.

**Architecture:** Extend the `Issue` model with a self-referencing `parentId` field. Update API routes to handle hierarchy. Enhance the frontend with a sub-task management panel in the issue details view.

**Tech Stack:** Prisma (SQLite), Hono, Vue 3, Pinia, Tailwind CSS.

---

### Task 1: Backend Schema Update

**Files:**
- Modify: `packages/api/prisma/schema.prisma:10-23`

**Step 1: Update Prisma schema with self-relation**

```prisma
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

  parentId     String?
  parent       Issue?   @relation("SubTasks", fields: [parentId], references: [id])
  subTasks     Issue[]  @relation("SubTasks")

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

**Step 2: Run migration**

Run: `cd packages/api && npx prisma migrate dev --name add_parent_id`
Expected: SUCCESS

**Step 3: Commit**

```bash
git add packages/api/prisma/schema.prisma
git commit -m "feat(api): Add parentId to Issue model"
```

---

### Task 2: API Route Enhancements

**Files:**
- Modify: `packages/api/src/routes/issues.ts:7-12`
- Modify: `packages/api/src/routes/issues.ts:14-18`

**Step 1: Update GET /api/issues to only return top-level issues**

```typescript
router.get('/', async (c) => {
  const issues = await prisma.issue.findMany({
    where: { parentId: null },
    orderBy: { createdAt: 'asc' }
  })
  return c.json(issues)
})
```

**Step 2: Add GET /api/issues/:id/subtasks route**

```typescript
router.get('/:id/subtasks', async (c) => {
  const id = c.req.param('id')
  const subtasks = await prisma.issue.findMany({
    where: { parentId: id },
    orderBy: { createdAt: 'asc' }
  })
  return c.json(subtasks)
})
```

**Step 3: Update POST /api/issues to support parentId**

```typescript
router.post('/', async (c) => {
  const body = await c.req.json()
  const issue = await prisma.issue.create({ data: body })
  return c.json(issue)
})
```

**Step 4: Commit**

```bash
git add packages/api/src/routes/issues.ts
git commit -m "feat(api): Support hierarchy in issue routes"
```

---

### Task 3: Frontend Store Updates

**Files:**
- Modify: `packages/web/src/stores/issues.ts:5-15`
- Modify: `packages/web/src/stores/issues.ts:17-74`

**Step 1: Update Issue interface and add sub-task management**

```typescript
export interface Issue {
  id: string
  title: string
  description: string
  status: string
  assignee: string | null
  agentStatus: string | null
  workspaceUrl: string | null
  startTime: string | null
  agentConfig: string | null
  parentId?: string | null
  subTasks?: Issue[]
}

export const useIssueStore = defineStore('issues', () => {
  const issues = ref<Issue[]>([])
  // ... existing code ...

  const createSubTask = async (parentId: string, title: string) => {
    const res = await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: '', status: 'todo', parentId })
    })
    const subTask = await res.json()
    const parent = issues.value.find(i => i.id === parentId)
    if (parent) {
      if (!parent.subTasks) parent.subTasks = []
      parent.subTasks.push(subTask)
    }
  }

  const deleteIssue = async (id: string) => {
    await fetch(`/api/issues/${id}`, { method: 'DELETE' })
    issues.value = issues.value.filter(i => i.id !== id)
    // Also remove from any subTasks lists
    issues.value.forEach(i => {
      if (i.subTasks) i.subTasks = i.subTasks.filter(s => s.id !== id)
    })
  }

  // ... Update connectWebSocket to handle sub-task updates ...
})
```

**Step 2: Commit**

```bash
git add packages/web/src/stores/issues.ts
git commit -m "feat(web): Add sub-task management to issue store"
```

---

### Task 4: UI Components - SubTaskList and AddSubTask

**Files:**
- Create: `packages/web/src/components/SubTaskList.vue`
- Create: `packages/web/src/components/AddSubTask.vue`
- Modify: `packages/web/src/components/AgentStudio.vue`

**Step 1: Create AddSubTask.vue component**

```vue
<template>
  <form @submit.prevent="submit" class="mt-4">
    <input 
      v-model="title" 
      class="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      placeholder="Add a sub-task…" 
    />
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const title = ref('')
const emit = defineEmits(['add'])
const submit = () => {
  if (title.value.trim()) {
    emit('add', title.value)
    title.value = ''
  }
}
</script>
```

**Step 2: Create SubTaskList.vue component**

```vue
<template>
  <div class="space-y-2">
    <div v-for="task in subTasks" :key="task.id" class="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
      <input 
        type="checkbox" 
        :checked="task.status === 'done'"
        @change="$emit('toggle', task)"
        class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <span :class="{ 'line-through text-gray-400': task.status === 'done' }" class="text-sm flex-1">
        {{ task.title }}
      </span>
      <button @click="$emit('delete', task.id)" class="text-gray-400 hover:text-red-500">
        <TrashIcon class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TrashIcon } from '@heroicons/vue/24/outline'
import type { Issue } from '../stores/issues'
defineProps<{ subTasks: Issue[] }>()
defineEmits(['toggle', 'delete'])
</script>
```

**Step 3: Integrate into AgentStudio.vue**

Add a "Sub-tasks" tab and use the new components.

**Step 4: Commit**

```bash
git add packages/web/src/components/SubTaskList.vue packages/web/src/components/AddSubTask.vue packages/web/src/components/AgentStudio.vue
git commit -m "feat(web): Implement sub-task UI components"
```

---

### Task 5: Issue Card Indicators

**Files:**
- Modify: `packages/web/src/components/IssueCard.vue`

**Step 1: Add sub-task progress indicator**

```vue
<template>
  <!-- ... existing code ... -->
  <div v-if="issue.subTasks?.length" class="flex items-center gap-1 mt-2 text-xs text-gray-500">
    <CheckCircleIcon class="h-3 w-3" />
    <span>{{ completedCount }}/{{ issue.subTasks.length }}</span>
  </div>
  <!-- ... -->
</template>
```

**Step 2: Commit**

```bash
git add packages/web/src/components/IssueCard.vue
git commit -m "feat(web): Show sub-task progress on issue cards"
```

---

### Task 6: Final Review and Guidelines Compliance

**Files:**
- All modified files

**Step 1: Review against Web Interface Guidelines**

Run: `npx opencode-ai skill web-design-guidelines packages/web/src/components/`
Check for: Accessibility, Focus states, Form labels, Typography (…), Animation.

**Step 2: Fix any compliance issues**

**Step 3: Commit**

```bash
git add .
git commit -m "style: Ensure compliance with Web Interface Guidelines"
```
