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

  let ws: WebSocket | null = null

  const connectWebSocket = () => {
    if (ws) return
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}`
    ws = new WebSocket(wsUrl)

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log('WS Event:', data)
      if (data.type === 'status_update' && data.issueId) {
        const issue = issues.value.find(i => i.id === data.issueId)
        if (issue && data.status) issue.status = data.status
        if (issue && data.agentStatus) issue.agentStatus = data.agentStatus
      }
    }
    
    ws.onclose = () => {
      ws = null
      setTimeout(connectWebSocket, 3000) // reconnect
    }
  }

  return { issues, isLoading, fetchIssues, updateIssueStatus, connectWebSocket }
})
