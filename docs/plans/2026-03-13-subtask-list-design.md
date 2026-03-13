# Design: SubTaskList.vue

## Overview
Create a Vue 3 component `SubTaskList.vue` to display and manage sub-tasks within the issue decomposition feature.

## Component Specification

### Props
- `subTasks: Issue[]` (Imported from `../stores/issues`)

### Emits
- `toggle(task: Issue)`: Emitted when a sub-task's checkbox is toggled.
- `delete(taskId: string)`: Emitted when the delete button is clicked.

### Template Structure
- **Container**: `div` with `flex flex-col gap-1`.
- **List Item**: `v-for` loop over `subTasks`.
  - **Layout**: `flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded group`.
  - **Checkbox**: `input type="checkbox"` bound to `task.status === 'done'`.
  - **Title**: `span` with conditional class `line-through text-gray-400` if `task.status === 'done'`.
  - **Delete Button**: `button` visible on hover (`opacity-0 group-hover:opacity-100`).
  - **Trash Icon**: Inline SVG.

### Styling
- Tailwind CSS for all layout, spacing, and hover effects.

## Implementation Details
- Use `<script setup lang="ts">`.
- Import `Issue` type from `../stores/issues`.
- Use `defineProps` and `defineEmits`.
