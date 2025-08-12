import React from 'react';

export type TilesProps = {
  mentionRate: number; // 0..1
  avgPosition: number | null;
  modelCoverage: Record<string, { mentionRate: number; avgPosition: number | null }>;
  winStreak: number;
};

export default function Tiles({ mentionRate, avgPosition, modelCoverage, winStreak }: TilesProps) {
  const coverageBadges = Object.entries(modelCoverage || {}).slice(0, 6);
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-xs text-muted-foreground">Mention Rate</div>
        <div className="text-2xl font-bold">{Math.round((mentionRate ?? 0) * 100)}%</div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-xs text-muted-foreground">Avg Position</div>
        <div className="text-2xl font-bold">{avgPosition ? avgPosition.toFixed(1) : '—'}</div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-xs text-muted-foreground">Model Coverage</div>
        <div className="flex flex-wrap gap-2 mt-2">
          {coverageBadges.length === 0 ? (
            <span className="text-muted-foreground text-sm">No data</span>
          ) : (
            coverageBadges.map(([model, m]) => (
              <span key={model} className="text-xs px-2 py-1 rounded border border-input">
                {model}: {Math.round(m.mentionRate * 100)}%
              </span>
            ))
          )}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-xs text-muted-foreground">Win Streak</div>
        <div className="text-2xl font-bold">{winStreak}w</div>
      </div>
    </div>
  );
}

