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

    <!-- Sub-task Progress -->
    <div v-if="issue.subTasks?.length" class="flex items-center gap-1.5 mt-2 text-gray-500">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
      <span class="text-[10px] font-medium uppercase tracking-wider">
        {{ issue.subTasks.filter(t => t.status === 'done').length }}/{{ issue.subTasks.length }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Issue } from '../stores/issues'
defineProps<{ issue: Issue }>()
</script>
