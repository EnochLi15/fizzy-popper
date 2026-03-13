import { createOpencodeClient } from "@opencode-ai/sdk/v2"
import { broadcastEvent } from './ws'

export interface AgentSession {
  issueId: string
  sessionID?: string
  status: 'idle' | 'running' | 'waiting' | 'stopped'
}

export class AgentManager {
  private sessions = new Map<string, AgentSession>()
  private sdk = createOpencodeClient({
    baseUrl: "http://127.0.0.1:4096",
    directory: process.cwd(),
  })

  async start(issueId: string) {
    if (this.sessions.has(issueId)) return
    
    const session: AgentSession = { issueId, status: 'running' }
    this.sessions.set(issueId, session)
    
    broadcastEvent(issueId, { 
      type: 'system', 
      content: 'Agent session initialized.',
      timestamp: Date.now() 
    })

    // Simulated lifecycle will be replaced in Task 2
    this.runSimulation(issueId)
  }

  private async runSimulation(issueId: string) {
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    
    await sleep(1000)
    if (!this.sessions.has(issueId)) return
    broadcastEvent(issueId, {
      id: Math.random().toString(36).slice(2),
      type: 'thought',
      content: 'I need to check the current directory structure to understand the project layout.',
      timestamp: Date.now()
    })

    await sleep(2000)
    if (!this.sessions.has(issueId)) return
    broadcastEvent(issueId, {
      id: Math.random().toString(36).slice(2),
      type: 'tool_call',
      command: 'ls -R',
      output: 'packages/\n  api/\n  web/\npackage.json\npnpm-workspace.yaml',
      timestamp: Date.now()
    })

    await sleep(2000)
    if (!this.sessions.has(issueId)) return
    broadcastEvent(issueId, {
      id: Math.random().toString(36).slice(2),
      type: 'intervention_required',
      content: 'I found a conflict in the dependency versions between api and web. How should I proceed with the upgrade?',
      timestamp: Date.now()
    })
  }

  stop(issueId: string) {
    this.sessions.delete(issueId)
    broadcastEvent(issueId, { 
      type: 'system', 
      content: 'Agent session terminated.',
      timestamp: Date.now() 
    })
  }

  sendIntervention(issueId: string, content: string) {
    broadcastEvent(issueId, { 
      type: 'system', 
      content: `Human instruction received: ${content}`,
      timestamp: Date.now() 
    })
  }
}

export const agentManager = new AgentManager()
