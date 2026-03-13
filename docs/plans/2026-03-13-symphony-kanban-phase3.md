# Symphony Kanban Phase 3: Agent Studio & HITL

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the Agent Studio Panel (right drawer) with real-time log streaming (Session), Git Diff view, and Agent Settings. Add Human-in-the-Loop (HITL) intervention support.

**Architecture:**
- Frontend: Add `AgentStudio.vue` component. Use a Pinia store (`useAgentStore`) to manage logs and intervention state.
- Backend: Add `/api/issues/:id/intervention` and `/api/issues/:id/kill` endpoints. Enhance WebSocket hub to broadcast `thought`, `tool_call`, and `intervention_required` events.

**Tech Stack:** Vue 3, Pinia, TailwindCSS, Hono, WebSockets.

---

### Task 1: Agent Store & Log Management

**Files:**
- Create: `packages/web/src/stores/agent.ts`

**Step 1: Implement `useAgentStore`**
```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface AgentLog {
  id: string
  type: 'thought' | 'tool_call' | 'intervention_required' | 'system'
  content?: string
  command?: string
  output?: string
  timestamp: number
}

export const useAgentStore = defineStore('agent', () => {
  const logs = ref<Record<string, AgentLog[]>>({})
  const activeIssueId = ref<string | null>(null)

  const addLog = (issueId: string, log: AgentLog) => {
    if (!logs.value[issueId]) logs.value[issueId] = []
    logs.value[issueId].push(log)
  }

  const clearLogs = (issueId: string) => {
    logs.value[issueId] = []
  }

  return { logs, activeIssueId, addLog, clearLogs }
})
```

**Step 2: Update `useIssueStore` to pipe WS events to `useAgentStore`**
Modify `packages/web/src/stores/issues.ts` to use `useAgentStore`.

**Step 3: Commit**
```bash
git add packages/web/src/stores
git commit -m "feat(web): add agent store for log management"
```

---

### Task 2: Build Agent Studio Panel UI

**Files:**
- Create: `packages/web/src/components/AgentStudio.vue`
- Modify: `packages/web/src/components/KanbanBoard.vue`

**Step 1: Implement `AgentStudio.vue` layout**
A right-sliding drawer with tabs: Session, Diff, Settings.
The "Session" tab should look like a terminal.

**Step 2: Integrate `AgentStudio` into `KanbanBoard`**
Show the drawer when an AI issue is clicked.

**Step 3: Commit**
```bash
git add packages/web/src/components
git commit -m "feat(web): build agent studio panel layout"
```

---

### Task 3: Implement Session Tab (Real-time Logs)

**Files:**
- Modify: `packages/web/src/components/AgentStudio.vue`

**Step 1: Render logs in the Session tab**
Map `AgentLog` types to different styles (thoughts are italic, tool_calls are code blocks).
Implement auto-scroll.

**Step 2: Commit**
```bash
git add packages/web/src/components
git commit -m "feat(web): implement session tab with log streaming"
```

---

### Task 4: HITL Intervention & Control Endpoints

**Files:**
- Modify: `packages/api/src/routes/issues.ts`
- Modify: `packages/web/src/components/AgentStudio.vue`

**Step 1: Add backend endpoints**
`POST /api/issues/:id/intervention` and `POST /api/issues/:id/kill`.

**Step 2: Add intervention input to UI**
Unlock the input when `intervention_required` is the latest log.

**Step 3: Commit**
```bash
git add packages/api/src packages/web/src
git commit -m "feat: implement hitl intervention and control endpoints"
```
