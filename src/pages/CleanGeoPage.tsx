import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/types/supabase';
import AppShell from '@/components/layout/AppShell';
import LoadingOverlay from '@/components/LoadingOverlay';
import { useToast } from '@/components/ui/use-toast';
import PromptLibrary from '@/components/ai/PromptLibrary';
import SavedPromptLibrary from '@/components/ai/SavedPromptLibrary';
import { HelpTooltip, InfoBox } from '@/components/ui/help-tooltip';
import ModelHeatmap from '@/components/ai/ModelHeatmap';
import { scheduleJob, logEvent } from '@/integrations/supabase/functions';
import { downloadCsv } from '@/lib/export';
import { printReport } from '@/lib/pdf';
import AnimatedPath from '@/components/ui/animated-path';
import MorseLoader from '@/components/ui/morse-loader';
import ResultsSection from '@/components/ui/results-section';

type Company = Tables<'companies'>;

interface TestResult {
  prompt: string;
  mentioned: boolean;
  position: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  context: string;
  response?: string; // Full AI response
  failureAnalysis?: FailureAnalysis;
}

interface FailureAnalysis {
  primaryReason: string;
  category: 'content' | 'authority' | 'technical' | 'competition';
  severity: 'critical' | 'moderate' | 'minor';
  quickFix: string;
  detailedFix: string;
  timeToFix: string;
  difficulty: 'easy' | 'moderate' | 'needs-dev';
  expectedImpact: string;
  competitorInsight?: string;
}

interface TrendingOpportunity {
  query: string;
  trendScore: number;
  timeWindow: string;
  reasoning: string;
  suggestedContent: string;
  difficulty: 'easy' | 'moderate' | 'advanced';
}

interface ContentOpportunity {
  id: string;
  title: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
  prompts: string[];
  outline: string[];
  optimizationTips: string[];
  expectedImpact: string;
}

// Persist last run locally so results remain when navigating away and back
interface PersistedLastRun {
  type: 'health' | 'custom';
  results: TestResult[];
  strategies?: any[];
  timestamp: number;
}

interface CompanySetupFormProps {
  onComplete: () => void;
}

const CompanySetupForm: React.FC<CompanySetupFormProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [analyzingWebsite, setAnalyzingWebsite] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    website: '',
    industry: '',
    description: '',
    products: '',
    targetCustomers: '',
    differentiators: '',
    geography: ''
  });

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

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

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!formData.companyName.trim()) {
      alert('Company name is required.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('save-company', {
        body: {
          company_name: formData.companyName,
          website_url: formData.website,
          description: formData.description,
          industry: formData.industry,
          target_customers: formData.targetCustomers,
          key_differentiators: formData.differentiators,
          geographic_focus: [formData.geography]
        }
      });

      if (error) {
        console.error('Error saving company:', error);
        alert('Failed to save company data. Please try again.');
        return;
      }

      console.log('Company profile saved successfully.');
      onComplete();
    } catch (error) {
      console.error('Error:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const analyzeWebsite = async () => {
    if (!formData.website.trim()) {
      alert('Please enter a website URL first.');
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
        alert('Failed to analyze website. Please fill in the fields manually.');
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
        
        alert('Website analyzed successfully using AI knowledge + website content! Fields have been populated. You can edit them as needed.\n\nNote: This enhanced analysis combines AI\'s existing knowledge about your company with current website information to create more targeted prompts.');
      }
    } catch (error) {
      console.error('Website analysis error:', error);
      alert('Failed to analyze website. Please fill in the fields manually.');
    } finally {
      setAnalyzingWebsite(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      paddingTop: '80px',
      paddingBottom: '40px',
      paddingLeft: '20px',
      paddingRight: '20px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#fff',
            marginBottom: '16px'
          }}>
            Let's Optimize Your AI Visibility
          </h1>
          <p style={{
            color: '#888',
            fontSize: '18px',
            lineHeight: '1.5'
          }}>
            We need some information about your company to generate the most relevant AI prompts
          </p>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid #333',
          borderRadius: '12px',
          padding: '32px'
        }}>
          {/* Progress Bar */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '14px', color: '#888' }}>Step {step} of {totalSteps}</span>
              <span style={{ fontSize: '14px', color: '#888' }}>{Math.round(progress)}% Complete</span>
            </div>
            <div style={{
              width: '100%',
              height: '4px',
              background: '#333',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: '#111E63',
                transition: 'transition-none'
              }} />
            </div>
          </div>

          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '24px'
              }}>
                <div style={{
                  padding: '8px',
                  background: 'rgba(17, 30, 99, 0.2)',
                  borderRadius: '8px'
                }}>
                  <span style={{ fontSize: '20px' }}>🏢</span>
                </div>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#fff',
                  margin: 0
                }}>
                  Basic Company Information
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#ccc', marginBottom: '8px' }}>
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => updateFormData('companyName', e.target.value)}
                    placeholder="e.g. Acme Software Solutions"
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#ccc', marginBottom: '8px' }}>
                    Website URL *
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => updateFormData('website', e.target.value)}
                      placeholder="https://www.yourcompany.com"
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="button"
                      onClick={analyzeWebsite}
                      disabled={analyzingWebsite || !formData.website.trim()}
                      style={{
                        padding: '12px 16px',
                        background: analyzingWebsite || !formData.website.trim() ? '#333' : '#111E63',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: analyzingWebsite || !formData.website.trim() ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {analyzingWebsite ? 'Analyzing...' : 'Auto-Fill'}
                    </button>
                  </div>
                  <p style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                    Click "Auto-Fill" to analyze your website and populate the form fields automatically
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#ccc', marginBottom: '8px' }}>
                    Industry *
                  </label>
                  <select
                    value={formData.industry}
                    onChange={(e) => updateFormData('industry', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
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
                  <label style={{ display: 'block', fontSize: '14px', color: '#ccc', marginBottom: '8px' }}>
                    Company Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    placeholder="Briefly describe what your company does and your main value proposition..."
                    style={{
                      width: '100%',
                      minHeight: '100px',
                      padding: '12px',
                      background: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Products & Positioning */}
          {step === 2 && (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '24px'
              }}>
                <div style={{
                  padding: '8px',
                  background: 'rgba(17, 30, 99, 0.2)',
                  borderRadius: '8px'
                }}>
                  <span style={{ fontSize: '20px' }}>🎯</span>
                </div>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#fff',
                  margin: 0
                }}>
                  Products & Positioning
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#ccc', marginBottom: '8px' }}>
                    Target Customers *
                  </label>
                  <textarea
                    value={formData.targetCustomers}
                    onChange={(e) => updateFormData('targetCustomers', e.target.value)}
                    placeholder="Who are your ideal customers? (e.g., SaaS startups with 10-50 employees, enterprise manufacturers, etc.)"
                    style={{
                      width: '100%',
                      minHeight: '100px',
                      padding: '12px',
                      background: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#ccc', marginBottom: '8px' }}>
                    Key Differentiators *
                  </label>
                  <textarea
                    value={formData.differentiators}
                    onChange={(e) => updateFormData('differentiators', e.target.value)}
                    placeholder="What makes you different from competitors? Awards, unique features, special expertise, etc."
                    style={{
                      width: '100%',
                      minHeight: '100px',
                      padding: '12px',
                      background: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Geographic Focus */}
          {step === 3 && (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '24px'
              }}>
                <div style={{
                  padding: '8px',
                  background: 'rgba(17, 30, 99, 0.2)',
                  borderRadius: '8px'
                }}>
                  <span style={{ fontSize: '20px' }}>📍</span>
                </div>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#fff',
                  margin: 0
                }}>
                  Geographic Focus
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: '#ccc', marginBottom: '8px' }}>
                    Primary Markets *
                  </label>
                  <textarea
                    value={formData.geography}
                    onChange={(e) => updateFormData('geography', e.target.value)}
                    placeholder="Where do you primarily serve customers? (e.g., North America, New York City, Global, etc.)"
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '12px',
                      background: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '24px',
                  borderRadius: '8px'
                }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#fff',
                    marginBottom: '16px'
                  }}>
                    What happens next?
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      "We'll generate 50+ relevant AI prompts for your industry",
                      "Test your current visibility across major AI models",
                      "Get your personalized AI optimization strategy"
                    ].map((text, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          background: 'rgba(17, 30, 99, 0.2)',
                          color: '#111E63',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {index + 1}
                        </div>
                        <span style={{ fontSize: '14px', color: '#888' }}>{text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '32px'
          }}>
            <button
              onClick={handleBack}
              disabled={step === 1}
              style={{
                padding: '12px 24px',
                background: step === 1 ? '#333' : 'transparent',
                color: step === 1 ? '#666' : '#ccc',
                border: '1px solid #333',
                borderRadius: '6px',
                cursor: step === 1 ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={!formData.companyName || !formData.website || !formData.industry || loading}
              style={{
                padding: '12px 24px',
                background: (!formData.companyName || !formData.website || !formData.industry || loading) 
                  ? '#333' 
                  : '#111E63',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: (!formData.companyName || !formData.website || !formData.industry || loading) 
                  ? 'not-allowed' 
                  : 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <span>⟳</span>
                  Saving...
                </>
              ) : (
                <>
                  {step === totalSteps ? 'Generate AI Analysis' : 'Continue'}
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CompanyEditFormProps {
  company: Company;
  onComplete: () => void;
  onCancel: () => void;
}

const CompanyEditForm: React.FC<CompanyEditFormProps> = ({ company, onComplete, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: company.company_name || '',
    website: company.website_url || '',
    industry: company.industry || '',
    description: company.description || '',
    targetCustomers: company.target_customers || '',
    differentiators: company.key_differentiators || '',
    geography: (company.geographic_focus && company.geographic_focus[0]) || ''
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

  const handleSubmit = async () => {
    if (!formData.companyName.trim()) {
      alert('Company name is required.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('save-company', {
        body: {
          company_name: formData.companyName,
          website_url: formData.website,
          description: formData.description,
          industry: formData.industry,
          target_customers: formData.targetCustomers,
          key_differentiators: formData.differentiators,
          geographic_focus: [formData.geography]
        }
      });

      if (error) {
        console.error('Error updating company:', error);
        alert('Failed to update company data. Please try again.');
        return;
      }

      console.log('Company profile updated successfully.');
      onComplete();
    } catch (error) {
      console.error('Error:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid #333',
        borderRadius: '12px',
        padding: '32px'
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', marginBottom: '24px' }}>
          Edit Company Profile
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', color: '#ccc', marginBottom: '8px' }}>
              Company Name *
            </label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => updateFormData('companyName', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', color: '#ccc', marginBottom: '8px' }}>
              Website URL *
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => updateFormData('website', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', color: '#ccc', marginBottom: '8px' }}>
              Industry *
            </label>
            <select
              value={formData.industry}
              onChange={(e) => updateFormData('industry', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
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
            <label style={{ display: 'block', fontSize: '14px', color: '#ccc', marginBottom: '8px' }}>
              Company Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '14px',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', color: '#ccc', marginBottom: '8px' }}>
              Target Customers
            </label>
            <textarea
              value={formData.targetCustomers}
              onChange={(e) => updateFormData('targetCustomers', e.target.value)}
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '12px',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '14px',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', color: '#ccc', marginBottom: '8px' }}>
              Key Differentiators
            </label>
            <textarea
              value={formData.differentiators}
              onChange={(e) => updateFormData('differentiators', e.target.value)}
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '12px',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '14px',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', color: '#ccc', marginBottom: '8px' }}>
              Geographic Focus
            </label>
            <input
              type="text"
              value={formData.geography}
              onChange={(e) => updateFormData('geography', e.target.value)}
              placeholder="e.g., North America, Global, etc."
              style={{
                width: '100%',
                padding: '12px',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '32px',
          gap: '12px'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              color: '#ccc',
              border: '1px solid #333',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.companyName || !formData.industry || loading}
            style={{
              padding: '12px 24px',
              background: (!formData.companyName || !formData.industry || loading) 
                ? '#333' 
                : '#111E63',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: (!formData.companyName || !formData.industry || loading) 
                ? 'not-allowed' 
                : 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {loading ? (
              <>
                <span>⟳</span>
                Updating...
              </>
            ) : (
              <>
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function CleanGeoPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthScore, setHealthScore] = useState<number>(0);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningHealthCheck, setIsRunningHealthCheck] = useState(false);
  const [currentTestPrompt, setCurrentTestPrompt] = useState('');
  const [testProgress, setTestProgress] = useState({ current: 0, total: 0 });
  const [customPrompt, setCustomPrompt] = useState('');
  const [isTestingCustom, setIsTestingCustom] = useState(false);
  const [contentOpportunities, setContentOpportunities] = useState<ContentOpportunity[]>([]);
  const [showCompanySetup, setShowCompanySetup] = useState(false);
  const [scheduledWeekly, setScheduledWeekly] = useState<boolean>(false);
  const [lastRunType, setLastRunType] = useState<'health'|'custom'|null>(null);
  const [lastResults, setLastResults] = useState<TestResult[]>([]);
  const [jokeIndex, setJokeIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('health');
  const [healthCheckTab, setHealthCheckTab] = useState('results');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [autoStrategies, setAutoStrategies] = useState<any[]>([]);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [trendingOpportunities, setTrendingOpportunities] = useState<TrendingOpportunity[]>([]);
  const [strategyError, setStrategyError] = useState<string | null>(null);
  const [showResultsSection, setShowResultsSection] = useState(false);
  const [websiteAnalysis, setWebsiteAnalysis] = useState<any>(null);
  
  // Authority and benchmark analysis data state
  const [authorityAnalysis, setAuthorityAnalysis] = useState<any>(null);
  const [industryBenchmark, setIndustryBenchmark] = useState<any>(null);

  // On mount, load any persisted last run
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('geo_last_run');
      if (raw) {
        const parsed: PersistedLastRun = JSON.parse(raw);
        setLastRunType(parsed.type);
        setLastResults(parsed.results || []);
        setTestResults(parsed.results || []);
        if (parsed.results && parsed.results.length > 0) {
          setShowResultsSection(true);
          calculateHealthScore(parsed.results);
        }
        if (parsed.type === 'health') {
          setAutoStrategies(parsed.strategies || []);
          setWebsiteAnalysis(parsed.websiteAnalysis || null);
        }
      }
    } catch {}
  }, []);

  const professionalMessages = [
    'Analyzing AI model responses…',
    'Processing prompt variations…',
    'Evaluating mention accuracy…',
    'Testing industry-specific queries…',
    'Measuring visibility scores…',
    'Analyzing competitor positioning…',
    'Calculating sentiment analysis…',
    'Processing response rankings…',
    'Generating insights…',
    'Finalizing visibility report…'
  ];

  useEffect(() => {
    if (isRunningHealthCheck || isTestingCustom) {
      const id = setInterval(() => setJokeIndex((i) => (i + 1) % professionalMessages.length), 1400);
      return () => clearInterval(id);
    }
  }, [isRunningHealthCheck, isTestingCustom]);

  const loadCompanyData = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading company:', error);
        return;
      }

      const company = companies && companies.length > 0 ? companies[0] : null;
      if (company) {
        setCompany(company);
        
        // Load schedule settings
        const { data: schedules } = await supabase
          .from('schedules')
          .select('*')
          .eq('company_id', company.id);
        
        if (schedules && schedules.length > 0) {
          setScheduledWeekly(schedules[0].weekly_health_check || false);
        }
        
        // Load AI test results
        const { data: aiTests } = await supabase
          .from('ai_tests')
          .select('*')
          .eq('company_id', company.id)
          .order('test_date', { ascending: false });

        if (aiTests) {
          const results = aiTests.map((test) => ({
            prompt: test.prompt_id || 'Custom prompt',
            mentioned: test.company_mentioned,
            position: test.mention_position || 0,
            sentiment: test.sentiment || 'neutral' as 'positive' | 'neutral' | 'negative',
            context: test.mention_context || ''
          }));
          setTestResults(results);
          calculateHealthScore(results);
          generateContentOpportunities(results, company);
        }
      }
    } catch (error) {
      console.error('Error loading company data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadCompanyData();
    } else {
      setLoading(false); // Don't stay loading if no user
    }
  }, [user]); // Remove loadCompanyData dependency to prevent infinite loops

  // Separate effect for URL parameter handling to avoid conflicts
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('edit') === 'true') {
      setIsEditingProfile(true);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []); // Run only once on mount

  // Load persisted health check data on mount
  useEffect(() => {
    const stored = localStorage.getItem('geo_health_check_data');
    if (stored) {
      try {
        const healthData = JSON.parse(stored);
        // Only load if data is less than 24 hours old
        if (healthData.timestamp && Date.now() - healthData.timestamp < 24 * 60 * 60 * 1000) {
          if (healthData.authorityAnalysis) {
            setAuthorityAnalysis(healthData.authorityAnalysis);
          }
          if (healthData.industryBenchmark) {
            setIndustryBenchmark(healthData.industryBenchmark);
          }
          if (healthData.trendingOpportunities) {
            setTrendingOpportunities(healthData.trendingOpportunities);
          }
          if (healthData.websiteAnalysis) {
            setWebsiteAnalysis(healthData.websiteAnalysis);
          }
        }
      } catch (error) {
        console.error('Error loading persisted health data:', error);
      }
    }
  }, []);

  const calculateHealthScore = (results: TestResult[]) => {
    if (results.length === 0) {
      setHealthScore(0);
      return;
    }
    
    const mentionRate = results.filter(r => r.mentioned).length / results.length;
    const avgPosition = results
      .filter(r => r.mentioned && r.position > 0)
      .reduce((sum, r) => sum + r.position, 0) / results.filter(r => r.mentioned && r.position > 0).length || 10;
    
    const positionScore = Math.max(0, (10 - avgPosition) / 10);
    const score = Math.round((mentionRate * 0.7 + positionScore * 0.3) * 100);
    setHealthScore(score);
  };

  const generateContentOpportunities = (results: TestResult[], companyData: Company) => {
    const missedPrompts = results.filter(r => !r.mentioned);
    const opportunities: ContentOpportunity[] = [
      {
        id: '1',
        title: `Create FAQ Page About ${companyData.industry} Solutions`,
        type: 'FAQ Page',
        priority: 'high',
        description: 'Comprehensive FAQ addressing common questions in your industry',
        prompts: missedPrompts.slice(0, 3).map(r => r.prompt),
        outline: [
          'What is the best approach to [industry problem]?',
          'How do you choose the right [industry] provider?',
          'What are the key features to look for?',
          'How much should you expect to pay?'
        ],
        optimizationTips: [
          'Use natural question-answer format',
          'Include specific use cases and examples',
          'Structure with clear headings and bullet points'
        ],
        expectedImpact: 'Should improve visibility for 3-5 question-based prompts'
      },
      {
        id: '2',
        title: `Write Blog Post: "Best Practices for ${companyData.industry}"`,
        type: 'Blog Post',
        priority: 'high',
        description: 'Authoritative guide covering industry best practices',
        prompts: missedPrompts.slice(3, 6).map(r => r.prompt),
        outline: [
          'Industry overview and current trends',
          'Common challenges and solutions',
          'Step-by-step implementation guide',
          'Case studies and examples'
        ],
        optimizationTips: [
          'Include data and statistics',
          'Use subheadings for each best practice',
          'Add actionable takeaways'
        ],
        expectedImpact: 'Should improve visibility for recommendation-based prompts'
      },
      {
        id: '3',
        title: `Develop Case Study: Customer Success Story`,
        type: 'Case Study',
        priority: 'medium',
        description: 'Detailed case study showcasing successful implementation',
        prompts: ['Companies like [customer name]', 'Success stories in [industry]'],
        outline: [
          'Customer background and challenges',
          'Solution implementation process',
          'Results and measurable outcomes',
          'Lessons learned and recommendations'
        ],
        optimizationTips: [
          'Include specific metrics and numbers',
          'Use customer quotes and testimonials',
          'Structure with clear problem-solution-results format'
        ],
        expectedImpact: 'Should improve credibility and example-based mentions'
      },
      {
        id: '4',
        title: `Press Release: ${companyData.company_name} Achievement`,
        type: 'Press Release',
        priority: 'medium',
        description: 'Newsworthy announcement to increase brand visibility',
        prompts: ['Latest news in [industry]', 'Recent developments'],
        outline: [
          'Compelling headline and lead',
          'Key achievement details',
          'Industry context and significance',
          'Company background and contact info'
        ],
        optimizationTips: [
          'Follow standard press release format',
          'Include quotes from leadership',
          'Add relevant industry keywords'
        ],
        expectedImpact: 'Should improve news and update-based mentions'
      }
    ];

    setContentOpportunities(opportunities);
  };

  const runHealthCheck = async () => {
    if (!company) {
      alert('Please set up your company information first');
      return;
    }

    // Validate required company data
    if (!company.company_name || !company.industry) {
      alert('Company name and industry are required for health check. Please update your company profile.');
      return;
    }

    setIsRunningHealthCheck(true);
    setLastRunType('health');
    setLastResults([]);
    setTestProgress({ current: 0, total: 25 });
    setShowResultsSection(false);
    
    try {
      console.log('Starting health check for company:', {
        name: company.company_name,
        industry: company.industry,
        description: company.description
      });

      // Generate 10 specific prompts for this company
      const getCompanyPrompts = async (): Promise<string[]> => {
        try {
          // Try cached prompts first
          const saved = localStorage.getItem(`prompts_${company.id}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            const texts = (parsed || []).map((p: any) => p.text).filter((t: string) => t && t.trim());
            if (texts.length >= 10) {
              console.log(`Using ${texts.length} cached prompts`);
              return texts.slice(0, 10);
            }
          }
        } catch {}

        // Generate new prompts using AI
        const { data, error } = await supabase.functions.invoke('generate-prompts', {
          body: {
            companyName: company.company_name,
            industry: company.industry,
            description: company.description,
            targetCustomers: company.target_customers,
            keyDifferentiators: company.key_differentiators,
            websiteUrl: company.website_url,
            requestedCount: 10
          }
        });
        
        if (error) {
          console.error('Failed to generate prompts:', error);
          throw new Error(`Prompt generation failed: ${error.message}`);
        }

        const prompts = (data?.prompts || []).map((p: any) => p.text).filter((t: string) => t && t.trim());
        
        if (prompts.length < 10) {
          throw new Error(`Only generated ${prompts.length} prompts, need 10`);
        }

        // Cache the prompts
        try { 
          localStorage.setItem(`prompts_${company.id}`, JSON.stringify(data.prompts)); 
        } catch {}

        console.log(`Generated ${prompts.length} company-specific prompts`);
        return prompts.slice(0, 10);
      };

      const prompts = await getCompanyPrompts();

      setTestProgress({ current: 0, total: prompts.length });

      console.log('Using company-specific prompts:', prompts.slice(0, 3), '... and', prompts.length - 3, 'more');
      toast({ title: `Testing ${prompts.length} company-specific prompts`, description: 'AI-generated prompts tailored to your business.' });

      const results: TestResult[] = [];
      const errors: string[] = [];
      
      for (let i = 0; i < prompts.length; i++) {
        const currentPrompt = prompts[i];
        setCurrentTestPrompt(`Testing: "${currentPrompt}"`);
        setTestProgress({ current: i + 1, total: prompts.length });
        
        try {
          console.log(`Testing prompt ${i + 1}/${prompts.length}: "${currentPrompt}"`);
          
          const requestBody = {
            prompt: currentPrompt,
            companyName: company.company_name,
            industry: company.industry,
            description: company.description || '',
            differentiators: company.key_differentiators || ''
          };
          
          console.log('Sending request to test-ai-models:', requestBody);
          
          const { data: result, error } = await supabase.functions.invoke('test-ai-models', {
            body: requestBody
          });

          console.log(`Prompt ${i + 1} response:`, { result, error });

          if (error) {
            console.error(`Prompt ${i + 1} error:`, error);
            errors.push(`Prompt ${i + 1}: ${error.message || JSON.stringify(error)}`);
            // Still continue to next prompt, but track errors
            continue;
          }

          // Check if result exists and has the expected structure
          if (result && typeof result === 'object') {
            console.log(`Prompt ${i + 1} result:`, result);
            
            const testResult: TestResult = {
              prompt: currentPrompt,
              mentioned: Boolean(result.mentioned),
              position: Number(result.position) || 0,
              sentiment: (result.sentiment || 'neutral') as 'positive' | 'neutral' | 'negative',
              context: result.context || '',
              response: result.response || ''
            };

            // Add failure analysis for non-mentioned or low-ranking results
            if (!testResult.mentioned || testResult.position > 5) {
              try {
                const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-prompt-failure', {
                  body: {
                    prompt: currentPrompt,
                    companyName: company.company_name,
                    companyWebsite: company.website_url || '',
                    mentioned: testResult.mentioned,
                    position: testResult.position,
                    aiResponse: testResult.response
                  }
                });

                if (!analysisError && analysisData?.analysis) {
                  testResult.failureAnalysis = analysisData.analysis;
                }
              } catch (analysisError) {
                console.error('Error analyzing prompt failure:', analysisError);
              }
            }
            
            results.push(testResult);
            
            // Save each result to database immediately
            try {
              const { error: insertError } = await supabase
                .from('ai_tests')
                .insert({
                  company_id: company.id,
                  ai_model: 'openai-gpt-4o-mini',
                  prompt_text: currentPrompt,
                  response_text: result.response || '',
                  company_mentioned: Boolean(result.mentioned),
                  mention_position: Number(result.position) || 0,
                  sentiment: result.sentiment || 'neutral',
                  mention_context: result.context || '',
                  test_date: new Date().toISOString(),
                  competitors_mentioned: []
                });
              
              if (insertError) {
                console.error('Error saving test result:', insertError);
              }
            } catch (dbError) {
              console.error('Database error:', dbError);
            }
            
            const currentMentions = results.filter(r => r.mentioned).length;
            setCurrentTestPrompt(`Found ${currentMentions} mentions so far...`);
            
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            console.error(`Prompt ${i + 1} returned invalid result:`, result);
            errors.push(`Prompt ${i + 1}: Invalid result format`);
          }
          
        } catch (promptError) {
          console.error(`Error processing prompt ${i + 1}:`, promptError);
          errors.push(`Prompt ${i + 1}: ${promptError.message || promptError}`);
        }
      }

      // Provide detailed error information
      if (results.length === 0) {
        const errorSummary = errors.length > 0 
          ? `All ${errors.length} prompts failed. First few errors: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? `... and ${errors.length - 3} more errors` : ''}`
          : 'No results were returned from any prompts. This might indicate:\n• OpenAI API key issues\n• Network connectivity problems\n• Edge function deployment issues\n• Rate limiting from OpenAI';
        
        console.error('❌ HEALTH CHECK FAILED - All prompts failed');
        console.error('Total errors:', errors.length);
        console.error('Detailed errors:', errors);
        console.error('Company data used:', { 
          name: company.company_name, 
          industry: company.industry,
          hasDescription: !!company.description,
          hasDifferentiators: !!company.key_differentiators 
        });
        
        alert(`❌ Health check failed!\n\n${errorSummary}\n\nCheck the browser console (F12) for detailed technical information.`);
        toast({ 
          title: 'Health Check Failed', 
          description: `All ${errors.length} prompts failed. Check console for details.`, 
          variant: 'destructive' 
        });
        return;
      }

      // Show warning if some prompts failed
      if (errors.length > 0) {
        console.warn(`Health check completed with ${errors.length} errors:`, errors);
        toast({ 
          title: 'Health Check Warning', 
          description: `${results.length} prompts succeeded, ${errors.length} failed.`,
          variant: 'destructive'
        });
      }

      setTestResults(results);
      setLastResults(results);
      calculateHealthScore(results);
      generateContentOpportunities(results, company);
      try {
        const payload: PersistedLastRun = { type: 'health', results, strategies: [], timestamp: Date.now() };
        window.localStorage.setItem('geo_last_run', JSON.stringify(payload));
      } catch {}
      
      const mentionCount = results.filter(r => r.mentioned).length;
      const successRate = Math.round((mentionCount / results.length) * 100);
      
      console.log(`Health check completed! Found ${mentionCount} mentions out of ${results.length} tests (${successRate}% mention rate).`);
      toast({ title: 'Health Check Complete', description: `${successRate}% mention rate across ${results.length} prompts.` });
      
      // Trigger animated path completion and show results section
      setTimeout(() => {
        setShowResultsSection(true);
      }, 1000);

      // Get trending opportunities for this company
      await getTrendingOpportunities();

      // Load authority analysis and industry benchmark
      await loadAuthorityAnalysis();
      await loadIndustryBenchmark();

      // Generate strategy using all available results
      await generateStrategiesFromAllResults();
      
    } catch (error) {
      console.error('❌ FATAL ERROR in health check:', error);
      console.error('Error type:', typeof error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`❌ Fatal error during health check!\n\nError: ${errorMessage}\n\nThis suggests a fundamental issue with the health check system. Check the browser console (F12) for technical details.`);
      
      toast({ 
        title: 'Health Check System Error', 
        description: 'A fatal error occurred. Check console for details.', 
        variant: 'destructive' 
      });
    } finally {
      setIsRunningHealthCheck(false);
      setCurrentTestPrompt('');
      setTestProgress({ current: 0, total: 0 });
    }
  };

  // Get trending opportunities for the company
  const getTrendingOpportunities = async () => {
    if (!company) return;

    try {
      console.log('Getting trending opportunities for:', company.company_name);
      
      const { data, error } = await supabase.functions.invoke('trending-opportunities', {
        body: {
          industry: company.industry,
          companyName: company.company_name,
          services: company.key_differentiators?.split(',').map(s => s.trim()) || [],
          keywords: [company.industry, company.company_name]
        }
      });

      if (error) {
        console.error('Trending opportunities error:', error);
        return;
      }

      if (data?.opportunities) {
        setTrendingOpportunities(data.opportunities);
        // Persist to localStorage
        const stored = localStorage.getItem('geo_health_check_data');
        const healthData = stored ? JSON.parse(stored) : {};
        healthData.trendingOpportunities = data.opportunities;
        healthData.timestamp = Date.now();
        localStorage.setItem('geo_health_check_data', JSON.stringify(healthData));
        console.log(`Found ${data.opportunities.length} trending opportunities`);
      }
    } catch (error) {
      console.error('Error getting trending opportunities:', error);
    }
  };

  // Generate strategies from all available test results (both automated and custom)
  const getWebsiteAnalysis = async () => {
    if (!company?.website_url) {
      console.log('No website URL available for analysis');
      return null;
    }
    
    try {
      console.log('Analyzing website:', company.website_url);
      const { data, error } = await supabase.functions.invoke('analyze-website', {
        body: {
          url: company.website_url,
          companyName: company.company_name,
          industry: company.industry,
          description: company.description
        }
      });
      
      if (error) {
        console.error('Website analysis error:', error);
        return null;
      }
      
      console.log('Website analysis completed');
      return data;
    } catch (error) {
      console.error('Failed to analyze website:', error);
      return null;
    }
  };

  const generateStrategiesFromAllResults = async () => {
    try {
      setStrategyLoading(true);
      setStrategyError(null);
      setAutoStrategies([]);
      
      // Get all test results (both from current session and previous runs)
      const allResults = [...testResults, ...lastResults].filter((result, index, self) => 
        index === self.findIndex(r => r.prompt === result.prompt) // Remove duplicates
      );
      
      if (allResults.length === 0) {
        console.log('No results available for strategy generation');
        return;
      }
      
      // Get website analysis to enhance strategy generation
      const websiteAnalysisData = await getWebsiteAnalysis();
      if (websiteAnalysisData) {
        setWebsiteAnalysis(websiteAnalysisData);
        // Persist to localStorage
        const stored = localStorage.getItem('geo_health_check_data');
        const healthData = stored ? JSON.parse(stored) : {};
        healthData.websiteAnalysis = websiteAnalysisData;
        healthData.timestamp = Date.now();
        localStorage.setItem('geo_health_check_data', JSON.stringify(healthData));
      }
      
      const payload = {
        companyName: company?.company_name,
        results: allResults.slice(0, 100).map(r => ({
          prompt_text: r.prompt,
          company_mentioned: r.mentioned,
          mention_position: r.position,
          sentiment: r.sentiment,
          mention_context: r.context,
          ai_model: 'openai-gpt-4o-mini',
          test_date: new Date().toISOString()
        })),
        websiteAnalysis: websiteAnalysisData
      };
      
      console.log(`Generating strategies from ${allResults.length} total results${websiteAnalysisData ? ' + website analysis' : ''}`);
      const { data, error } = await supabase.functions.invoke('generate-strategy', { body: payload });
      if (error) throw error;
      const recs = (data?.recommendations as any[]) || [];
      setAutoStrategies(recs);
      
      // Update localStorage with new strategies and website analysis
      try {
        const currentRun = window.localStorage.getItem('geo_last_run');
        if (currentRun) {
          const parsed = JSON.parse(currentRun);
          parsed.strategies = recs;
          parsed.websiteAnalysis = websiteAnalysisData;
          window.localStorage.setItem('geo_last_run', JSON.stringify(parsed));
        }
      } catch {}
      
      console.log(`Generated ${recs.length} strategy recommendations`);
    } catch (e: any) {
      console.error('Strategy generation error:', e);
      setStrategyError(e?.message || 'Failed to generate strategy');
    } finally {
      setStrategyLoading(false);
    }
  };

  // Load authority analysis during health check
  const loadAuthorityAnalysis = async () => {
    if (!company) return;
    
    try {
      console.log('Loading authority analysis for:', company.company_name);
      const { data, error } = await supabase.functions.invoke('analyze-competitive-authority', {
        body: {
          companyName: company.company_name,
          industry: company.industry,
          keyDifferentiators: company.key_differentiators
        }
      });

      if (!error && data?.analysis) {
        setAuthorityAnalysis(data.analysis);
        // Persist to localStorage
        const stored = localStorage.getItem('geo_health_check_data');
        const healthData = stored ? JSON.parse(stored) : {};
        healthData.authorityAnalysis = data.analysis;
        healthData.timestamp = Date.now();
        localStorage.setItem('geo_health_check_data', JSON.stringify(healthData));
        console.log('Authority analysis completed:', data.analysis);
      }
    } catch (error) {
      console.error('Error loading authority analysis:', error);
    }
  };

  // Load industry benchmark during health check  
  const loadIndustryBenchmark = async () => {
    if (!company || testResults.length === 0) return;
    
    try {
      console.log('Loading industry benchmark for:', company.company_name);
      const mentionRate = testResults.length > 0 ? Math.round((testResults.filter(r => r.mentioned).length / testResults.length) * 100) : 0;
      const avgPosition = testResults.filter(r => r.mentioned).length > 0 
        ? Math.round(testResults.filter(r => r.mentioned).reduce((sum, r) => sum + r.position, 0) / testResults.filter(r => r.mentioned).length)
        : 0;

      const { data, error } = await supabase.functions.invoke('industry-benchmarking', {
        body: {
          industry: company.industry,
          companyName: company.company_name,
          currentMentionRate: mentionRate,
          currentAvgPosition: avgPosition
        }
      });

      if (!error && data?.benchmark) {
        setIndustryBenchmark(data.benchmark);
        // Persist to localStorage
        const stored = localStorage.getItem('geo_health_check_data');
        const healthData = stored ? JSON.parse(stored) : {};
        healthData.industryBenchmark = data.benchmark;
        healthData.timestamp = Date.now();
        localStorage.setItem('geo_health_check_data', JSON.stringify(healthData));
        console.log('Industry benchmarking completed:', data.benchmark);
      }
    } catch (error) {
      console.error('Error loading industry benchmark:', error);
    }
  };

  const testCustomPrompt = async () => {
    if (!customPrompt || !company) return;
    
    setIsTestingCustom(true);
    setLastRunType('custom');
    setLastResults([]);
    
    try {
      const { data: result, error } = await supabase.functions.invoke('test-ai-models', {
        body: {
          prompt: customPrompt,
          companyName: company.company_name,
          industry: company.industry,
          description: company.description,
          differentiators: company.key_differentiators
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        alert('Failed to test custom prompt');
        return;
      }

      if (result) {
        const testResult: TestResult = {
          prompt: customPrompt,
          mentioned: result.mentioned || false,
          position: result.position || 0,
          sentiment: (result.sentiment || 'neutral') as 'positive' | 'neutral' | 'negative',
          context: result.context || '',
          response: result.response || ''
        };
        
        // Save custom prompt result to database
        try {
          const { error: insertError } = await supabase
            .from('ai_tests')
            .insert({
              company_id: company.id,
              ai_model: 'openai-gpt-4o-mini',
              prompt_text: customPrompt,
              response_text: result.response || '',
              company_mentioned: result.mentioned || false,
              mention_position: result.position || 0,
              sentiment: result.sentiment || 'neutral',
              mention_context: result.context || '',
              test_date: new Date().toISOString(),
              competitors_mentioned: []
            });
          
          if (insertError) {
            console.error('Error saving custom prompt result:', insertError);
          }
        } catch (dbError) {
          console.error('Database error:', dbError);
        }
        
        setTestResults([testResult, ...testResults]);
        setLastResults([testResult]);
        calculateHealthScore([testResult, ...testResults]);
        setCustomPrompt('');
        console.log(testResult.mentioned ? `Mentioned at position ${testResult.position}!` : 'Not mentioned in response');
        toast({ title: 'Custom prompt tested', description: testResult.mentioned ? `Mentioned at position #${testResult.position}` : 'Not mentioned' });
        try {
          const payload: PersistedLastRun = { type: 'custom', results: [testResult], timestamp: Date.now() };
          window.localStorage.setItem('geo_last_run', JSON.stringify(payload));
        } catch {}
        
        // Generate strategies from all results (including this new custom result)
        await generateStrategiesFromAllResults();
        
        // Show results section if not already visible
        setShowResultsSection(true);
      }
      
    } catch (error) {
      console.error('Error testing custom prompt:', error);
      alert('Failed to test custom prompt');
    } finally {
      setIsTestingCustom(false);
    }
  };

  const copyGeoResultsToClipboard = () => {
    try {
      const mentionRate = testResults.length
        ? Math.round((testResults.filter(r => r.mentioned).length / testResults.length) * 100)
        : 0;
      const avgPos = testResults.length
        ? ((testResults.filter(r => r.mentioned && r.position > 0)
            .reduce((sum, r, _, arr) => sum + r.position / arr.length, 0)) || 0).toFixed(1)
        : '0';
      const lines = [
        `Prompts Tested: ${testResults.length}`,
        `Mention Rate: ${mentionRate}%`,
        `Avg Position: ${avgPos}`,
        '',
        'Detailed Results:',
        ...testResults.map(r => `${r.prompt} | ${r.mentioned ? `Position ${r.position}` : 'Not Mentioned'} | ${r.sentiment} | ${r.context ?? ''}`)
      ];
      navigator.clipboard.writeText(lines.join('\n'));
      toast({ title: 'Copied to clipboard', description: 'GEO results summary copied.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Please try again.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <AppShell title="AI Health Check" subtitle="Test how visible your company is to AI models">
        <LoadingOverlay loading label="Loading AI Health Check...">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-64" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </LoadingOverlay>
      </AppShell>
    );
  }

  if (!company) {
    return (
      <AppShell title="AI Health Check" subtitle="Test how visible your company is to AI models">
          <div className="text-center py-12">
          <div className="text-6xl mb-4 opacity-80">⚠️</div>
          <h2 className="h2 mb-2">Company Profile Required</h2>
          <p className="text-muted-foreground mb-6">Set up your company profile to start using AI Visibility testing and analysis.</p>
          <button
            onClick={() => setShowCompanySetup(true)}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
          >
            Set Up Company Profile
          </button>
        </div>
        {showCompanySetup && (
          <div className="pt-4">
            <CompanySetupForm onComplete={() => {
              setShowCompanySetup(false);
              loadCompanyData();
              toast({ title: 'Company saved', description: 'Your profile is ready.' });
            }} />
          </div>
        )}
      </AppShell>
    );
  }

  // Show edit form when in edit mode (but only after loading is complete)
  if (isEditingProfile && !loading && company) {
    return (
      <AppShell title="Edit Company Profile" subtitle="Update your company information">
        <CompanyEditForm 
          company={company}
          onComplete={() => {
            setIsEditingProfile(false);
            loadCompanyData();
            toast({ title: 'Profile updated', description: 'Your company profile has been saved.' });
          }}
          onCancel={() => setIsEditingProfile(false)}
        />
      </AppShell>
    );
  }

  return (
    <AppShell 
      title="AI Health Check" 
      subtitle="Test how visible your company is to AI models" 
      showHealthCheckSidebar={true}
      activeTab={healthCheckTab}
      onTabChange={setHealthCheckTab}
      onRunHealthCheck={runHealthCheck}
      isRunning={isRunningHealthCheck}
      right={(
        <div className="flex items-center gap-2 border border-border rounded-full px-4 py-2">
          <span>📈</span>
          <span className="text-foreground">Health Score: {healthScore}/100</span>
          <HelpTooltip content="Your health score shows the percentage of AI prompts where your company gets mentioned. Higher scores mean better AI visibility." />
        </div>
      )}
    >
      {/* Morse animation below buttons - separate section so it doesn't stretch boxes */}
      {(isRunningHealthCheck || isTestingCustom) && (
        <div className="mb-8 flex justify-center">
          <MorseLoader
            isActive={isRunningHealthCheck || isTestingCustom}
            progress={testProgress.total > 0 ? (testProgress.current / testProgress.total) * 100 : 0}
          />
        </div>
      )}

      {/* New Animated Results Section */}
      {showResultsSection && lastResults.length > 0 && (
        <div className="mt-8">
          <ResultsSection
            isVisible={showResultsSection}
            results={lastResults}
            healthScore={healthScore}
            onNewTest={() => {
              setShowResultsSection(false);
              runHealthCheck();
            }}
            strategies={autoStrategies}
            strategyLoading={strategyLoading}
            strategyError={strategyError}
            company={company}
            onExportCsv={() => downloadCsv('geo-health-check.csv', lastResults as any)}
            onPrintReport={() => printReport('geo-report')}
            onCopyResults={copyGeoResultsToClipboard}
            websiteAnalysis={websiteAnalysis}
            trendingOpportunities={trendingOpportunities}
            authorityAnalysis={authorityAnalysis}
            industryBenchmark={industryBenchmark}
            activeTab={healthCheckTab}
            onTabChange={setHealthCheckTab}
          />
        </div>
      )}


        {/* Content Strategy section removed */}
        {false && (
          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="mb-6">
              <h3 className="h3 mb-2 flex items-center gap-2">
                <span className="text-primary">📄</span>
                Content Strategy Opportunities
              </h3>
              <p className="text-muted-foreground">
                Actionable content recommendations based on your results
              </p>
            </div>

            <div className="grid gap-4">
              {contentOpportunities.slice(0, 2).map((opportunity) => (
                <details key={opportunity.id} className="bg-muted/10 border border-border rounded-lg p-4">
                  <summary className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <span>📄</span>
                      <span className="font-semibold text-foreground">{opportunity.title}</span>
                    </div>
                    {opportunity.priority === 'high' && (
                      <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-full font-medium">
                        High Priority
                      </span>
                    )}
                  </summary>
                    
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-muted-foreground">{opportunity.description}</p>
                    <div>
                      <h5 className="h4 mb-2">Expected Impact:</h5>
                      <p className="text-sm text-muted-foreground">{opportunity.expectedImpact}</p>
                    </div>
                  </div>
                  </details>
                ))}
            </div>

            {/* Scheduling Toggle */}
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/10 p-4">
              <div>
                <p className="text-sm font-medium text-foreground m-0">Auto-run Health Check weekly</p>
                <p className="text-xs text-muted-foreground m-0">We’ll run it in the background and notify you</p>
              </div>
              <button
                onClick={async () => {
                  const enabled = !scheduledWeekly;
                  setScheduledWeekly(enabled);
                  await scheduleJob({ type: 'weekly-health-check', enabled, companyId: company!.id });
                  toast({ title: enabled ? 'Scheduled' : 'Disabled', description: `Weekly Health Check ${enabled ? 'enabled' : 'disabled'}.` });
                }}
                className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-xs font-medium border ${scheduledWeekly ? 'bg-primary text-primary-foreground border-transparent' : 'bg-background text-foreground border-input'}`}
              >
                {scheduledWeekly ? 'Scheduled ✓' : 'Schedule'}
              </button>
            </div>
          </div>
        )}
    </AppShell>
  );
}