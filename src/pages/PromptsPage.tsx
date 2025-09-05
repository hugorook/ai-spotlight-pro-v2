import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AppShell from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/use-toast';
import { Wand2, Save, RefreshCw, Globe, Edit2, Check, X, Loader2, MessageSquare } from 'lucide-react';

interface Prompt {
  id: string;
  text: string;
  category: 'easy-win' | 'moderate' | 'challenging' | 'trending';
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
  geographic_focus?: string[];
}

const PromptsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Company form state
  const [company, setCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    website: '',
    company_name: '',
    industry: '',
    description: '',
    target_customers: '',
    key_differentiators: '',
    geographic_focus: ['Global']
  });
  
  // Prompts state
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
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
      }

      if (companyData) {
        setCompany(companyData);
        setFormData({
          website: companyData.website_url || '',
          company_name: companyData.company_name || '',
          industry: companyData.industry || '',
          description: companyData.description || '',
          target_customers: companyData.target_customers || '',
          key_differentiators: companyData.key_differentiators || '',
          geographic_focus: companyData.geographic_focus || ['Global']
        });

        // Load prompts from database first, then localStorage
        const { data: dbPrompts } = await supabase
          .from('prompts')
          .select('*')
          .eq('company_id', companyData.id)
          .order('created_at', { ascending: true });

        if (dbPrompts && dbPrompts.length > 0) {
          const convertedPrompts = dbPrompts.map((p: any, index: number) => ({
            id: `prompt-${index + 1}`,
            text: p.text,
            category: (p.tags && p.tags.length > 0) ? p.tags[0] : 'moderate',
            intent: 'User is looking for company recommendations',
            isEditing: false
          }));
          setPrompts(convertedPrompts);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const analyzeWebsite = async () => {
    if (!formData.website.trim()) {
      toast({ 
        title: 'Website Required', 
        description: 'Please enter a website URL first.', 
        variant: 'destructive' 
      });
      return;
    }

    setAnalyzing(true);
    
    try {
      console.log('Invoking analyze-website-for-fields with URL:', formData.website);
      const { data, error } = await supabase.functions.invoke('analyze-website-for-fields', {
        body: { url: formData.website }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data && data.fields) {
        const fields = data.fields;
        const updatedFormData = {
          ...formData,
          company_name: fields.companyName || formData.company_name,
          industry: fields.industry || formData.industry,
          description: fields.description || formData.description,
          target_customers: fields.targetCustomers || formData.target_customers,
          key_differentiators: fields.keyDifferentiators || formData.key_differentiators,
          geographic_focus: Array.isArray(fields.geographicFocus) 
            ? fields.geographicFocus 
            : (fields.geographicFocus ? [fields.geographicFocus] : formData.geographic_focus)
        };
        
        setFormData(updatedFormData);

        toast({ 
          title: 'Website Analyzed', 
          description: 'Company information has been auto-filled. Generating prompts...' 
        });

        // Automatically generate prompts after successful analysis
        console.log('Checking if we can generate prompts:', {
          company_name: updatedFormData.company_name,
          industry: updatedFormData.industry,
          hasCompanyName: !!updatedFormData.company_name,
          hasIndustry: !!updatedFormData.industry
        });
        
        if (updatedFormData.company_name && updatedFormData.industry) {
          console.log('Calling generatePromptsWithData...');
          try {
            await generatePromptsWithData(updatedFormData);
            console.log('generatePromptsWithData completed successfully');
          } catch (promptError) {
            console.error('generatePromptsWithData failed:', promptError);
            toast({
              title: 'Prompt Generation Failed',
              description: `Could not generate prompts: ${promptError.message}`,
              variant: 'destructive'
            });
          }
        } else {
          console.log('Cannot generate prompts - missing required fields');
          toast({
            title: 'Cannot Generate Prompts',
            description: 'Company name and industry are required to generate prompts.',
            variant: 'destructive'
          });
        }
      }
    } catch (error) {
      console.error('Error analyzing website:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({ 
        title: 'Analysis Failed', 
        description: `Could not analyze website: ${errorMessage}. Please fill in the information manually.`, 
        variant: 'destructive' 
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const generatePromptsWithData = async (dataToUse: typeof formData) => {
    console.log('generatePromptsWithData called with:', dataToUse);
    
    if (!dataToUse.company_name || !dataToUse.industry) {
      console.error('Missing required fields:', { 
        company_name: dataToUse.company_name, 
        industry: dataToUse.industry 
      });
      toast({ 
        title: 'Required Fields', 
        description: 'Company name and industry are required to generate prompts.', 
        variant: 'destructive' 
      });
      return;
    }

    console.log('Starting prompt generation...');
    setGenerating(true);
    
    try {
      // First save/update company info
      let companyId = company?.id;
      
      if (!company) {
        // Create new company
        const { data: newCompany, error: createError } = await supabase
          .from('companies')
          .insert({
            user_id: user?.id,
            company_name: dataToUse.company_name,
            industry: dataToUse.industry,
            description: dataToUse.description,
            target_customers: dataToUse.target_customers,
            key_differentiators: dataToUse.key_differentiators,
            website_url: dataToUse.website,
            geographic_focus: dataToUse.geographic_focus
          })
          .select()
          .single();

        if (createError) throw createError;
        setCompany(newCompany);
        companyId = newCompany.id;
      } else {
        // Update existing company
        const { error: updateError } = await supabase
          .from('companies')
          .update({
            company_name: dataToUse.company_name,
            industry: dataToUse.industry,
            description: dataToUse.description,
            target_customers: dataToUse.target_customers,
            key_differentiators: dataToUse.key_differentiators,
            website_url: dataToUse.website,
            geographic_focus: dataToUse.geographic_focus
          })
          .eq('id', company.id);

        if (updateError) throw updateError;
      }

      // Generate prompts
      console.log('Invoking generate-prompts with data:', dataToUse);
      const { data, error } = await supabase.functions.invoke('generate-prompts', {
        body: {
          companyName: dataToUse.company_name,
          industry: dataToUse.industry,
          description: dataToUse.description,
          targetCustomers: dataToUse.target_customers,
          keyDifferentiators: dataToUse.key_differentiators,
          websiteUrl: dataToUse.website,
          geographicFocus: dataToUse.geographic_focus[0] || 'Global',
          requestedCount: 10
        }
      });

      console.log('Generate prompts response:', { data, error });

      if (error) {
        console.error('Generate prompts error:', error);
        throw error;
      }

      console.log('Raw prompts data from edge function:', data);

      const generatedPrompts = (data?.prompts || []).map((p: any, index: number) => ({
        id: `prompt-${index + 1}`,
        text: p.text,
        category: p.category || 'moderate',
        intent: p.intent || 'User is looking for company recommendations',
        isEditing: false
      }));

      console.log('Processed prompts:', generatedPrompts);

      if (generatedPrompts.length === 0) {
        throw new Error('No prompts were generated by the AI service');
      }

      // Save to database
      console.log('Saving prompts to database for company ID:', companyId);
      const promptsToSave = generatedPrompts.map((prompt: any) => ({
        company_id: companyId,
        text: prompt.text
        // Note: Removed tags for now due to schema issue
      }));
      
      // Clear existing prompts
      console.log('Clearing existing prompts...');
      const { error: deleteError } = await supabase.from('prompts').delete().eq('company_id', companyId);
      if (deleteError) {
        console.error('Error deleting existing prompts:', deleteError);
        // Don't throw here, just log it
      }
      
      // Insert new prompts
      console.log('Inserting new prompts:', promptsToSave);
      const { error: insertError } = await supabase.from('prompts').insert(promptsToSave);
      
      if (insertError) {
        console.error('Error inserting prompts:', insertError);
        throw insertError;
      }

      console.log('Setting prompts in UI state...');
      setPrompts(generatedPrompts);
      
      toast({ 
        title: 'Prompts Generated', 
        description: `Generated ${generatedPrompts.length} new test prompts successfully.` 
      });

    } catch (error) {
      console.error('Error generating prompts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({ 
        title: 'Generation Failed', 
        description: `Failed to generate prompts: ${errorMessage}. Please try again.`, 
        variant: 'destructive' 
      });
    } finally {
      setGenerating(false);
    }
  };

  const generatePrompts = async () => {
    await generatePromptsWithData(formData);
  };

  const updatePrompt = (id: string, field: string, value: string) => {
    setPrompts(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const toggleEdit = (id: string) => {
    setPrompts(prev => prev.map(p => 
      p.id === id ? { ...p, isEditing: !p.isEditing } : p
    ));
  };

  const savePrompts = async () => {
    if (!company) return;
    
    setSaving(true);
    
    try {
      const dbPrompts = prompts.map(p => ({
        company_id: company.id,
        text: p.text
        // Note: Removed tags for now due to schema issue
      }));
      
      await supabase.from('prompts').delete().eq('company_id', company.id);
      const { error: insertError } = await supabase.from('prompts').insert(dbPrompts);
      
      if (insertError) throw insertError;
      
      setPrompts(prev => prev.map(p => ({ ...p, isEditing: false })));
      
      toast({ title: 'Success', description: 'Prompts saved successfully' });
    } catch (error) {
      console.error('Error saving prompts:', error);
      toast({ title: 'Error', description: 'Failed to save prompts', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'easy-win': return 'bg-green-100 text-green-700';
      case 'moderate': return 'bg-blue-100 text-blue-700';
      case 'challenging': return 'bg-red-100 text-red-700';
      case 'trending': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="h1 mb-2">Test Prompts</h1>
          <p className="body text-gray-600">Generate and manage your AI test prompts</p>
        </div>

        {/* URL Input Box */}
        <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="Enter your website URL (e.g., https://example.com)"
                className="w-full px-4 py-3 border rounded-lg text-lg"
              />
            </div>
            <button
              onClick={analyzeWebsite}
              disabled={analyzing || !formData.website}
              className="px-6 py-3 bg-[#5F209B] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Globe className="w-5 h-5" />
                  Auto-Fill & Generate
                </>
              )}
            </button>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side - Company Info */}
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="h3">Company Information</h2>
              <button
                onClick={generatePrompts}
                disabled={generating}
                className="px-4 py-2 bg-[#5F209B] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Generate Prompts
                  </>
                )}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Company Name *</label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Your company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Industry *</label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Software Development, Healthcare, Finance"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Brief description of what your company does"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Target Customers</label>
                <textarea
                  value={formData.target_customers}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_customers: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                  placeholder="Who are your ideal customers?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Key Differentiators</label>
                <textarea
                  value={formData.key_differentiators}
                  onChange={(e) => setFormData(prev => ({ ...prev, key_differentiators: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                  placeholder="What makes you different from competitors?"
                />
              </div>
            </div>
          </div>

          {/* Right Side - Generated Prompts */}
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="h3">Generated Prompts ({prompts.length}/10)</h2>
              {prompts.length > 0 && (
                <button
                  onClick={savePrompts}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save All
                    </>
                  )}
                </button>
              )}
            </div>

            {prompts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No prompts generated yet</p>
                <p className="text-sm">Fill in company info and click "Generate Prompts"</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {prompts.map((prompt, index) => (
                  <div key={prompt.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(prompt.category)}`}>
                          {prompt.category}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleEdit(prompt.id)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>

                    {prompt.isEditing ? (
                      <div className="space-y-3">
                        <textarea
                          value={prompt.text}
                          onChange={(e) => updatePrompt(prompt.id, 'text', e.target.value)}
                          className="w-full p-2 border rounded text-sm"
                          rows={3}
                        />
                        <select
                          value={prompt.category}
                          onChange={(e) => updatePrompt(prompt.id, 'category', e.target.value)}
                          className="w-full p-2 border rounded text-sm"
                        >
                          <option value="easy-win">Easy Win</option>
                          <option value="moderate">Moderate</option>
                          <option value="challenging">Challenging</option>
                          <option value="trending">Trending</option>
                        </select>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700 leading-relaxed">{prompt.text}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default PromptsPage;