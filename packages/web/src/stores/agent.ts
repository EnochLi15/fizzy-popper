import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface AgentLog {
  id: string
  type: 'thought' | 'tool_call' | 'intervention_required' | 'system'
  content?: string
  command?: string
  output?: string
  timestamp: number
}

export const useAgentStore = defineStore('agent', () => {
  const logs = ref<Record<string, AgentLog[]>>({})
  const activeIssueId = ref<string | null>(null)

  const addLog = (issueId: string, log: AgentLog) => {
    if (!logs.value[issueId]) logs.value[issueId] = []
    logs.value[issueId].push(log)
  }

  const clearLogs = (issueId: string) => {
    logs.value[issueId] = []
  }

  return { logs, activeIssueId, addLog, clearLogs }
})
