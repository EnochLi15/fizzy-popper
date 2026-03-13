import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Issue {
  id: string
  title: string
  description: string
  status: string
  assignee: string | null
  agentStatus: string | null
  workspaceUrl: string | null
  startTime: string | null
  agentConfig: string | null
}

export const useIssueStore = defineStore('issues', () => {
  const issues = ref<Issue[]>([])
  const isLoading = ref(false)

  const fetchIssues = async () => {
    isLoading.value = true
    try {
      const res = await fetch('/api/issues')
      issues.value = await res.json()
    } finally {
      isLoading.value = false
    }
  }

  const updateIssueStatus = async (id: string, status: string) => {
    // Optimistic update
    const issue = issues.value.find(i => i.id === id)
    if (issue) issue.status = status
    
    await fetch(`/api/issues/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
  }

  return { issues, isLoading, fetchIssues, updateIssueStatus }
})
