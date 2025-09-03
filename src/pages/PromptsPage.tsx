import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AppShell from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/use-toast';
import { Wand2, Save, RefreshCw, MessageSquare, Edit2, Check, X, Plus } from 'lucide-react';

interface Prompt {
  id: string;
  text: string;
  category: 'easy-win' | 'moderate' | 'challenging';
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
      
      // Load enhanced analysis data if available and recent, but prioritize current company profile
      let enhancedData = {};
      try {
        const stored = localStorage.getItem('website_analysis_enhanced');
        if (stored) {
          const parsedData = JSON.parse(stored);
          // Check if analysis is for current company and is recent (less than 1 hour old)
          const isRecent = parsedData.timestamp && (Date.now() - parsedData.timestamp < 3600000);
          const isCurrentCompany = parsedData.companyAnalyzed === companyData.company_name;
          
          if (isRecent && isCurrentCompany) {
            enhancedData = parsedData;
            console.log('Using fresh enhanced analysis data with AI knowledge integration');
          } else {
            console.log('Enhanced analysis data is stale or for different company, will use basic extraction');
            localStorage.removeItem('website_analysis_enhanced');
          }
        }
      } catch (e) {
        console.log('No enhanced analysis data available');
      }
      
      // Always use current geographic focus from company profile, not cached data
      const geographicFocus = (companyData.geographic_focus && companyData.geographic_focus[0]) || 'Global';
      
      const { data, error } = await supabase.functions.invoke('generate-prompts', {
        body: {
          companyName: companyData.company_name,
          industry: companyData.industry,
          description: companyData.description,
          targetCustomers: companyData.target_customers,
          keyDifferentiators: companyData.key_differentiators,
          websiteUrl: companyData.website_url,
          geographicFocus: geographicFocus,
          ...enhancedData,
          // Override any cached locations with current geographic focus
          locations: enhancedData.locations ? [geographicFocus, ...enhancedData.locations].slice(0, 3) : [geographicFocus]
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
      
      const hasEnhancedData = Object.keys(enhancedData).length > 0;
      toast({ 
        title: 'Success', 
        description: `Generated ${generatedPrompts.length} ${hasEnhancedData ? 'AI-enhanced' : 'standard'} search prompts${hasEnhancedData ? ' using AI knowledge + company analysis' : ''}` 
      });
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
      category: 'moderate',
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
      case 'easy-win': return 'bg-green-100 text-green-700';
      case 'moderate': return 'bg-blue-100 text-blue-700';
      case 'challenging': return 'bg-red-100 text-red-700';
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
          <h2 className="h2 mb-2">No Company Profile Found</h2>
          <p className="body mb-4">
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
            <h1 className="h1">Test Prompts</h1>
            <p className="body">
              Manage the search queries used for AI health checks
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={regeneratePrompts}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 glass rounded-lg hover:bg-[#5F209B] hover:text-white transition-none"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Generating...' : 'Regenerate'}
            </button>
            <button
              onClick={savePrompts}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#5F209B] text-white rounded-lg hover:opacity-90 transition-none"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Company Info */}
        <div className="glass p-4 rounded-lg">
          <h3 className="h4 mb-2">Company: {company.company_name}</h3>
          <p className="body text-xs">
            Industry: {company.industry} | Target: {company.target_customers || 'Not specified'}
          </p>
        </div>

        {/* Prompts List */}
        <div className="space-y-3">
          {prompts.map((prompt, index) => (
            <div key={prompt.id} className="glass px-3 py-2 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex gap-4 flex-1 items-center">
                  {/* Left side: Number and Tag */}
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <span className="body text-sm font-medium">#{index + 1}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getCategoryColor(prompt.category)}`}>
                      {prompt.category}
                    </span>
                  </div>
                  
                  {/* Right side: Prompt content */}
                  {!prompt.isEditing && (
                    <div className="flex-1">
                      <p className="body font-medium">"{prompt.text}"</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {prompt.isEditing ? (
                    <>
                      <button
                        onClick={() => toggleEdit(prompt.id)}
                        className="p-1 text-green-600 hover:bg-[#5F209B] hover:text-white rounded transition-none flex items-center justify-center"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removePrompt(prompt.id)}
                        className="p-1 text-red-600 hover:bg-[#5F209B] hover:text-white rounded transition-none flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => toggleEdit(prompt.id)}
                      className="p-1 hover:bg-[#5F209B] hover:text-white rounded transition-none flex items-center justify-center"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {prompt.isEditing && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium body mb-1">Search Query</label>
                    <textarea
                      value={prompt.text}
                      onChange={(e) => updatePrompt(prompt.id, 'text', e.target.value)}
                      className="w-full p-2 bg-white text-black rounded border text-sm"
                      rows={2}
                      placeholder="What would users actually search for?"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Category</label>
                    <select
                      value={prompt.category}
                      onChange={(e) => updatePrompt(prompt.id, 'category', e.target.value)}
                      className="w-full p-2 bg-white text-black rounded border text-sm"
                    >
                      <option value="easy-win">Easy Win</option>
                      <option value="moderate">Moderate</option>
                      <option value="challenging">Challenging</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add New Prompt Button */}
          <button
            onClick={addNewPrompt}
            className="w-full p-4 glass rounded-lg border-2 border-dashed border-black/20 hover:border-black/40 hover:bg-[#5F209B] hover:text-white transition-none flex items-center justify-center gap-2 body"
          >
            <Plus className="w-4 h-4" />
            Add New Prompt
          </button>
        </div>

        {/* Info */}
        <div className="glass p-4 rounded-lg">
          <h4 className="h4 mb-2">How This Works</h4>
          <ul className="body text-xs space-y-1">
            <li>These prompts are used by the automated health check to test your AI visibility</li>
            <li>Focus on realistic searches your potential customers would actually make</li>
            <li>Edit prompts to better match your target audience and use cases</li>
            <li>Prompts are automatically generated when you save company information</li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
};

export default PromptsPage;