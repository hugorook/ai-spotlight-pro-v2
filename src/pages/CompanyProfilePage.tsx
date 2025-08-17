import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppShell from "@/components/layout/AppShell";
import CommandPalette from "@/components/CommandPalette";
import { useToast } from "@/components/ui/use-toast";
import LoadingOverlay from "@/components/LoadingOverlay";
import type { Tables } from '@/types/supabase';

type Company = Tables<'companies'>;

const CompanyProfilePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
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

  const generatePromptsForCompany = async () => {
    if (!company) return;
    
    try {
      console.log('Generating prompts for updated company profile...');
      
      const { data, error } = await supabase.functions.invoke('generate-prompts', {
        body: {
          companyName: company.company_name,
          industry: company.industry,
          description: company.description,
          targetCustomers: company.target_customers,
          keyDifferentiators: company.key_differentiators,
          websiteUrl: company.website_url
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
      
      // Save to localStorage
      localStorage.setItem(`prompts_${company.id}`, JSON.stringify(generatedPrompts));
      
      console.log(`Generated ${generatedPrompts.length} new prompts`);
      toast({ 
        title: 'Prompts Updated', 
        description: `Generated ${generatedPrompts.length} new test prompts based on your updated company profile.`
      });
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

  if (loading) {
    return (
      <AppShell>
        <LoadingOverlay loading label="Loading company profile...">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-64" />
            <div className="h-52 bg-muted rounded" />
          </div>
        </LoadingOverlay>
        <CommandPalette />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Company Profile</h1>
          <p className="text-muted-foreground">
            Manage your company information to improve AI visibility and content generation.
          </p>
        </div>

        <div className="glass-card p-8">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
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
                <label className="block text-sm font-medium text-foreground mb-2">
                  Website URL *
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => updateFormData('website', e.target.value)}
                  className="w-full p-3 bg-white text-black border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://www.yourcompany.com"
                />
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

          <div className="flex justify-end mt-8">
            <button
              onClick={handleSubmit}
              disabled={!formData.companyName || !formData.industry || saving}
              className="px-6 py-3 bg-gradient-ai text-white rounded-lg font-medium disabled:opacity-50 hover:scale-[1.02] transition-all duration-300"
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
      <CommandPalette />
    </AppShell>
  );
};

export default CompanyProfilePage;