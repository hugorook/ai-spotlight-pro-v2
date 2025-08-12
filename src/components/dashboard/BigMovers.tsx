import React from 'react';

export type Mover = { id: string; reason?: string; delta: number };

export default function BigMovers({ wins, losses }: { wins: Mover[]; losses: Mover[] }) {
  const renderItem = (m: Mover) => (
    <div key={m.id} className="flex items-center justify-between rounded-lg border border-input p-3 bg-background">
      <div>
        <div className="text-sm font-medium">{m.id}</div>
        {m.reason && <div className="text-xs text-muted-foreground mt-1">{m.reason}</div>}
      </div>
      <div className={`text-sm font-semibold ${m.delta > 0 ? 'text-green-500' : 'text-red-500'}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</div>
    </div>
  );
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-sm font-semibold mb-3">Biggest Wins</div>
        <div className="space-y-2">
          {wins?.length ? wins.map(renderItem) : <div className="text-xs text-muted-foreground">No movers</div>}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-sm font-semibold mb-3">Biggest Losses</div>
        <div className="space-y-2">
          {losses?.length ? losses.map(renderItem) : <div className="text-xs text-muted-foreground">No movers</div>}
        </div>
      </div>
    </div>
  );
}

