import React from 'react';

export type ActionRailInput = {
  clusterId: string;
  reasons: string[];
  connectorsAvailable: string[];
  onGenerateBrief?: (type: 'blog'|'faq'|'comparison'|'pr'|'linkedin') => void;
  onPushToCMS?: () => void;
  onAssign?: () => void;
  onRunNow?: () => void;
};

export default function ActionRail({ clusterId, reasons, connectorsAvailable, onGenerateBrief, onPushToCMS, onAssign, onRunNow }: ActionRailInput) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Actions for {clusterId}</div>
        {onRunNow && (
          <button onClick={onRunNow} className="text-xs px-2 py-1 rounded border border-input">Run Now</button>
        )}
      </div>
      <div className="text-xs text-muted-foreground mb-3">Why: {reasons?.[0] ?? 'Underperforming prompt'}</div>
      <div className="flex flex-wrap gap-2">
        {onGenerateBrief && (
          <>
            <button onClick={() => onGenerateBrief('blog')} className="text-xs px-2 py-1 rounded border border-input">Generate Brief: Blog</button>
            <button onClick={() => onGenerateBrief('faq')} className="text-xs px-2 py-1 rounded border border-input">FAQ</button>
            <button onClick={() => onGenerateBrief('comparison')} className="text-xs px-2 py-1 rounded border border-input">Comparison</button>
            <button onClick={() => onGenerateBrief('pr')} className="text-xs px-2 py-1 rounded border border-input">PR angle</button>
            <button onClick={() => onGenerateBrief('linkedin')} className="text-xs px-2 py-1 rounded border border-input">LinkedIn</button>
          </>
        )}
        {onPushToCMS && (
          <button onClick={onPushToCMS} className="text-xs px-2 py-1 rounded border border-input">Push to CMS {connectorsAvailable?.length ? `(${connectorsAvailable.join(', ')})` : ''}</button>
        )}
        {onAssign && (
          <button onClick={onAssign} className="text-xs px-2 py-1 rounded border border-input">Assign to Team</button>
        )}
      </div>
    </div>
  );
}

