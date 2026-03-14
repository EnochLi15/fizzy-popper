import { createOpencodeClient } from "@opencode-ai/sdk/v2"
import { broadcastEvent } from './ws.js'
import { prisma } from './lib/prisma.js'

export interface AgentSession {
  issueId: string
  sessionID?: string
  workspaceUrl?: string
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

  private extractSessionID(payload: any): string | undefined {
    return payload?.sessionID
      || payload?.info?.sessionID
      || payload?.properties?.sessionID
      || payload?.properties?.info?.sessionID
      || payload?.payload?.properties?.sessionID
      || payload?.payload?.properties?.info?.sessionID
      || payload?.id
  }

  private async updateIssueState(issueId: string, data: { status?: string; agentStatus?: string; workspaceUrl?: string }) {
    await prisma.issue.update({
      where: { id: issueId },
      data,
    })

    broadcastEvent(issueId, {
      type: 'status_update',
      issueId,
      ...data,
    })
  }

  private async listenToEvents() {
    try {
      const result = await this.sdk.global.event()
      for await (const envelope of result.stream as any) {
        const event = envelope?.payload || envelope
        const { type, properties } = event
        const sessionID = this.extractSessionID(event)
        if (!sessionID) continue

        const issueId = this.sessionToIssue.get(sessionID)
        if (!issueId) continue

        console.log(`[SDK Event] ${type} for issue ${issueId}:`, properties)

        switch (type) {
          case 'message.updated':
            const text = properties.info?.parts?.find((part: any) => part.type === 'text')?.text
            if (text) {
              broadcastEvent(issueId, {
                id: Math.random().toString(36).slice(2),
                type: 'thought',
                content: text,
                timestamp: Date.now()
              })
            }
            break
          case 'session.status': {
            const sdkStatus = properties?.status?.type
            const issueStatus = sdkStatus === 'idle' ? 'done' : 'in_progress'
            const agentStatus = sdkStatus === 'idle' ? 'completed' : sdkStatus === 'retry' ? 'waiting_input' : 'writing_code'
            await this.updateIssueState(issueId, { status: issueStatus, agentStatus })
            break
          }
          case 'session.idle':
            await this.updateIssueState(issueId, { status: 'done', agentStatus: 'completed' })
            break
          case 'session.updated': {
            const workspaceUrl = properties?.info?.share?.url
            if (workspaceUrl) {
              const session = this.sessions.get(issueId)
              if (session) session.workspaceUrl = workspaceUrl
              await this.updateIssueState(issueId, { workspaceUrl })
            }
            break
          }
          case 'tool.called':
            broadcastEvent(issueId, {
              id: Math.random().toString(36).slice(2),
              type: 'tool_call',
              command: properties.info?.command || properties.info?.call?.name,
              output: 'Executing...',
              timestamp: Date.now()
            })
            break
          case 'tool.completed':
            broadcastEvent(issueId, {
              id: Math.random().toString(36).slice(2),
              type: 'tool_call',
              command: properties.info?.command || properties.info?.call?.name,
              output: properties.info?.output || properties.info?.result,
              timestamp: Date.now()
            })
            break
          case 'command.executed':
            if (properties?.name?.toLowerCase()?.includes('web')) {
              broadcastEvent(issueId, {
                id: Math.random().toString(36).slice(2),
                type: 'tool_call',
                command: properties.name,
                output: properties.arguments,
                timestamp: Date.now()
              })
            }
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
    
    const issue = await prisma.issue.findUnique({ 
      where: { id: issueId },
      include: { parent: true }
    })
    if (!issue) return

    const goldenTicket = await prisma.issue.findFirst({
      where: { status: issue.status, isGoldenTicket: true }
    })

    let systemPrompt = goldenTicket?.description || "Work on the following issue."
    
    let context = ""
    if (issue.parent) {
      context = `\n\nParent Issue Context:\nTitle: ${issue.parent.title}\nDescription: ${issue.parent.description}\n---\n`
    }

    const finalPrompt = `${systemPrompt}${context}\n\nTask to complete:\nTitle: ${issue.title}\nDescription: ${issue.description}`

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
          agentStatus: 'writing_code',
          status: 'in_progress'
        }
      })

      if (sharedUrl) {
        session.workspaceUrl = sharedUrl
      }

      await this.sdk.session.prompt({
        sessionID: sdkSession.id,
        parts: [{ type: 'text', text: finalPrompt }]
      })

      broadcastEvent(issueId, {
        type: 'status_update',
        issueId,
        status: 'in_progress',
        agentStatus: 'writing_code',
        workspaceUrl: sharedUrl
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
