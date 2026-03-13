import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAgentStore } from './agent'

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
  parentId?: string | null
  subTasks?: Issue[]
  isGoldenTicket: boolean
  tags: string | null
}

export const useIssueStore = defineStore('issues', () => {
  const issues = ref<Issue[]>([])
  const isLoading = ref(false)
  const agentStore = useAgentStore()

  const fetchIssues = async () => {
    isLoading.value = true
    try {
      const res = await fetch('/api/issues')
      issues.value = await res.json()
    } finally {
      isLoading.value = false
    }
  }

  const createIssue = async (title: string) => {
    const res = await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: '', status: 'todo' })
    })
    const newIssue = await res.json()
    issues.value.push(newIssue)
    return newIssue
  }

  const updateIssueStatus = async (id: string, status: string) => {
    // Optimistic update
    const findAndUpdate = (list: Issue[]): boolean => {
      for (const issue of list) {
        if (issue.id === id) {
          issue.status = status
          return true
        }
        if (issue.subTasks && findAndUpdate(issue.subTasks)) return true
      }
      return false
    }
    findAndUpdate(issues.value)
    
    await fetch(`/api/issues/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
  }

  const createSubTask = async (parentId: string, title: string) => {
    const res = await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, parentId })
    })
    const newSubTask = await res.json()
    
    const findIssue = (list: Issue[]): Issue | undefined => {
      for (const issue of list) {
        if (issue.id === parentId) return issue
        if (issue.subTasks) {
          const found = findIssue(issue.subTasks)
          if (found) return found
        }
      }
    }
    const parent = findIssue(issues.value)
    if (parent) {
      if (!parent.subTasks) parent.subTasks = []
      parent.subTasks.push(newSubTask)
    }
  }

  const deleteIssue = async (id: string) => {
    const filterIssues = (list: Issue[]): Issue[] => {
      return list
        .filter((i: Issue) => i.id !== id)
        .map((i: Issue) => ({
          ...i,
          subTasks: i.subTasks ? filterIssues(i.subTasks) : undefined
        }))
    }
    issues.value = filterIssues(issues.value)

    await fetch(`/api/issues/${id}`, {
      method: 'DELETE'
    })
  }

  const startAgent = async (id: string) => {
    await fetch(`/api/issues/${id}/start-agent`, {
      method: 'POST'
    })
  }

  const saveGoldenTicket = async (status: string, data: { description: string, tags: string }) => {
    const existing = issues.value.find((i: Issue) => i.status === status && i.isGoldenTicket)
    
    if (existing) {
      const res = await fetch(`/api/issues/${existing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      const updated = await res.json()
      Object.assign(existing, updated)
    } else {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          status,
          title: 'Golden Ticket',
          isGoldenTicket: true
        })
      })
      const newTicket = await res.json()
      issues.value.push(newTicket)
    }
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
      
      if (data.issueId) {
        if (data.type === 'status_update') {
          const findAndUpdate = (list: Issue[]): boolean => {
            for (const issue of list) {
              if (issue.id === data.issueId) {
                if (data.status) issue.status = data.status
                if (data.agentStatus) issue.agentStatus = data.agentStatus
                return true
              }
              if (issue.subTasks && findAndUpdate(issue.subTasks)) return true
            }
            return false
          }
          findAndUpdate(issues.value)
        } else {
          agentStore.addLog(data.issueId, data)
        }
      }
    }
    
    ws.onclose = () => {
      ws = null
      setTimeout(connectWebSocket, 3000) // reconnect
    }
  }

  return { issues, isLoading, fetchIssues, createIssue, updateIssueStatus, createSubTask, deleteIssue, startAgent, saveGoldenTicket, connectWebSocket }
})
