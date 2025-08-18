import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AppShell from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/use-toast';
import { Wand2, Save, RefreshCw, MessageSquare, Edit2, Check, X, Plus } from 'lucide-react';

interface Prompt {
  id: string;
  text: string;
  category: 'problem-solving' | 'comparison' | 'recommendation' | 'how-to' | 'best-practices';
  intent: string;
  isEditing?: boolean;
}

interface Company {
  id: string;
  company_name: string;
  industry: string;
  description?: string;
  target_customers?: string;
  key_differentiators?: string;
  website_url?: string;
}

const PromptsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadCompanyAndPrompts();
    }
  }, [user?.id]);

  const loadCompanyAndPrompts = async () => {
    try {
      setLoading(true);
      
      // Load company information
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (companyError && companyError.code !== 'PGRST116') {
        console.error('Error loading company:', companyError);
        toast({ title: 'Error', description: 'Failed to load company information', variant: 'destructive' });
        return;
      }

      setCompany(companyData);

      if (companyData) {
        // Try to load existing prompts from localStorage first
        const savedPrompts = localStorage.getItem(`prompts_${companyData.id}`);
        if (savedPrompts) {
          try {
            const parsed = JSON.parse(savedPrompts);
            setPrompts(parsed.map((p: any) => ({ ...p, isEditing: false })));
          } catch (e) {
            console.error('Error parsing saved prompts:', e);
          }
        }

        // If no saved prompts, check if we should generate them
        if (!savedPrompts || JSON.parse(savedPrompts).length === 0) {
          await generateInitialPrompts(companyData);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const generateInitialPrompts = async (companyData: Company) => {
    try {
      setGenerating(true);
      
      const { data, error } = await supabase.functions.invoke('generate-prompts', {
        body: {
          companyName: companyData.company_name,
          industry: companyData.industry,
          description: companyData.description,
          targetCustomers: companyData.target_customers,
          keyDifferentiators: companyData.key_differentiators,
          websiteUrl: companyData.website_url
        }
      });

      if (error) {
        console.error('Error generating prompts:', error);
        toast({ title: 'Error', description: 'Failed to generate prompts', variant: 'destructive' });
        return;
      }

      const generatedPrompts = (data?.prompts || []).map((p: any) => ({ ...p, isEditing: false }));
      setPrompts(generatedPrompts);
      
      // Save to localStorage
      localStorage.setItem(`prompts_${companyData.id}`, JSON.stringify(generatedPrompts));
      
      toast({ title: 'Success', description: `Generated ${generatedPrompts.length} realistic search prompts` });
    } catch (error) {
      console.error('Error generating prompts:', error);
      toast({ title: 'Error', description: 'Failed to generate prompts', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const regeneratePrompts = async () => {
    if (!company) return;
    await generateInitialPrompts(company);
  };

  const toggleEdit = (id: string) => {
    setPrompts(prev => prev.map(p => 
      p.id === id ? { ...p, isEditing: !p.isEditing } : p
    ));
  };

  const updatePrompt = (id: string, field: keyof Prompt, value: string) => {
    setPrompts(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const savePrompts = async () => {
    if (!company) return;
    
    try {
      setSaving(true);
      
      // Save to localStorage
      const promptsToSave = prompts.map(p => ({ ...p, isEditing: false }));
      localStorage.setItem(`prompts_${company.id}`, JSON.stringify(promptsToSave));
      
      // Update state to exit edit mode
      setPrompts(promptsToSave);
      
      toast({ title: 'Success', description: 'Prompts saved successfully' });
    } catch (error) {
      console.error('Error saving prompts:', error);
      toast({ title: 'Error', description: 'Failed to save prompts', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const addNewPrompt = () => {
    const newPrompt: Prompt = {
      id: `prompt-${Date.now()}`,
      text: '',
      category: 'problem-solving',
      intent: '',
      isEditing: true
    };
    setPrompts(prev => [...prev, newPrompt]);
  };

  const removePrompt = (id: string) => {
    setPrompts(prev => prev.filter(p => p.id !== id));
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'problem-solving': return 'bg-red-100 text-red-700';
      case 'comparison': return 'bg-blue-100 text-blue-700';
      case 'recommendation': return 'bg-green-100 text-green-700';
      case 'how-to': return 'bg-purple-100 text-purple-700';
      case 'best-practices': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading prompts...</div>
        </div>
      </AppShell>
    );
  }

  if (!company) {
    return (
      <AppShell>
        <div className="text-center py-12">
          <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No Company Profile Found</h2>
          <p className="text-muted-foreground mb-4">
            Please set up your company profile first to generate test prompts.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Test Prompts</h1>
            <p className="text-muted-foreground">
              Manage the search queries used for AI health checks
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={regeneratePrompts}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 glass rounded-lg hover:bg-[#111E63] hover:text-white transition-none"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Generating...' : 'Regenerate'}
            </button>
            <button
              onClick={savePrompts}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#111E63] text-white rounded-lg hover:opacity-90 transition-none"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Company Info */}
        <div className="glass p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-foreground mb-2">Company: {company.company_name}</h3>
          <p className="text-xs text-muted-foreground">
            Industry: {company.industry} | Target: {company.target_customers || 'Not specified'}
          </p>
        </div>

        {/* Prompts List */}
        <div className="space-y-4">
          {prompts.map((prompt, index) => (
            <div key={prompt.id} className="glass p-4 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getCategoryColor(prompt.category)}`}>
                      {prompt.category}
                    </span>
                    {!prompt.isEditing && (
                      <>
                        <p className="text-foreground font-medium ml-2">"{prompt.text}"</p>
                      </>
                    )}
                  </div>
                  {!prompt.isEditing && prompt.intent && (
                    <p className="text-xs text-muted-foreground">Intent: {prompt.intent}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {prompt.isEditing ? (
                    <>
                      <button
                        onClick={() => toggleEdit(prompt.id)}
                        className="p-1 text-green-600 hover:bg-[#111E63] hover:text-white rounded transition-none"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removePrompt(prompt.id)}
                        className="p-1 text-red-600 hover:bg-[#111E63] hover:text-white rounded transition-none"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => toggleEdit(prompt.id)}
                      className="p-1 text-muted-foreground hover:bg-[#111E63] hover:text-white rounded transition-none"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {prompt.isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Search Query</label>
                    <textarea
                      value={prompt.text}
                      onChange={(e) => updatePrompt(prompt.id, 'text', e.target.value)}
                      className="w-full p-2 bg-white text-black rounded border text-sm"
                      rows={2}
                      placeholder="What would users actually search for?"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Category</label>
                      <select
                        value={prompt.category}
                        onChange={(e) => updatePrompt(prompt.id, 'category', e.target.value)}
                        className="w-full p-2 bg-white text-black rounded border text-sm"
                      >
                        <option value="problem-solving">Problem Solving</option>
                        <option value="comparison">Comparison</option>
                        <option value="recommendation">Recommendation</option>
                        <option value="how-to">How To</option>
                        <option value="best-practices">Best Practices</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">User Intent</label>
                      <input
                        type="text"
                        value={prompt.intent}
                        onChange={(e) => updatePrompt(prompt.id, 'intent', e.target.value)}
                        className="w-full p-2 bg-white text-black rounded border text-sm"
                        placeholder="What is the user trying to achieve?"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add New Prompt Button */}
          <button
            onClick={addNewPrompt}
            className="w-full p-4 glass rounded-lg border-2 border-dashed border-white/30 hover:border-white/50 hover:bg-[#111E63] hover:text-white transition-none flex items-center justify-center gap-2 text-muted-foreground"
          >
            <Plus className="w-4 h-4" />
            Add New Prompt
          </button>
        </div>

        {/* Info */}
        <div className="glass p-4 rounded-lg">
          <h4 className="text-sm font-semibold text-foreground mb-2">How This Works</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• These prompts are used by the automated health check to test your AI visibility</li>
            <li>• Focus on realistic searches your potential customers would actually make</li>
            <li>• Edit prompts to better match your target audience and use cases</li>
            <li>• Prompts are automatically generated when you save company information</li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
};

export default PromptsPage;