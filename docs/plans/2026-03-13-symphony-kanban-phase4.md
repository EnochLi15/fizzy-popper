# Symphony Kanban Phase 4: Agent Execution Engine

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the backend agent execution logic that spawns real agent sessions, captures their logs, and broadcasts them via WebSocket.

**Architecture:**
- Backend: Add `AgentManager` class to track active sessions. Use a mock/real integration with agent logic. Emit `AgentStreamEvent` objects to the WebSocket hub.
- Update `POST /api/issues/:id/start-agent` to initialize the session.

**Tech Stack:** Node.js, Prisma, WebSockets.

---

### Task 1: Agent Manager & Session Tracking

**Files:**
- Create: `packages/api/src/agent-manager.ts`

**Step 1: Implement `AgentManager`**
Manage a map of `issueId -> session`. Support `start(issueId)`, `stop(issueId)`, and `sendIntervention(issueId, content)`.

**Step 2: Emit events to WebSocket Hub**
When the agent has a new "thought" or "tool_call", call `broadcastEvent(issueId, event)`.

**Step 3: Commit**
```bash
git add packages/api/src
git commit -m "feat(api): implement agent manager for session tracking"
```

---

### Task 2: Integrate Agent Execution with Issues API

**Files:**
- Modify: `packages/api/src/routes/issues.ts`
- Modify: `packages/api/src/index.ts`

**Step 1: Add `POST /api/issues/:id/start-agent`**
This endpoint should trigger `agentManager.start(id)`.

**Step 2: Update Intervention and Kill endpoints**
Connect them to `agentManager.sendIntervention` and `agentManager.stop`.

**Step 3: Commit**
```bash
git add packages/api/src
git commit -m "feat(api): connect issues api to agent engine"
```

---

### Task 3: Mock/Real Agent Lifecycle Simulation

**Files:**
- Modify: `packages/api/src/agent-manager.ts`

**Step 1: Implement a "Reasoning Loop" simulation**
Simulate an agent thinking, running a tool (like `ls`), and then asking for intervention to show the system works end-to-end.

**Step 2: Commit**
```bash
git add packages/api/src
git commit -m "feat(api): add agent lifecycle simulation"
```
---

### Task 4: Final Verification & "Done" Promise

**Step 1: Run full system check**
Verify all CRUD, Log Streaming, and HITL flows work.

**Step 2: Commit & Merge**
```bash
git commit -m "chore: final project completion"
```
