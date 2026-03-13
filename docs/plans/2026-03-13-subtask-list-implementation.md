# SubTaskList.vue Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a Vue 3 component to display and manage sub-tasks with toggle and delete functionality.

**Architecture:** A simple functional component using `<script setup>` and Tailwind CSS for styling. It receives a list of issues as props and emits events for user interactions.

**Tech Stack:** Vue 3, TypeScript, Tailwind CSS.

---

### Task 1: Create SubTaskList.vue

**Files:**
- Create: `.worktrees/feat/issue-decomposition/packages/web/src/components/SubTaskList.vue`

**Step 1: Write the component implementation**

```vue
<template>
  <div class="flex flex-col gap-1">
    <div
      v-for="task in subTasks"
      :key="task.id"
      class="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded group transition-colors"
    >
      <input
        type="checkbox"
        :checked="task.status === 'done'"
        @change="$emit('toggle', task)"
        class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
      />
      
      <span
        class="text-sm flex-grow transition-all"
        :class="{ 'line-through text-gray-400': task.status === 'done', 'text-gray-700': task.status !== 'done' }"
      >
        {{ task.title }}
      </span>

      <button
        @click="$emit('delete', task.id)"
        class="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
        title="Delete sub-task"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Issue } from '../stores/issues'

defineProps<{
  subTasks: Issue[]
}>()

defineEmits<{
  (e: 'toggle', task: Issue): void
  (e: 'delete', taskId: string): void
}>()
</script>
```

**Step 2: Verify with npm run typecheck**

Run: `npm run typecheck` in `packages/web`
Expected: PASS

**Step 3: Commit**

```bash
git add .worktrees/feat/issue-decomposition/packages/web/src/components/SubTaskList.vue
git commit -m "feat: add SubTaskList component"
```
