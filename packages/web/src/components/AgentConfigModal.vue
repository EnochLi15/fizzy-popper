<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 animate-in fade-in zoom-in duration-200">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-blue-100 rounded-lg text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 class="text-xl font-bold text-gray-900">Configure Agent: {{ title }}</h2>
        </div>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-6">
        <!-- System Prompt -->
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-700">System Instructions</label>
          <p class="text-xs text-gray-500 mb-2">Define how the agent should behave when a card enters this column.</p>
          <textarea 
            v-model="form.description"
            rows="6"
            placeholder="e.g. You are a triage agent. Summarize the issue and propose a plan..."
            class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
          ></textarea>
        </div>

        <!-- Tags -->
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-700">Backend & Action Tags</label>
          <p class="text-xs text-gray-500 mb-2">Comma-separated tags (e.g. #claude, #move-to-done)</p>
          <input 
            v-model="form.tags"
            type="text"
            placeholder="#claude, #move-to-done"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
        <button 
          @click="$emit('close')"
          class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button 
          @click="handleSave"
          :disabled="isSaving"
          class="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
        >
          <span v-if="isSaving" class="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></span>
          {{ isSaving ? 'Saving...' : 'Save Configuration' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useIssueStore } from '../stores/issues'

const props = defineProps<{
  isOpen: boolean
  status: string
  title: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save'): void
}>()

const store = useIssueStore()
const isSaving = ref(false)

const form = reactive({
  description: '',
  tags: ''
})

// Populate form from existing Golden Ticket
watch(() => props.isOpen, (open) => {
  if (open) {
    const ticket = store.issues.find(i => i.status === props.status && i.isGoldenTicket)
    if (ticket) {
      form.description = ticket.description || ''
      form.tags = ticket.tags || ''
    } else {
      form.description = ''
      form.tags = ''
    }
  }
}, { immediate: true })

const handleSave = async () => {
  isSaving.value = true
  try {
    await store.saveGoldenTicket(props.status, {
      description: form.description,
      tags: form.tags
    })
    emit('save')
    emit('close')
  } finally {
    isSaving.value = false
  }
}
</script>
