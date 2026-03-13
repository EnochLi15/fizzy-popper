<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'add', value: string): void
}>()

const text = ref('')

const onSubmit = () => {
  const trimmed = text.value.trim()
  if (trimmed) {
    emit('add', trimmed)
    text.value = ''
  }
}
</script>

<template>
  <form @submit.prevent="onSubmit">
    <input
      v-model="text"
      type="text"
      placeholder="Add a sub-task…"
      aria-label="Add a sub-task"
      autocomplete="off"
      class="w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
    />
  </form>
</template>
