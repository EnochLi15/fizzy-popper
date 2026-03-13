# Design Doc: Issue Management (Single-level Decomposition)

**Date**: 2026-03-13
**Status**: Draft
**Owner**: Sisyphus

## 1. Overview
This document outlines the implementation of issue management features in `fizzy-popper`, specifically focusing on single-level decomposition (Parent-Child) and basic CRUD operations within the local SQLite database.

## 2. Goals
- Support CRUD operations for issues in the local database.
- Support single-level issue decomposition (Sub-tasks).
- Support status transitions (todo, in_progress, in_review, done).
- Provide a responsive UI for managing these tasks, following Vercel Web Interface Guidelines.

## 3. Architecture

### 3.1 Data Model (Backend/Prisma)
The `Issue` model in `packages/api/prisma/schema.prisma` will be extended:
- Add `parentId` (String?) field.
- Add self-relation `parent` and `subTasks`.

### 3.2 API Routes (Hono)
- `GET /api/issues`: Return all top-level issues.
- `GET /api/issues/:id/subtasks`: Return sub-tasks for a specific parent.
- `POST /api/issues`: Create an issue (optionally with `parentId`).
- `PATCH /api/issues/:id`: Update issue fields (title, status, etc.).
- `DELETE /api/issues/:id`: Delete an issue and its sub-tasks.

### 3.3 State Management (Pinia)
- The `issues` store will handle fetching and state updates.
- Sub-tasks will be cached within their parent issue object or in a separate map for performance.

## 4. UI Design

### 4.1 Kanban Cards
- Each card displays a sub-task progress indicator (e.g., `✓ 1/3`).
- Clicking a card opens the `AgentStudio.vue` panel.

### 4.2 Issue Detail (AgentStudio.vue)
- A new "Sub-tasks" tab/section will be added.
- It will list sub-tasks with checkboxes for status toggling.
- An inline "Add sub-task" input will be provided at the bottom of the list.

### 4.3 Sub-task Interactions
- **Toggle Status**: Clicking a checkbox updates the status between `todo` and `done`.
- **Delete**: A trash icon for removing a sub-task.

## 5. Data Flow
1. **Creation**: `POST /api/issues` with `parentId`.
2. **Updates**: `PATCH /api/issues/:id`.
3. **Real-time**: WebSocket broadcasts status changes to update all connected clients.

## 6. Constraints & Safety
- **Single-level**: Recursive nesting is NOT supported in the first version.
- **Local-only**: Sub-tasks are stored locally and NOT synced back to the Fizzy board cards (for now).
- **Concurrency**: WebSocket ensures UI remains consistent when multiple agents or humans edit the same board.

## 7. Next Steps
1. Update Prisma schema and migrate.
2. Update Hono routes and agent-manager.
3. Implement `SubTaskList.vue` and integrate into `AgentStudio.vue`.
4. Add sub-task indicators to `KanbanCard.vue`.
