import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import EnhancedSidebar from '@/components/layout/EnhancedSidebar';
import { useToast } from '@/components/ui/use-toast';
import { Wand2, RefreshCw, Globe, Edit2, Check, X, Loader2, MessageSquare } from 'lucide-react';

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
  const [extractedCompanyData, setExtractedCompanyData] = useState<any>(null);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadCompanyAndPrompts();
    }
  }, [user?.id]);

  const loadCompanyAndPrompts = async () => {
    try {
      setLoading(true);
      
      // First, try to load most recent generated prompts from database
      console.log('Attempting to load prompts from database for user:', user?.id);
      try {
        const { data: recentPrompts, error: promptsError } = await supabase
          .from('generated_prompts')
          .select('*')
          .eq('user_id', user?.id)
          .order('generated_at', { ascending: false })
          .limit(1)
          .single();
          
        console.log('Database query result:', { data: recentPrompts, error: promptsError });
          
        if (!promptsError && recentPrompts) {
          console.log('Successfully loaded prompts from database:', recentPrompts);
          
          // Set prompts from database
          const convertedPrompts = recentPrompts.prompts.map((p: any, index: number) => ({
            id: `prompt-${index + 1}`,
            text: p.text,
            category: p.category || 'moderate',
            intent: p.intent || 'User is looking for company recommendations',
            isEditing: false
          }));
          
          setPrompts(convertedPrompts);
          setExtractedCompanyData(recentPrompts.company_data);
          
          // Also update form data with the website URL
          setFormData(prev => ({ 
            ...prev, 
            website: recentPrompts.website_url || ''
          }));
          
          // Save to localStorage for immediate access
          const urlHash = btoa(recentPrompts.website_url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
          const cacheData = {
            prompts: convertedPrompts,
            companyData: recentPrompts.company_data,
            websiteUrl: recentPrompts.website_url,
            timestamp: Date.now()
          };
          localStorage.setItem(`health_check_${urlHash}`, JSON.stringify(cacheData));
          
          // We successfully loaded from database, so skip the rest
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Could not load recent prompts from database:', err);
      }
      
      // Only load company information if we didn't find prompts in the database
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

        // Load prompts from database first, then localStorage fallback
        try {
          const { data: dbPrompts, error: dbError } = await supabase
            .from('prompts')
            .select('*')
            .eq('company_id', companyData.id)
            .order('created_at', { ascending: true });

          if (dbError) {
            console.warn('Database load failed, trying localStorage:', dbError);
            throw dbError;
          }

          if (dbPrompts && dbPrompts.length > 0) {
            const convertedPrompts = dbPrompts.map((p: any, index: number) => ({
              id: `prompt-${index + 1}`,
              text: p.text,
              category: (p.tags && p.tags.length > 0) ? p.tags[0] : 'moderate',
              intent: 'User is looking for company recommendations',
              isEditing: false
            }));
            setPrompts(convertedPrompts);
          } else {
            // Try localStorage if no database prompts
            const localPrompts = localStorage.getItem(`prompts_${companyData.id}`);
            if (localPrompts) {
              console.log('Loaded prompts from localStorage');
              setPrompts(JSON.parse(localPrompts));
            }
          }
        } catch (loadError) {
          console.warn('Database load failed, trying localStorage fallback');
          const localPrompts = localStorage.getItem(`prompts_${companyData.id}`);
          if (localPrompts) {
            console.log('Loaded prompts from localStorage fallback');
            setPrompts(JSON.parse(localPrompts));
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const generatePromptsFromURL = async () => {
    if (!formData.website.trim()) {
      toast({ 
        title: 'Website Required', 
        description: 'Please enter a website URL first.', 
        variant: 'destructive' 
      });
      return;
    }

    setGenerating(true);
    
    try {
      console.log('Generating prompts directly from URL:', formData.website);
      const { data, error } = await supabase.functions.invoke('generate-prompts', {
        body: { 
          websiteUrl: formData.website,
          requestedCount: 10
        }
      });

      console.log('Generate prompts response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Prompt generation failed: ${error.message || JSON.stringify(error)}`);
      }

      if (!data?.prompts || data.prompts.length === 0) {
        throw new Error('No prompts were generated from the website analysis');
      }

      const generatedPrompts = data.prompts.map((p: any, index: number) => ({
        id: `prompt-${index + 1}`,
        text: p.text,
        category: p.category || 'moderate',
        intent: p.intent || 'User is looking for company recommendations',
        isEditing: false
      }));

      // Extract company data from the API response (the generate-prompts function analyzed the website)
      const companyData = data.companyData || {
        companyName: 'Unknown Company',
        industry: 'Unknown Industry', 
        description: '',
        targetCustomers: '',
        keyDifferentiators: ''
      };

      setPrompts(generatedPrompts);
      setExtractedCompanyData(companyData);
      
      // Save both prompts AND company data to localStorage with URL-based key
      try {
        const urlHash = btoa(formData.website).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
        const cacheData = {
          prompts: generatedPrompts,
          companyData: companyData,
          websiteUrl: formData.website,
          timestamp: Date.now()
        };
        localStorage.setItem(`health_check_${urlHash}`, JSON.stringify(cacheData));
        console.log('Saved prompts and company data for health check:', cacheData);
      } catch (e) {
        console.warn('Could not save to localStorage:', e);
      }
      
      // Save to database for cross-device persistence
      if (!user?.id) {
        console.warn('No user ID available, cannot save to database');
      } else {
        try {
          console.log('Saving prompts to database for user:', user.id, 'website:', formData.website);
          
          // First delete any existing prompts for this URL and user
          const { error: deleteError } = await supabase
            .from('generated_prompts')
            .delete()
            .eq('user_id', user.id)
            .eq('website_url', formData.website);
          
        if (deleteError) {
          console.error('Error deleting existing prompts:', deleteError);
        }
        
          // Now insert the new prompts
          const { data: insertData, error: dbError } = await supabase
            .from('generated_prompts')
            .insert({
              user_id: user.id,
              website_url: formData.website,
              company_data: companyData,
              prompts: generatedPrompts,
              prompt_count: generatedPrompts.length,
              generation_method: 'url_analysis',
              generated_at: new Date().toISOString()
            })
            .select();
            
          if (dbError) {
            console.error('Could not save prompts to database:', dbError);
            console.error('Database error details:', {
              message: dbError.message,
              details: dbError.details,
              hint: dbError.hint,
              code: dbError.code
            });
          } else {
            console.log('Successfully saved prompts to database:', insertData);
          }
        } catch (dbError) {
          console.error('Database save failed:', dbError);
        }
      }
      
      toast({ 
        title: 'Prompts Generated', 
        description: `Generated ${generatedPrompts.length} test prompts from your website.` 
      });

    } catch (error) {
      console.error('Error generating prompts from URL:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({ 
        title: 'Generation Failed', 
        description: `Could not generate prompts: ${errorMessage}`, 
        variant: 'destructive' 
      });
    } finally {
      setGenerating(false);
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

      // Save to database - try with error handling for schema issues
      console.log('Saving prompts to database for company ID:', companyId);
      
      try {
        const promptsToSave = generatedPrompts.map((prompt: any) => ({
          company_id: companyId,
          text: prompt.text
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
          console.warn('Database save failed, but continuing with UI display');
          // Don't throw - just warn and continue
        } else {
          console.log('Successfully saved prompts to database');
        }
        
      } catch (dbError) {
        console.error('Database operation failed:', dbError);
        console.warn('Continuing without database save - prompts will be shown in UI only');
      }

      console.log('Setting prompts in UI state...');
      setPrompts(generatedPrompts);
      
      // Also save to localStorage as backup
      try {
        localStorage.setItem(`prompts_${companyId}`, JSON.stringify(generatedPrompts));
        console.log('Saved prompts to localStorage as backup');
      } catch (e) {
        console.warn('Could not save to localStorage:', e);
      }
      
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

  // Prompts are automatically cached to localStorage when generated

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
      <div className="min-h-screen bg-[#ece7e0]">
        <EnhancedSidebar />
        <div className="lg:pl-[12.5rem] px-6 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-[#3d3d38]">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#ece7e0]">
      <EnhancedSidebar />
      <div className="lg:pl-[12.5rem] px-6 py-6">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-corben text-[#282823] text-3xl mb-1" style={{fontWeight: 400}}>Test Prompts</h1>
          <p className="text-[12px] text-[#3d3d38]">Generate and manage your AI test prompts</p>
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
              onClick={generatePromptsFromURL}
              disabled={generating || !formData.website}
              className="px-6 py-3 bg-[#5F209B] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Generate Prompts
                </>
              )}
            </button>
          </div>
        </div>

        {/* Generated Prompts */}
        <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="h3">Generated Prompts ({prompts.length}/10)</h2>
              {prompts.length > 0 && (
                <div className="text-sm text-green-600 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Auto-saved to cache
                </div>
              )}
            </div>

            {prompts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No prompts generated yet</p>
                <p className="text-sm">Enter a website URL and click "Generate Prompts"</p>
              </div>
            ) : (
              <div className="space-y-3">
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

        {/* Company Information Display */}
        {extractedCompanyData && (
          <div className="bg-white rounded-lg border shadow-sm p-6 mt-6">
            <h2 className="h3 mb-4">Extracted Company Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-600">Company Name</label>
                <div className="px-3 py-2 bg-gray-50 border rounded-lg text-sm">
                  {extractedCompanyData.companyName || 'Not detected'}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-600">Industry</label>
                <div className="px-3 py-2 bg-gray-50 border rounded-lg text-sm">
                  {extractedCompanyData.industry || 'Not detected'}
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1 text-gray-600">Description</label>
                <div className="px-3 py-2 bg-gray-50 border rounded-lg text-sm">
                  {extractedCompanyData.description || 'Not detected'}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-600">Target Customers</label>
                <div className="px-3 py-2 bg-gray-50 border rounded-lg text-sm">
                  {extractedCompanyData.targetCustomers || 'Not detected'}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-600">Key Differentiators</label>
                <div className="px-3 py-2 bg-gray-50 border rounded-lg text-sm">
                  {extractedCompanyData.keyDifferentiators || 'Not detected'}
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> This information was automatically extracted from your website and will be used for the health check to provide accurate results.
              </p>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default PromptsPage;