# Symphony Kanban Phase 2: Frontend UI & State Management

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the Kanban Board UI, Pinia state management, and real-time WebSocket connection in the Vue 3 frontend.

**Architecture:** We will create a Pinia store (`useIssueStore`) to handle REST API calls and WebSocket connections. The UI will consist of a main `KanbanBoard` component with `KanbanColumn` and `IssueCard` components. A right-drawer component `AgentStudio` will display real-time logs.

**Tech Stack:** Vue 3, Pinia, TailwindCSS, VueUse (for WebSocket if desired, or native WS).

---

### Task 1: Setup Pinia Store & API Integration

**Files:**
- Create: `packages/web/src/stores/issues.ts`

**Step 1: Implement `useIssueStore`**
```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'

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
}

export const useIssueStore = defineStore('issues', () => {
  const issues = ref<Issue[]>([])
  const isLoading = ref(false)

  const fetchIssues = async () => {
    isLoading.value = true
    try {
      const res = await fetch('/api/issues')
      issues.value = await res.json()
    } finally {
      isLoading.value = false
    }
  }

  const updateIssueStatus = async (id: string, status: string) => {
    // Optimistic update
    const issue = issues.value.find(i => i.id === id)
    if (issue) issue.status = status
    
    await fetch(`/api/issues/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
  }

  return { issues, isLoading, fetchIssues, updateIssueStatus }
})
```

**Step 2: Add `pinia` to main.ts**
Edit `packages/web/src/main.ts` to use Pinia:
```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
```

**Step 3: Commit**
```bash
git add packages/web/src
git commit -m "feat(web): setup pinia store and api integration"
```

---

### Task 2: Build Kanban Components

**Files:**
- Create: `packages/web/src/components/KanbanBoard.vue`
- Create: `packages/web/src/components/KanbanColumn.vue`
- Create: `packages/web/src/components/IssueCard.vue`

**Step 1: Implement `IssueCard.vue`**
A simple card displaying title and assignee. Show a 🤖 if assigned to 'ai'.
```vue
<template>
  <div class="bg-white p-3 rounded shadow-sm border border-gray-200 cursor-move hover:border-blue-400 transition-colors">
    <div class="flex justify-between items-start mb-2">
      <h4 class="font-medium text-gray-800 text-sm">{{ issue.title }}</h4>
      <span v-if="issue.assignee === 'ai'" class="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded flex items-center gap-1">
        🤖 AI
      </span>
    </div>
    <div v-if="issue.status === 'in_progress' && issue.agentStatus" class="flex items-center gap-2 mt-2">
      <span class="flex h-2 w-2 relative">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
      </span>
      <span class="text-xs text-gray-500 italic">{{ issue.agentStatus }}...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Issue } from '../stores/issues'
defineProps<{ issue: Issue }>()
</script>
```

**Step 2: Implement `KanbanColumn.vue`**
```vue
<template>
  <div class="flex flex-col bg-gray-50 rounded-lg w-80 shrink-0 h-full max-h-full">
    <div class="p-3 border-b border-gray-200 flex justify-between items-center">
      <h3 class="font-semibold text-gray-700">{{ title }}</h3>
      <span class="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">{{ issues.length }}</span>
    </div>
    <div class="p-2 flex-1 overflow-y-auto flex flex-col gap-2 min-h-[200px]"
         @dragover.prevent
         @drop="$emit('drop', $event, status)">
      <IssueCard 
        v-for="issue in issues" 
        :key="issue.id" 
        :issue="issue" 
        draggable="true"
        @dragstart="$emit('dragstart', $event, issue)"
      />
      <div v-if="issues.length === 0" class="flex-1 flex items-center justify-center text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded m-2">
        Drop here
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Issue } from '../stores/issues'
import IssueCard from './IssueCard.vue'

defineProps<{
  title: string
  status: string
  issues: Issue[]
}>()

defineEmits<{
  (e: 'dragstart', event: DragEvent, issue: Issue): void
  (e: 'drop', event: DragEvent, targetStatus: string): void
}>()
</script>
```

**Step 3: Implement `KanbanBoard.vue`**
```vue
<template>
  <div class="h-screen w-full bg-white flex flex-col font-sans overflow-hidden">
    <header class="h-14 border-b border-gray-200 flex items-center px-6 shrink-0">
      <h1 class="font-bold text-xl text-gray-800">Symphony Kanban</h1>
    </header>
    <main class="flex-1 overflow-x-auto p-6 flex gap-6 items-start h-full">
      <KanbanColumn 
        v-for="col in columns" 
        :key="col.id"
        :title="col.title"
        :status="col.id"
        :issues="store.issues.filter(i => i.status === col.id)"
        @dragstart="onDragStart"
        @drop="onDrop"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useIssueStore, type Issue } from '../stores/issues'
import KanbanColumn from './KanbanColumn.vue'

const store = useIssueStore()

const columns = [
  { id: 'todo', title: 'Todo' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'in_review', title: 'In Review' },
  { id: 'done', title: 'Done' }
]

onMounted(() => {
  store.fetchIssues()
})

const onDragStart = (e: DragEvent, issue: Issue) => {
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('issueId', issue.id)
  }
}

const onDrop = (e: DragEvent, targetStatus: string) => {
  const issueId = e.dataTransfer?.getData('issueId')
  if (issueId) {
    store.updateIssueStatus(issueId, targetStatus)
  }
}
</script>
```

**Step 4: Update `App.vue`**
Replace `App.vue` content:
```vue
<template>
  <KanbanBoard />
</template>

<script setup lang="ts">
import KanbanBoard from './components/KanbanBoard.vue'
</script>
```

**Step 5: Commit**
```bash
git add packages/web/src
git commit -m "feat(web): build kanban board and drag-drop columns"
```

---

### Task 3: WebSocket Client Connection

**Files:**
- Modify: `packages/web/src/stores/issues.ts`

**Step 1: Add WS connection to Store**
Add the ability to connect to the backend WebSocket and handle `AgentStreamEvent` updates.
```typescript
  // inside useIssueStore setup
  let ws: WebSocket | null = null

  const connectWebSocket = () => {
    if (ws) return
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}`
    ws = new WebSocket(wsUrl)

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      // We will handle logs/events here later
      console.log('WS Event:', data)
      // If we receive an event that updates issue status, we can patch the store
      if (data.type === 'status_update' && data.issueId) {
        const issue = issues.value.find(i => i.id === data.issueId)
        if (issue && data.status) issue.status = data.status
        if (issue && data.agentStatus) issue.agentStatus = data.agentStatus
      }
    }
    
    ws.onclose = () => {
      ws = null
      setTimeout(connectWebSocket, 3000) // reconnect
    }
  }
  
  // return connectWebSocket too
```

**Step 2: Initialize WS in KanbanBoard**
```vue
// in KanbanBoard.vue
onMounted(() => {
  store.fetchIssues()
  store.connectWebSocket()
})
```

**Step 3: Commit**
```bash
git add packages/web/src
git commit -m "feat(web): setup websocket client connection"
```
