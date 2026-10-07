export interface StreamClient {
  id: string;
  poolId: string;
  send: (payload: string) => void;
}

export class GamedayStreamHub {
  private clients: Map<string, StreamClient> = new Map();

  registerClient(id: string, poolId: string, send: (payload: string) => void): void {
    this.clients.set(id, { id, poolId, send });
  }

  unregisterClient(id: string): void {
    this.clients.delete(id);
  }

  getClientCount(poolId?: string): number {
    if (!poolId) return this.clients.size;
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.poolId === poolId) count++;
    }
    return count;
  }

  formatSSE(event: string, data: any): string {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  }

  broadcastToPool(poolId: string, event: string, payload: any): void {
    const message = this.formatSSE(event, payload);
    for (const client of this.clients.values()) {
      if (client.poolId === poolId) {
        try {
          client.send(message);
        } catch {
          this.unregisterClient(client.id);
        }
      }
    }
  }

  broadcastDelta(poolId: string, gameId: string, patches: any[]): void {
    if (!patches || patches.length === 0) return;
    this.broadcastToPool(poolId, 'DRIVE_DELTA', { gameId, patches, timestamp: new Date().toISOString() });
  }
}

export const gamedayStreamHub = new GamedayStreamHub();
