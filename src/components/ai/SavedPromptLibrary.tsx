import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type SavedPrompt = {
  id: string;
  text: string;
  tags: string[];
};

type Props = {
  companyId: string;
  onUsePrompt?: (text: string) => void;
};

const lsKey = (companyId: string) => `saved_prompts_${companyId}`;

export default function SavedPromptLibrary({ companyId, onUsePrompt }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<SavedPrompt[]>([]);
  const [query, setQuery] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [newTags, setNewTags] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => i.text.toLowerCase().includes(q) || i.tags.some(t => t.toLowerCase().includes(q)));
  }, [items, query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from('prompts').select('id, text, tags').eq('company_id', companyId).order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        setItems(data as unknown as SavedPrompt[]);
        localStorage.setItem(lsKey(companyId), JSON.stringify(data));
        return;
      }
    } catch (e: any) {
      const cached = localStorage.getItem(lsKey(companyId));
      if (cached) {
        setItems(JSON.parse(cached));
      } else {
        setItems([]);
      }
      setError('Using local library (cloud table not found)');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const addPrompt = async () => {
    const text = newPrompt.trim();
    if (!text) return;
    const tags = newTags.split(',').map(s => s.trim()).filter(Boolean);
    const item: SavedPrompt = { id: crypto.randomUUID(), text, tags };
    setItems(prev => [item, ...prev]);
    setNewPrompt(""); setNewTags("");
    localStorage.setItem(lsKey(companyId), JSON.stringify([item, ...items]));
    try {
      await supabase.from('prompts').insert({ id: item.id, company_id: companyId, text: item.text, tags: item.tags });
    } catch {}
  };

  const removePrompt = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    localStorage.setItem(lsKey(companyId), JSON.stringify(items.filter(i => i.id !== id)));
    try {
      await supabase.from('prompts').delete().eq('id', id).eq('company_id', companyId);
    } catch {}
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Saved Prompt Library</h3>
          <p className="text-xs text-muted-foreground m-0">{error ? error : 'Synced to cloud when available'}</p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search prompts or tags..."
          className="h-9 w-48 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="mb-4 grid gap-2 md:grid-cols-[1.6fr_1fr_120px]">
        <input
          value={newPrompt}
          onChange={(e) => setNewPrompt(e.target.value)}
          placeholder="New prompt text"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <input
          value={newTags}
          onChange={(e) => setNewTags(e.target.value)}
          placeholder="tags (comma-separated)"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button onClick={addPrompt} className="h-9 rounded-md bg-primary text-primary-foreground px-3 text-sm hover:bg-primary/90">Save</button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground">No saved prompts yet</div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-md border border-border bg-muted/10 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm text-foreground m-0 truncate">{p.text}</p>
                {p.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {p.tags.map((t, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-primary/20 text-primary">{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {onUsePrompt && (
                  <button onClick={() => onUsePrompt(p.text)} className="rounded-md border border-input bg-background px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground">Use</button>
                )}
                <button onClick={() => removePrompt(p.id)} className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs hover:bg-destructive/20">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

