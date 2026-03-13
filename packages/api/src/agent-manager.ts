import { broadcastEvent } from './ws'

export interface AgentSession {
  issueId: string
  status: 'idle' | 'running' | 'waiting' | 'stopped'
}

export class AgentManager {
  private sessions = new Map<string, AgentSession>()

  start(issueId: string) {
    if (this.sessions.has(issueId)) return
    
    const session: AgentSession = { issueId, status: 'running' }
    this.sessions.set(issueId, session)
    
    broadcastEvent(issueId, { 
      type: 'system', 
      content: 'Agent session initialized.',
      timestamp: Date.now() 
    })

    // Simulated lifecycle will be added in Task 3
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
