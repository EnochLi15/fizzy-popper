import { WebSocketServer, WebSocket } from 'ws'

const clients = new Set<WebSocket>()

export const initWebSocket = (server: any) => {
  const wss = new WebSocketServer({ server })
  
  wss.on('connection', (ws) => {
    clients.add(ws)
    ws.on('close', () => clients.delete(ws))
  })
}

export const broadcastEvent = (issueId: string, event: any) => {
  const payload = JSON.stringify({ issueId, ...event })
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload)
    }
  }
}
