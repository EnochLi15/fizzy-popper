<template>
  <div class="flex flex-col bg-gray-50 rounded-lg w-80 shrink-0 h-full max-h-full">
    <div class="p-3 border-b border-gray-200 flex justify-between items-center">
      <div class="flex items-center gap-2">
        <h3 class="font-semibold text-gray-700">{{ title }}</h3>
        <button 
          @click="isConfigOpen = true"
          class="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded-full hover:bg-blue-50"
          title="Configure Agent"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
      <span class="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">{{ issues.length }}</span>
    </div>

    <AgentConfigModal 
      :is-open="isConfigOpen"
      :status="status"
      :title="title"
      @close="isConfigOpen = false"
    />
    <div class="p-2 flex-1 overflow-y-auto flex flex-col gap-2 min-h-[200px]"
         @dragover.prevent
         @drop="$emit('drop', $event, status)">
      <IssueCard 
        v-for="issue in issues" 
        :key="issue.id" 
        :issue="issue" 
        draggable="true"
        @dragstart="$emit('dragstart', $event, issue)"
        @click="$emit('issue-click', issue)"
      />
      <div v-if="issues.length === 0" class="flex-1 flex items-center justify-center text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded m-2">
        Drop here
      </div>
    </div>

    <!-- Add Issue Input (Only for Todo column) -->
    <div v-if="status === 'todo'" class="p-3 border-t border-gray-200">
      <div v-if="!isAdding" @click="isAdding = true" class="flex items-center gap-2 text-gray-500 hover:text-blue-600 cursor-pointer p-1 rounded transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span class="text-sm font-medium">Add Issue</span>
      </div>
      <div v-else>
        <input 
          v-model="newIssueTitle" 
          @keyup.enter="submitNewIssue"
          @blur="cancelAdding"
          ref="inputRef"
          placeholder="What needs to be done?"
          class="w-full border border-blue-400 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import type { Issue } from '../stores/issues'
import { useIssueStore } from '../stores/issues'
import IssueCard from './IssueCard.vue'
import AgentConfigModal from './AgentConfigModal.vue'

const props = defineProps<{
  title: string
  status: string
  issues: Issue[]
}>()

defineEmits<{
  (e: 'dragstart', event: DragEvent, issue: Issue): void
  (e: 'drop', event: DragEvent, targetStatus: string): void
  (e: 'issue-click', issue: Issue): void
}>()

const store = useIssueStore()
const isAdding = ref(false)
const isConfigOpen = ref(false)
const newIssueTitle = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

const cancelAdding = () => {
  if (!newIssueTitle.value.trim()) {
    isAdding.value = false
  }
}

const submitNewIssue = async () => {
  const title = newIssueTitle.value.trim()
  if (title) {
    await store.createIssue(title)
    newIssueTitle.value = ''
    isAdding.value = false
  }
}

watch(isAdding, (val) => {
  if (val) {
    nextTick(() => inputRef.value?.focus())
  }
})
</script>
