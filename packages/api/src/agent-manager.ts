import { createOpencodeClient } from "@opencode-ai/sdk/v2"
import { broadcastEvent } from './ws.js'
import { prisma } from './lib/prisma.js'

export interface AgentSession {
  issueId: string
  sessionID?: string
  status: 'idle' | 'running' | 'waiting' | 'stopped'
}

export class AgentManager {
  private sessions = new Map<string, AgentSession>()
  private sessionToIssue = new Map<string, string>()
  private sdk = createOpencodeClient({
    baseUrl: "http://127.0.0.1:4096",
    directory: process.cwd(),
  })

  constructor() {
    this.listenToEvents()
  }

  private async listenToEvents() {
    try {
      const result = await this.sdk.global.event()
      for await (const event of result.stream as any) {
        const { type, properties } = event
        const sessionID = properties?.sessionID || properties?.info?.sessionID
        if (!sessionID) continue

        const issueId = this.sessionToIssue.get(sessionID)
        if (!issueId) continue

        switch (type) {
          case 'message.updated':
            broadcastEvent(issueId, {
              id: Math.random().toString(36).slice(2),
              type: 'thought',
              content: properties.info?.text || properties.info?.content,
              timestamp: Date.now()
            })
            break
          case 'permission.asked':
            broadcastEvent(issueId, {
              id: Math.random().toString(36).slice(2),
              type: 'intervention_required',
              content: `Permission requested: ${properties.permission}`,
              timestamp: Date.now()
            })
            break
        }
      }
    } catch (err) {
      console.error('Error in SDK event listener:', err)
      setTimeout(() => this.listenToEvents(), 5000)
    }
  }

  async start(issueId: string) {
    if (this.sessions.has(issueId)) return
    
    const issue = await prisma.issue.findUnique({ where: { id: issueId } })
    if (!issue) return

    const session: AgentSession = { issueId, status: 'running' }
    this.sessions.set(issueId, session)
    
    broadcastEvent(issueId, { 
      type: 'system', 
      content: 'Connecting to OpenCode SDK...',
      timestamp: Date.now() 
    })

    try {
      const createRes = await this.sdk.session.create({
        title: `Issue #${issue.id.slice(0, 8)}`
      })
      const sdkSession = (createRes as any).data
      if (!sdkSession?.id) throw new Error('Failed to create SDK session')

      session.sessionID = sdkSession.id
      this.sessionToIssue.set(sdkSession.id, issueId)

      const shareRes = await this.sdk.session.share({
        sessionID: sdkSession.id
      })
      const sharedUrl = (shareRes as any).data?.sharedUrl

      await prisma.issue.update({
        where: { id: issueId },
        data: { 
          workspaceUrl: sharedUrl,
          agentStatus: 'writing_code'
        }
      })

      await this.sdk.session.prompt({
        sessionID: sdkSession.id,
        parts: [{ type: 'text', text: issue.description }]
      })

      broadcastEvent(issueId, {
        type: 'status_update',
        issueId,
        status: 'in_progress',
        agentStatus: 'writing_code'
      })

    } catch (err: any) {
      console.error('Failed to start agent:', err)
      this.sessions.delete(issueId)
      broadcastEvent(issueId, {
        type: 'system',
        content: `Error: ${err.message}`,
        timestamp: Date.now()
      })
    }
  }

  stop(issueId: string) {
    const session = this.sessions.get(issueId)
    if (session?.sessionID) {
      this.sdk.session.abort({ sessionID: session.sessionID })
      this.sessionToIssue.delete(session.sessionID)
    }
    this.sessions.delete(issueId)
    broadcastEvent(issueId, { 
      type: 'system', 
      content: 'Agent session terminated.',
      timestamp: Date.now() 
    })
  }

  async sendIntervention(issueId: string, content: string) {
    const session = this.sessions.get(issueId)
    if (session?.sessionID) {
      await this.sdk.session.prompt({
        sessionID: session.sessionID,
        parts: [{ type: 'text', text: content }]
      })
    }
    broadcastEvent(issueId, { 
      type: 'system', 
      content: `Human instruction received: ${content}`,
      timestamp: Date.now() 
    })
  }
}

export const agentManager = new AgentManager()
