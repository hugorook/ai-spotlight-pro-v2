import React from 'react';

export type MatrixInput = Record<string, Record<string, { mentionRate: number; avgPosition: number | null; trend?: number }>>;

export default function Matrix({ data }: { data: MatrixInput }) {
  const models = Object.keys(data || {});
  const stages = Array.from(new Set(models.flatMap((m) => Object.keys(data[m] || {}))));
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-sm font-semibold mb-3">Multi-LLM Matrix</div>
      {models.length === 0 ? (
        <div className="text-xs text-muted-foreground">No data</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2">Stage</th>
                {models.map((m) => (
                  <th key={m} className="text-left p-2">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stages.map((stage) => (
                <tr key={stage} className="border-t border-border">
                  <td className="p-2 text-muted-foreground capitalize">{stage}</td>
                  {models.map((m) => {
                    const cell = data[m]?.[stage];
                    const rate = cell ? Math.round((cell.mentionRate ?? 0) * 100) : 0;
                    const pos = cell?.avgPosition ?? null;
                    const trend = cell?.trend ?? 0;
                    const trendColor = trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-muted-foreground';
                    return (
                      <td key={m + stage} className="p-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-block text-xs px-2 py-1 rounded border border-input">{rate}%</span>
                          <span className="text-xs">{pos ? `#${pos.toFixed(1)}` : '—'}</span>
                          <span className={`text-xs ${trendColor}`}>{trend === 0 ? '—' : (trend > 0 ? `+${trend}` : trend)}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

