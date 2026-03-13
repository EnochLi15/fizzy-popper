<template>
  <div v-if="issue" class="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl border-l border-gray-200 flex flex-col z-50 transform transition-transform duration-300">
    <header class="h-14 border-b border-gray-200 flex items-center justify-between px-4 shrink-0 bg-gray-50">
      <div class="flex items-center gap-2">
        <span class="text-lg font-bold text-gray-800 truncate max-w-[300px]">Issue #{{ issue.id.slice(0,8) }}</span>
        <span v-if="issue.assignee === 'ai'" class="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded flex items-center gap-1">
          🤖 Agent
        </span>
      </div>
      <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </header>

    <nav class="flex border-b border-gray-200 bg-gray-50">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="[
          'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
          activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
        ]"
      >
        {{ tab.label }}
      </button>
    </nav>

    <div class="flex-1 overflow-hidden relative">
      <!-- Session Tab -->
      <div v-if="activeTab === 'session'" class="h-full flex flex-col bg-[#1e1e1e] text-gray-300 font-mono text-sm p-4 overflow-y-auto" ref="logContainer">
        <div v-for="log in logs" :key="log.id" class="mb-4">
          <div v-if="log.type === 'thought'" class="text-blue-400 italic">
            > Thinking: {{ log.content }}
          </div>
          <div v-else-if="log.type === 'tool_call'" class="bg-[#2d2d2d] p-3 rounded border border-[#3d3d3d]">
            <div class="text-green-400 mb-1">$ {{ log.command }}</div>
            <pre class="whitespace-pre-wrap text-gray-400">{{ log.output }}</pre>
          </div>
          <div v-else-if="log.type === 'intervention_required'" class="bg-yellow-900/30 border border-yellow-700/50 p-3 rounded text-yellow-200">
            ⚠️ Intervention Required: {{ log.content }}
          </div>
          <div v-else class="text-gray-500">
            {{ log.content }}
          </div>
        </div>
        
        <!-- HITL Input -->
        <div v-if="needsIntervention" class="mt-auto pt-4 border-t border-[#3d3d3d]">
          <div class="flex gap-2">
            <input 
              v-model="interventionInput" 
              @keyup.enter="submitIntervention"
              placeholder="Type instruction..." 
              class="flex-1 bg-[#2d2d2d] border border-[#3d3d3d] rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
            <button @click="submitIntervention" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
              Send
            </button>
          </div>
        </div>
      </div>

      <!-- Diff Tab -->
      <div v-if="activeTab === 'diff'" class="h-full p-4 overflow-y-auto">
        <p class="text-gray-500 italic text-center mt-10">No changes detected yet.</p>
      </div>

      <!-- Settings Tab -->
      <div v-if="activeTab === 'settings'" class="h-full p-6 overflow-y-auto">
        <h3 class="font-semibold text-gray-800 mb-4">Agent Configuration</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Model</label>
            <div class="text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">opencode/gpt-5.1-codex</div>
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Max Iterations</label>
            <div class="text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">50</div>
          </div>
        </div>
      </div>
    </div>

    <footer class="h-16 border-t border-gray-200 flex items-center justify-between px-4 bg-gray-50">
      <button @click="killProcess" class="text-red-600 hover:bg-red-50 px-4 py-2 rounded border border-red-200 transition-colors text-sm font-semibold">
        Kill Process
      </button>
      <a 
        v-if="issue.workspaceUrl" 
        :href="issue.workspaceUrl" 
        target="_blank"
        class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center gap-2"
      >
        View Conversation
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUpdated, nextTick } from 'vue'
import { useAgentStore } from '../stores/agent'
import type { Issue } from '../stores/issues'

const props = defineProps<{ issue: Issue | null }>()
defineEmits(['close'])

const agentStore = useAgentStore()
const activeTab = ref('session')
const interventionInput = ref('')
const logContainer = ref<HTMLElement | null>(null)

const tabs = [
  { id: 'session', label: 'Session' },
  { id: 'diff', label: 'Diff' },
  { id: 'settings', label: 'Settings' }
]

const logs = computed(() => {
  if (!props.issue) return []
  return agentStore.logs[props.issue.id] || []
})

const needsIntervention = computed(() => {
  const lastLog = logs.value[logs.value.length - 1]
  return lastLog?.type === 'intervention_required'
})

const submitIntervention = async () => {
  if (!interventionInput.value || !props.issue) return
  
  await fetch(`/api/issues/${props.issue.id}/intervention`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: interventionInput.value })
  })
  
  interventionInput.value = ''
}

const killProcess = async () => {
  if (!props.issue) return
  if (!confirm('Are you sure you want to kill the agent process?')) return

  await fetch(`/api/issues/${props.issue.id}/kill`, {
    method: 'POST'
  })
}

const scrollToBottom = () => {
  if (logContainer.value) {
    logContainer.value.scrollTo({
      top: logContainer.value.scrollHeight,
      behavior: 'smooth'
    })
  }
}

watch(() => logs.value.length, () => {
  nextTick(scrollToBottom)
})

onUpdated(scrollToBottom)
</script>
