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
