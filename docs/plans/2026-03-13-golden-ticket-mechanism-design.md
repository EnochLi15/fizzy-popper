# Design Doc: Golden Ticket Mechanism (Spec-Compliant Auto-Dispatch)

**Date**: 2026-03-13
**Status**: Approved
**Owner**: Sisyphus

## 1. Overview
This document outlines the implementation of the "Golden Ticket" mechanism in `fizzy-popper`, enabling spec-compliant automated agent dispatch based on Kanban column states.

## 2. Goals
- Support "Golden Tickets" (special issues tagged `#agent-instructions`) to define per-column agent behavior.
- Automate agent triggering: moving an issue into a column with a Golden Ticket automatically starts the agent.
- Provide a dedicated UI for configuring these tickets at the column level.
- Ensure compliance with `GLOBAL_SPEC` and `CORE_SPEC`.

## 3. Architecture

### 3.1 Data Model (Backend/Prisma)
The `Issue` model in `packages/api/prisma/schema.prisma` will be extended:
- `isGoldenTicket`: Boolean (default: false).
- `tags`: String? (comma-separated tags like `#claude`, `#move-to-done`).

### 3.2 Configuration Discovery
A helper function will be added to the backend to find the Golden Ticket associated with a specific status:
```typescript
async function getGoldenTicketForStatus(status: string) {
  return await prisma.issue.findFirst({
    where: { status, isGoldenTicket: true }
  });
}
```

### 3.3 Auto-Dispatch Trigger
The `PATCH /api/issues/:id` route will be modified:
- Detect status changes.
- If the new status has an associated Golden Ticket, invoke `agentManager.start(id)`.
- **Context Injection**: For sub-tasks, the parent issue's description will be prepended to the prompt to provide hierarchical context.

## 4. UI Design

### 4.1 Kanban Column Enhancements
- A gear/settings icon will be added to each `KanbanColumn.vue` header.
- Clicking the icon opens the `AgentConfigModal.vue`.

### 4.2 Agent Configuration Modal (New)
- Allows editing the Golden Ticket issue for that column.
- Fields:
    - **System Prompt**: Maps to the issue's `description`.
    - **Agent Backend**: Selection for Claude, Codex, OpenCode, etc. (stored in `tags`).
    - **Completion Action**: Selection for "Move to Done", "Close", etc. (stored in `tags`).

### 4.3 Kanban Board Filtering
- `KanbanBoard.vue` will filter out issues where `isGoldenTicket === true` so they don't appear as regular tasks.

## 5. Visual Feedback (GLOBAL_SPEC 3.1)
- Active agent cards will show a "pulse" animation.
- The card will display the `agentStatus` (e.g., "Reasoning...", "Tool Calling...").

## 6. Implementation Steps
1. Update Prisma schema and migrate.
2. Implement backend discovery and auto-dispatch logic in Hono routes.
3. Update `agentManager.ts` to support prompt assembly from Golden Tickets and hierarchical context.
4. Develop the `AgentConfigModal.vue` and integrate it into `KanbanColumn.vue`.
5. Update Kanban rendering to filter out configuration tickets.
6. Add pulse animations and status displays to `IssueCard.vue`.
