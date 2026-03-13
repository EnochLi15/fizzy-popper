# Symphony x OpenCode Smart Scheduling Kanban System Design

## 1. Overview
We are building a standalone "AI Software Factory" console as described in `GLOBAL_SPEC.md`. This is a Kanban-based project workflow manager that dispatches and supervises AI agents working on issues, featuring real-time observability and Human-in-the-Loop (HITL) intervention.

## 2. Architecture & Monorepo Layout
We will use a `pnpm` workspaces monorepo structure.

**Stack:**
- **Frontend (`packages/web`)**: Vue 3 + Vite + TailwindCSS. Uses Pinia for state management, Vue Router, and native WebSockets for streaming agent logs.
- **Backend (`packages/api`)**: Node.js + Hono + Prisma ORM + SQLite. Handles REST API for Kanban CRUD and WebSockets for real-time log streaming.
- **Database**: `symphony.db` (SQLite) located in the backend package.
- **Agent SDK Integration**: The backend will spawn and manage AI processes (e.g., via `@opencode-ai/sdk`), emitting WebSocket events (`AgentStreamEvent`) to the frontend.

## 3. Data Models & REST API

### 3.1 Prisma Schema Models
- **Issue**:
  - `id`: String (UUID/CUID)
  - `title`: String
  - `description`: String
  - `status`: Enum (todo, in_progress, in_review, done)
  - `assignee`: String (human, ai, null)
  - `agentStatus`: Enum (initializing, writing_code, waiting_input, completed)
  - `workspaceUrl`: String (optional)
  - `startTime`: DateTime (optional)
  - `agentConfig`: JSON (model, maxIterations, useSandbox, ciCommand)
- **Tag**:
  - `id`: String
  - `name`: String
  - Many-to-many relationship with Issue

### 3.2 REST Endpoints (Hono.js)
- `GET /api/issues` - List all issues.
- `POST /api/issues` - Create an issue.
- `PATCH /api/issues/:id` - Update issue (status change, assignment).
- `DELETE /api/issues/:id` - Remove issue.
- `POST /api/issues/:id/start-agent` - Trigger the AI agent execution.
- `POST /api/issues/:id/intervention` - Submit human instructions when agent is blocked.
- `POST /api/issues/:id/kill` - Force stop agent process.

## 4. WebSocket Streaming & Agent Execution (HITL)

**WebSocket Hub:**
- The server maintains an active connection mapping of `issueId -> Set<WebSocket>`.
- The Agent processes emit `AgentStreamEvent` payload objects (`type`: thought, tool_call, intervention_required, system).
- The Hub broadcasts these events to the Agent Studio Panel clients.

**Execution & HITL Workflow:**
1. User clicks "Start" on an AI task -> `POST /api/issues/:id/start-agent` is called.
2. Server spawns agent process and updates issue status to `in_progress`.
3. Agent encounters a blocker/prompt request -> emits `intervention_required` event over WebSocket.
4. UI unlocks the input box in the Agent Studio Panel.
5. Human submits input -> `POST /api/issues/:id/intervention`.
6. Server pipes input back to the agent process.

## 5. Frontend UI (Vue 3 / TailwindCSS)

**Kanban View:**
- 4 primary columns: Todo, In Progress, In Review, Done.
- **AI Visuals**: Issues assigned to AI display a `🤖 Agent` logo.
- **Real-time Indicators**: When `status === 'in_progress'`, show a pulsing animation with sub-text representing the current `agentStatus` (e.g., "Agent is reasoning...").

**Agent Studio Panel (Right Drawer):**
- Opens contextually when clicking an AI-assigned issue.
- **Header**: Actions like "Live URL" (if sandbox active) and a red "Kill Process" button.
- **Tabs**:
  1. **Session**: Terminal-like dark UI block. Auto-scrolls on new log events. Features an input at the bottom that unlocks on `waiting_input` (HITL).
  2. **Diff**: Displays changed files using a Git diff viewer component upon task completion.
  3. **Settings**: Read-only display of Model, Max Iterations, Sandbox Toggle, Workspace URL, etc.
