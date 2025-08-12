import React from "react";

type PromptLibraryProps = {
  title?: string;
  description?: string;
  prompts?: string[];
  models?: string[];
};

const DEFAULT_PROMPTS = [
  "Best [industry] providers for [use-case]",
  "Top [industry] companies in [region]",
  "Compare [industry] solutions for [target customer]",
  "What are key features of [industry] tools?",
  "Who are leaders in [industry]?",
];

const DEFAULT_MODELS = [
  "gpt-4o",
  "claude-3.5",
  "gemini-1.5",
  "llama-405b",
];

export default function PromptLibrary({
  title = "Prompt Library & Model Coverage",
  description = "Starter prompts commonly used by buyers. Heatmap indicates model coverage readiness (placeholder).",
  prompts = DEFAULT_PROMPTS,
  models = DEFAULT_MODELS,
}: PromptLibraryProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground m-0">{description}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
        {/* Prompts */}
        <div className="flex flex-col gap-2">
          {prompts.map((p, idx) => (
            <div key={idx} className="flex items-center justify-between rounded-md border border-border bg-muted/10 px-3 py-2">
              <span className="text-sm text-foreground truncate">{p}</span>
              <button className="inline-flex items-center justify-center rounded-md border border-input bg-background px-2 py-1 text-xs font-medium hover:bg-accent hover:text-accent-foreground">
                Use →
              </button>
            </div>
          ))}
        </div>

        {/* Heatmap */}
        <div className="rounded-md border border-border bg-muted/10 p-3">
          <div className="grid" style={{ gridTemplateColumns: `120px repeat(${models.length}, 1fr)` }}>
            <div></div>
            {models.map((m) => (
              <div key={m} className="text-xs text-muted-foreground text-center pb-2">{m}</div>
            ))}

            {prompts.slice(0, 4).map((p, rowIdx) => (
              <React.Fragment key={p}>
                <div className="text-xs text-foreground pr-2 py-1 truncate">{p}</div>
                {models.map((m, colIdx) => (
                  <div key={m + colIdx} className="flex items-center justify-center py-1">
                    <span
                      className={
                        "inline-block h-3 w-3 rounded-full " +
                        (rowIdx === 0 || colIdx === 0
                          ? "bg-green-500/80"
                          : rowIdx === 1
                          ? "bg-yellow-500/80"
                          : "bg-gray-500/60")
                      }
                    />
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-green-500/80"></span> Good</div>
            <div className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-yellow-500/80"></span> Partial</div>
            <div className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-gray-500/60"></span> Unknown</div>
          </div>
        </div>
      </div>
    </div>
  );
}

