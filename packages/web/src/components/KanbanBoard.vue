<template>
  <div class="h-screen w-full bg-white flex flex-col font-sans overflow-hidden relative">
    <header class="h-14 border-b border-gray-200 flex items-center px-6 shrink-0">
      <h1 class="font-bold text-xl text-gray-800">Symphony Kanban</h1>
    </header>
    <main class="flex-1 overflow-x-auto p-6 flex gap-6 items-start h-full">
      <KanbanColumn 
        v-for="col in columns" 
        :key="col.id"
        :title="col.title"
        :status="col.id"
        :issues="store.issues.filter(i => i.status === col.id && !i.isGoldenTicket)"
        @dragstart="onDragStart"
        @drop="onDrop"
        @issue-click="selectedIssue = $event"
      />
    </main>

    <AgentStudio 
      :issue="selectedIssue" 
      :class="{ 'translate-x-full': !selectedIssue }"
      @close="selectedIssue = null"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useIssueStore, type Issue } from '../stores/issues'
import KanbanColumn from './KanbanColumn.vue'
import AgentStudio from './AgentStudio.vue'

const store = useIssueStore()
const selectedIssue = ref<Issue | null>(null)

const columns = [
  { id: 'todo', title: 'Todo' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'in_review', title: 'In Review' },
  { id: 'done', title: 'Done' }
]

onMounted(() => {
  store.fetchIssues()
  store.connectWebSocket()
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
