<template>
  <div class="flex flex-col bg-gray-50 rounded-lg w-80 shrink-0 h-full max-h-full">
    <div class="p-3 border-b border-gray-200 flex justify-between items-center">
      <h3 class="font-semibold text-gray-700">{{ title }}</h3>
      <span class="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">{{ issues.length }}</span>
    </div>
    <div class="p-2 flex-1 overflow-y-auto flex flex-col gap-2 min-h-[200px]"
         @dragover.prevent
         @drop="$emit('drop', $event, status)">
      <IssueCard 
        v-for="issue in issues" 
        :key="issue.id" 
        :issue="issue" 
        draggable="true"
        @dragstart="$emit('dragstart', $event, issue)"
      />
      <div v-if="issues.length === 0" class="flex-1 flex items-center justify-center text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded m-2">
        Drop here
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Issue } from '../stores/issues'
import IssueCard from './IssueCard.vue'

defineProps<{
  title: string
  status: string
  issues: Issue[]
}>()

defineEmits<{
  (e: 'dragstart', event: DragEvent, issue: Issue): void
  (e: 'drop', event: DragEvent, targetStatus: string): void
}>()
</script>
