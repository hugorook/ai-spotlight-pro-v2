import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppShell from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/use-toast";
import LoadingOverlay from "@/components/LoadingOverlay";
import type { Tables } from '@/types/supabase';

type Company = Tables<'companies'>;

const CompanyProfilePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [analyzingWebsite, setAnalyzingWebsite] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    companyName: '',
    website: '',
    industry: '',
    description: '',
    targetCustomers: '',
    differentiators: '',
    geography: ''
  });

  const industries = [
    'Technology/Software',
    'Marketing/Advertising',
    'Professional Services',
    'Healthcare',
    'Finance/Banking',
    'E-commerce/Retail',
    'Manufacturing',
    'Education',
    'Real Estate',
    'Other'
  ];

  useEffect(() => {
    if (user) {
      loadCompanyData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadCompanyData = async () => {
    try {
      const { data: companies } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user?.id);

      if (companies && companies.length > 0) {
        const companyData = companies[0];
        setCompany(companyData);
        setFormData({
          companyName: companyData.company_name || '',
          website: companyData.website_url || '',
          industry: companyData.industry || '',
          description: companyData.description || '',
          targetCustomers: companyData.target_customers || '',
          differentiators: companyData.key_differentiators || '',
          geography: (companyData.geographic_focus && companyData.geographic_focus[0]) || ''
        });
      }
    } catch (error) {
      console.error('Error loading company:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.companyName.trim()) {
      toast({ 
        title: 'Validation Error', 
        description: 'Company name is required.', 
        variant: 'destructive' 
      });
      return;
    }

    setSaving(true);
    try {
      // Use direct database update if company exists, otherwise create new
      if (company) {
        const { error } = await supabase
          .from('companies')
          .update({
            company_name: formData.companyName,
            website_url: formData.website,
            description: formData.description,
            industry: formData.industry,
            target_customers: formData.targetCustomers,
            key_differentiators: formData.differentiators,
            geographic_focus: formData.geography ? [formData.geography] : null
          })
          .eq('id', company.id);

        if (error) {
          console.error('Error updating company:', error);
          toast({ 
            title: 'Save Failed', 
            description: `Failed to update company: ${error.message}`, 
            variant: 'destructive' 
          });
          return;
        }
      } else {
        // Create new company
        const { error } = await supabase
          .from('companies')
          .insert({
            user_id: user?.id,
            company_name: formData.companyName,
            website_url: formData.website,
            description: formData.description,
            industry: formData.industry,
            target_customers: formData.targetCustomers,
            key_differentiators: formData.differentiators,
            geographic_focus: formData.geography ? [formData.geography] : null
          });

        if (error) {
          console.error('Error creating company:', error);
          toast({ 
            title: 'Save Failed', 
            description: `Failed to create company: ${error.message}`, 
            variant: 'destructive' 
          });
          return;
        }
      }

      toast({ 
        title: 'Profile Updated', 
        description: 'Your company profile has been saved successfully.' 
      });
      
      // Reload the data
      await loadCompanyData();
      
      // Generate new prompts based on updated company info
      await generatePromptsForCompany();
    } catch (error) {
      console.error('Error:', error);
      toast({ 
        title: 'Unexpected Error', 
        description: 'An unexpected error occurred. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  const generatePromptsWithAnalysis = async (enhancedData: any) => {
    try {
      console.log('Generating 10 new prompts with fresh website analysis...');
      
      // Always use current geographic focus from form data
      const geographicFocus = formData.geography || 'Global';
      
      const { data, error } = await supabase.functions.invoke('generate-prompts', {
        body: {
          companyName: formData.companyName,
          industry: formData.industry,
          description: formData.description,
          targetCustomers: formData.targetCustomers,
          keyDifferentiators: formData.differentiators,
          websiteUrl: formData.website,
          geographicFocus: geographicFocus,
          requestedCount: 10, // Request exactly 10 prompts
          ...enhancedData,
          // Override any cached locations with current geographic focus
          locations: enhancedData.locations ? [geographicFocus, ...enhancedData.locations].slice(0, 3) : [geographicFocus]
        }
      });

      if (error) {
        console.error('Error generating prompts:', error);
        toast({ 
          title: 'Prompt Generation Warning', 
          description: 'Analysis complete but failed to generate new test prompts. You can generate them manually from the Prompts page.',
          variant: 'destructive'
        });
        return;
      }

      const generatedPrompts = (data?.prompts || []).map((p: any) => ({ ...p, isEditing: false }));
      
      // Save to localStorage (we'll use company name as key since company might not be saved yet)
      const companyKey = company?.id || `temp_${formData.companyName.replace(/\s+/g, '_').toLowerCase()}`;
      localStorage.setItem(`prompts_${companyKey}`, JSON.stringify(generatedPrompts));
      
      console.log(`Generated ${generatedPrompts.length} new prompts with website analysis`);
    } catch (error) {
      console.error('Error generating prompts:', error);
      toast({ 
        title: 'Prompt Generation Warning', 
        description: 'Analysis complete but failed to generate new test prompts. You can generate them manually from the Prompts page.',
        variant: 'destructive'
      });
    }
  };

  const generatePromptsForCompany = async () => {
    if (!company) return;
    
    try {
      console.log('Generating prompts for updated company profile...');
      
      // Load enhanced analysis data if available, but prioritize current company profile
      let enhancedData = {};
      try {
        const stored = localStorage.getItem('website_analysis_enhanced');
        if (stored) {
          enhancedData = JSON.parse(stored);
        }
      } catch (e) {
        console.log('No enhanced analysis data available');
      }
      
      // Always use current geographic focus from company profile, not cached data
      const geographicFocus = (company.geographic_focus && company.geographic_focus[0]) || 'Global';
      
      const { data, error } = await supabase.functions.invoke('generate-prompts', {
        body: {
          companyName: company.company_name,
          industry: company.industry,
          description: company.description,
          targetCustomers: company.target_customers,
          keyDifferentiators: company.key_differentiators,
          websiteUrl: company.website_url,
          geographicFocus: geographicFocus,
          requestedCount: 10, // Always generate 10 prompts
          ...enhancedData,
          // Override any cached locations with current geographic focus
          locations: enhancedData.locations ? [geographicFocus, ...enhancedData.locations].slice(0, 3) : [geographicFocus]
        }
      });

      if (error) {
        console.error('Error generating prompts:', error);
        toast({ 
          title: 'Prompt Generation Warning', 
          description: 'Company saved but failed to generate new test prompts. You can generate them manually from the Prompts page.',
          variant: 'destructive'
        });
        return;
      }

      const generatedPrompts = (data?.prompts || []).map((p: any) => ({ ...p, isEditing: false }));
      
      // Save to Supabase database first
      const promptsToSave = generatedPrompts.map((prompt: any) => ({
        company_id: company.id,
        text: prompt.text,
        tags: [prompt.category || 'moderate']
      }));
      
      // Clear existing prompts for this company
      await supabase.from('prompts').delete().eq('company_id', company.id);
      
      // Insert new prompts
      const { error: insertError } = await supabase.from('prompts').insert(promptsToSave);
      
      if (insertError) {
        console.error('Error saving prompts to database:', insertError);
        // Fallback to localStorage only
        localStorage.setItem(`prompts_${company.id}`, JSON.stringify(generatedPrompts));
        toast({ 
          title: 'Prompts Generated', 
          description: `Generated ${generatedPrompts.length} new test prompts (saved locally).`
        });
      } else {
        // Also save to localStorage for immediate access
        localStorage.setItem(`prompts_${company.id}`, JSON.stringify(generatedPrompts));
        console.log(`Generated and saved ${generatedPrompts.length} new prompts to database`);
        toast({ 
          title: 'Prompts Updated', 
          description: `Generated ${generatedPrompts.length} new test prompts and saved to database.`
        });
      }
    } catch (error) {
      console.error('Error generating prompts:', error);
      toast({ 
        title: 'Prompt Generation Warning', 
        description: 'Company saved but failed to generate new test prompts. You can generate them manually from the Prompts page.',
        variant: 'destructive'
      });
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

    setAnalyzingWebsite(true);
    
    // Clear any old cached analysis data to ensure fresh AI knowledge + website analysis
    localStorage.removeItem('website_analysis_enhanced');
    try {
      const { data, error } = await supabase.functions.invoke('analyze-website-for-fields', {
        body: { url: formData.website }
      });

      if (error) {
        console.error('Website analysis error:', error);
        toast({ 
          title: 'Analysis Failed', 
          description: 'Failed to analyze website. Please fill in the fields manually.', 
          variant: 'destructive' 
        });
        return;
      }

      if (data?.fields) {
        const fields = data.fields;
        setFormData(prev => ({
          ...prev,
          companyName: fields.companyName || prev.companyName,
          industry: fields.industry || prev.industry,
          description: fields.description || prev.description,
          targetCustomers: fields.targetCustomers || prev.targetCustomers,
          differentiators: fields.keyDifferentiators || prev.differentiators,
          geography: fields.geographicFocus || prev.geography
        }));
        
        // Store enhanced analysis data for prompt generation with timestamp for freshness
        const enhancedData = {
          specificServices: fields.specificServices || [],
          industryNiches: fields.industryNiches || [],
          technologies: fields.technologies || [],
          companySizes: fields.companySizes || [],
          locations: fields.locations || [],
          uniqueCombinations: fields.uniqueCombinations || [],
          timestamp: Date.now(),
          companyAnalyzed: formData.companyName // Track which company this analysis is for
        };
        localStorage.setItem('website_analysis_enhanced', JSON.stringify(enhancedData));
        
        // Automatically generate updated prompts with the new analysis
        await generatePromptsWithAnalysis(enhancedData);
        
        toast({ 
          title: 'Analysis Complete', 
          description: 'Website analyzed and 10 new test prompts generated automatically!' 
        });
      }
    } catch (error) {
      console.error('Website analysis error:', error);
      toast({ 
        title: 'Analysis Failed', 
        description: 'Failed to analyze website. Please fill in the fields manually.', 
        variant: 'destructive' 
      });
    } finally {
      setAnalyzingWebsite(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <LoadingOverlay loading label="Loading company profile...">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-64" />
            <div className="h-52 bg-muted rounded" />
          </div>
        </LoadingOverlay>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div>
        <div className="mb-8">
          <h1 className="h1 mb-2">Company Profile</h1>
          <p className="body">
            Manage your company information to improve AI visibility and content generation.
          </p>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium body mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => updateFormData('companyName', e.target.value)}
                  className="w-full p-3 bg-white text-black border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g. Acme Software Solutions"
                />
              </div>

              <div>
                <label className="block text-sm font-medium body mb-2">
                  Website URL *
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => updateFormData('website', e.target.value)}
                    className="flex-1 p-3 bg-white text-black border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="https://www.yourcompany.com"
                  />
                  <button
                    type="button"
                    onClick={analyzeWebsite}
                    disabled={analyzingWebsite || !formData.website.trim()}
                    className="px-4 py-3 bg-[#5F209B] text-white rounded-lg font-medium disabled:opacity-50 hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    {analyzingWebsite ? 'Analyzing...' : 'Auto-Fill'}
                  </button>
                </div>
                <p className="text-xs body mt-1">
                  Click "Auto-Fill" to analyze your website and populate the form fields automatically
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Industry *
              </label>
              <select
                value={formData.industry}
                onChange={(e) => updateFormData('industry', e.target.value)}
                className="w-full p-3 bg-white text-black border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select your industry</option>
                {industries.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Company Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                rows={4}
                className="w-full p-3 bg-white text-black border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-vertical"
                placeholder="Briefly describe what your company does and your main value proposition..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Target Customers
              </label>
              <textarea
                value={formData.targetCustomers}
                onChange={(e) => updateFormData('targetCustomers', e.target.value)}
                rows={3}
                className="w-full p-3 bg-white text-black border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-vertical"
                placeholder="Who are your ideal customers? (e.g., SaaS startups with 10-50 employees, enterprise manufacturers, etc.)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Key Differentiators
              </label>
              <textarea
                value={formData.differentiators}
                onChange={(e) => updateFormData('differentiators', e.target.value)}
                rows={3}
                className="w-full p-3 bg-white text-black border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-vertical"
                placeholder="What makes you different from competitors? Awards, unique features, special expertise, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Geographic Focus
              </label>
              <input
                type="text"
                value={formData.geography}
                onChange={(e) => updateFormData('geography', e.target.value)}
                className="w-full p-3 bg-white text-black border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., North America, Global, etc."
              />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={handleSubmit}
              disabled={!formData.companyName || !formData.industry || saving}
              className="px-6 py-3 bg-[#5F209B] text-white rounded-lg font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {saving ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default CompanyProfilePage;