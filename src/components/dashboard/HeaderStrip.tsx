import React from 'react';

export type HeaderStripProps = {
  score: number;
  delta: number; // percent
  momentum: 'up' | 'down' | 'flat';
  forecast?: number | null;
};

export default function HeaderStrip({ score, delta, momentum, forecast }: HeaderStripProps) {
  const arrow = momentum === 'up' ? '⬆️' : momentum === 'down' ? '⬇️' : '➖';
  const deltaColor = delta > 0 ? '#22c55e' : delta < 0 ? '#ef4444' : '#9CA3AF';
  return (
    <div className="rounded-xl border border-border bg-card p-6 flex items-center justify-between">
      <div>
        <div className="text-sm text-muted-foreground">Visibility Score</div>
        <div className="text-3xl font-bold">{score}</div>
      </div>
      <div className="text-center">
        <div className="text-sm text-muted-foreground">WoW delta</div>
        <div className="text-xl font-semibold" style={{ color: deltaColor }}>
          {arrow} {delta}%
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm text-muted-foreground">Forecast</div>
        <div className="text-xl font-semibold">{forecast ?? '—'}</div>
      </div>
    </div>
  );
}

