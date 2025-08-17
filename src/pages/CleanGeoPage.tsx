import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/types/supabase';
import AppShell from '@/components/layout/AppShell';
import CommandPalette from '@/components/CommandPalette';
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
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                transition: 'width 0.3s ease'
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
                  background: 'rgba(102, 126, 234, 0.2)',
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
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => updateFormData('website', e.target.value)}
                    placeholder="https://www.yourcompany.com"
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
                  background: 'rgba(102, 126, 234, 0.2)',
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
                  background: 'rgba(102, 126, 234, 0.2)',
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
                          background: 'rgba(102, 126, 234, 0.2)',
                          color: '#667eea',
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
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [mode, setMode] = useState<'automated'|'custom'>('automated');
  const [autoStrategies, setAutoStrategies] = useState<any[]>([]);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategyError, setStrategyError] = useState<string | null>(null);
  const [showResultsSection, setShowResultsSection] = useState(false);

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

      // Generate 10 focused prompts from company context
      const prompts = [
        `Best ${company.industry} providers for ${company.target_customers || 'SMBs'}`,
        `Top ${company.industry} companies`,
        `${company.industry} comparison guide`,
        `How to choose a ${company.industry} partner`,
        `${company.industry} implementation checklist`,
        `Most recommended ${company.industry} vendors`,
        `Case studies in ${company.industry}`,
        `ROI of ${company.industry} solutions`,
        `${company.industry} trends and leaders`,
        `${company.industry} alternatives to market leaders`
      ];
      setTestProgress({ current: 0, total: prompts.length });

      console.log('Generated prompts:', prompts.slice(0, 3), '... and', prompts.length - 3, 'more');

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
              context: result.context || result.response || ''
            };
            
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

      // Auto-generate strategy for Automated flow (right column)
      try {
        setStrategyLoading(true);
        setStrategyError(null);
        setAutoStrategies([]);
        const payload = {
          companyName: company.company_name,
          results: results.slice(0, 100).map(r => ({
            prompt_text: r.prompt,
            company_mentioned: r.mentioned,
            mention_position: r.position,
            sentiment: r.sentiment,
            mention_context: r.context,
            ai_model: 'openai-gpt-4o-mini',
            test_date: new Date().toISOString()
          }))
        };
        const { data, error } = await supabase.functions.invoke('generate-strategy', { body: payload });
        if (error) throw error;
        const recs = (data?.recommendations as any[]) || [];
        setAutoStrategies(recs);
        try {
          const payload: PersistedLastRun = { type: 'health', results, strategies: recs, timestamp: Date.now() };
          window.localStorage.setItem('geo_last_run', JSON.stringify(payload));
        } catch {}
      } catch (e: any) {
        setStrategyError(e?.message || 'Failed to generate strategy');
      } finally {
        setStrategyLoading(false);
      }
      
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
          context: result.context || result.response || ''
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
        <CommandPalette />
      </AppShell>
    );
  }

  if (!company) {
    return (
      <AppShell title="AI Health Check" subtitle="Test how visible your company is to AI models">
          <div className="text-center py-12">
          <div className="text-6xl mb-4 opacity-80">⚠️</div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Company Profile Required</h2>
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
        <CommandPalette />
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
        <CommandPalette />
      </AppShell>
    );
  }

  return (
    <AppShell title="AI Health Check" subtitle="Test how visible your company is to AI models" right={(
      <div className="flex items-center gap-2 border border-border rounded-full px-4 py-2">
        <span>📈</span>
        <span className="text-foreground">Health Score: {healthScore}/100</span>
        <HelpTooltip content="Your health score shows the percentage of AI prompts where your company gets mentioned. Higher scores mean better AI visibility." />
      </div>
    )}>

        {/* Top row per wireframe: left stacked toggles, middle action box, right loading */}
        <div className="grid lg:grid-cols-12 gap-8 mb-8">
          {/* LEFT stacked toggles (Automated / Custom) */}
          <div className="lg:col-span-2 rounded-2xl bg-card p-4 flex flex-col gap-4 h-full min-h-[320px] justify-between shadow-soft">
            <button
              className={`flex-1 w-full text-lg px-4 rounded border flex items-center justify-center ${mode==='automated'?'gradient-accent text-black':'bg-white text-black'}`}
              onClick={()=>setMode('automated')}
            >
              Automated
            </button>
            <button
              className={`flex-1 w-full text-lg px-4 rounded border flex items-center justify-center ${mode==='custom'?'gradient-accent text-black':'bg-white text-black'}`}
              onClick={()=>setMode('custom')}
            >
              Custom
            </button>
          </div>

          {/* MIDDLE: Action box (changes by mode) */}
          <div className="lg:col-span-5 rounded-2xl bg-card p-8 shadow-soft">
            <div className="mb-6">
              {mode==='automated' ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-2xl font-bold text-foreground">Run Automated Health Check</h2>
                    <HelpTooltip content="We'll test 10 AI prompts relevant to your industry to see how often your company gets mentioned and at what position." />
                  </div>
                  <p className="text-muted-foreground">Click to run the automated health check. Results and strategies appear inline.</p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-2xl font-bold text-foreground">Custom Prompt Tester</h2>
                    <HelpTooltip content="Test specific prompts to see if your company gets mentioned. Great for testing particular use cases or competitor comparisons." />
                  </div>
                  <p className="text-muted-foreground">Test any custom prompt to see if your company gets mentioned</p>
                </>
              )}
            </div>

            {mode==='automated' && (
              <>
                <button
                  onClick={runHealthCheck}
                  disabled={isRunningHealthCheck || !company}
                  className="w-full disabled:opacity-50 font-semibold py-4 px-6 rounded-lg text-lg mb-4 transition-colors gradient-accent"
                >
                  <div className="flex items-center justify-center">Run Automated Health Check</div>
                </button>
                
                {/* Morse animation below button */}
                {isRunningHealthCheck && (
                  <div className="mb-6">
                    <div className="flex justify-center">
                      <MorseLoader
                        isActive={isRunningHealthCheck}
                        progress={testProgress.total > 0 ? (testProgress.current / testProgress.total) * 100 : 0}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
            {mode==='custom' && (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter your custom prompt here..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="w-full px-4 py-3 bg-white text-black border border-transparent rounded-lg placeholder:text-black/60 focus:outline-none"
                />
                <button
                  onClick={testCustomPrompt}
                  disabled={!customPrompt || isTestingCustom}
                  className="w-full disabled:opacity-50 font-semibold py-3 px-6 rounded-lg"
                >
                  Test Prompt
                </button>
              </div>
            )}
            
            {/* Loading Animation */}
            {/* No inline animation here; all live status is in the right Status box */}
          </div>

          {/* RIGHT: Empty space */}
          <div className="lg:col-span-5">
            {/* This space is intentionally left empty */}
          </div>
        </div>

        {/* New Animated Results Section */}
        {mode === 'automated' && showResultsSection && lastResults.length > 0 && (
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
            />
          </div>
        )}


        {/* Content Strategy section removed */}
        {false && (
          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
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
                      <h5 className="text-sm font-semibold text-foreground mb-2">Expected Impact:</h5>
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
        <CommandPalette />
    </AppShell>
  );
}