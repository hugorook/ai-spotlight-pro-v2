import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export interface TestResult {
  id?: string;
  prompt_text: string;
  prompt_id?: string;
  ai_model: string;
  company_mentioned: boolean;
  mention_position: number | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  mention_context: string | null;
  competitors_mentioned: string[] | null;
  response_text: string;
  test_date: string;
  company_id?: string;
}

export interface HealthCheckState {
  isRunning: boolean;
  progress: number;
  currentPrompt: string;
  results: TestResult[];
  error: string | null;
  lastRunDate: string | null;
  visibilityScore: number | null;
  mentionRate: number | null;
  averagePosition: number | null;
}

interface HealthCheckContextType extends HealthCheckState {
  runHealthCheck: () => Promise<void>;
  loadSavedResults: () => Promise<void>;
  clearResults: () => void;
  resetHealthCheck: () => void;
}

const initialState: HealthCheckState = {
  isRunning: false,
  progress: 0,
  currentPrompt: '',
  results: [],
  error: null,
  lastRunDate: null,
  visibilityScore: null,
  mentionRate: null,
  averagePosition: null,
};

const HealthCheckContext = createContext<HealthCheckContextType | undefined>(undefined);

export const useHealthCheck = () => {
  const context = useContext(HealthCheckContext);
  if (!context) {
    throw new Error('useHealthCheck must be used within a HealthCheckProvider');
  }
  return context;
};

interface HealthCheckProviderProps {
  children: ReactNode;
}

export const HealthCheckProvider: React.FC<HealthCheckProviderProps> = ({ children }) => {
  const [state, setState] = useState<HealthCheckState>(initialState);
  const { user } = useAuth();

  // Load saved results when component mounts or user changes
  useEffect(() => {
    if (user) {
      loadSavedResults();
    }
  }, [user]);

  const loadSavedResults = async () => {
    if (!user) return;

    try {
      // Get user's company
      const { data: companies } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);

      if (!companies || companies.length === 0) return;
      
      const company = companies[0];

      // Load recent test results (last 25 tests)
      const { data: tests, error: testsError } = await supabase
        .from('ai_tests')
        .select('*')
        .eq('company_id', company.id)
        .order('test_date', { ascending: false })
        .limit(25);

      if (testsError) {
        console.error('Error loading test results:', testsError);
        return;
      }

      if (tests && tests.length > 0) {
        // Calculate metrics from the results
        const mentionCount = tests.filter(test => test.company_mentioned).length;
        const mentionRate = (mentionCount / tests.length) * 100;
        
        const mentionedTests = tests.filter(test => test.company_mentioned && test.mention_position);
        const averagePosition = mentionedTests.length > 0 
          ? mentionedTests.reduce((sum, test) => sum + (test.mention_position || 0), 0) / mentionedTests.length
          : null;
        
        const positionScore = averagePosition ? Math.max(0, (11 - averagePosition) / 10) : 0;
        const visibilityScore = Math.round((mentionRate * 0.7 + positionScore * 100 * 0.3));

        setState(prev => ({
          ...prev,
          results: tests,
          lastRunDate: tests[0].test_date,
          visibilityScore,
          mentionRate: Math.round(mentionRate),
          averagePosition: averagePosition ? Math.round(averagePosition * 10) / 10 : null,
        }));
      }
    } catch (error) {
      console.error('Error loading saved results:', error);
      setState(prev => ({ ...prev, error: 'Failed to load saved results' }));
    }
  };

  const generatePrompts = async (company: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-prompts', {
        body: {
          companyName: company.company_name,
          industry: company.industry,
          description: company.description,
          targetCustomers: company.target_customers,
          keyDifferentiators: company.key_differentiators,
          geographicFocus: (company.geographic_focus && company.geographic_focus[0]) || 'Global',
          requestedCount: 25, // Generate 25 prompts for comprehensive health check
        }
      });

      if (error) throw error;

      return data?.prompts || [];
    } catch (error) {
      console.error('Error generating prompts:', error);
      throw new Error('Failed to generate test prompts');
    }
  };

  const runHealthCheck = async () => {
    if (!user) {
      setState(prev => ({ ...prev, error: 'User not authenticated' }));
      return;
    }

    try {
      setState(prev => ({ 
        ...prev, 
        isRunning: true, 
        progress: 0, 
        error: null,
        results: [],
        currentPrompt: 'Initializing...'
      }));

      // Get user's company
      const { data: companies } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);

      if (!companies || companies.length === 0) {
        throw new Error('No company found. Please complete your company profile first.');
      }

      const company = companies[0];

      // Generate test prompts
      setState(prev => ({ ...prev, currentPrompt: 'Generating test prompts...' }));
      const prompts = await generatePrompts(company);
      
      if (!prompts.length) {
        throw new Error('No prompts generated. Please try again.');
      }

      setState(prev => ({ ...prev, progress: 10 }));

      // Run tests for each prompt
      const testResults: TestResult[] = [];
      const batchSize = 5; // Process in batches to avoid overwhelming the API

      for (let i = 0; i < prompts.length; i += batchSize) {
        const batch = prompts.slice(i, i + batchSize);
        const batchPromises = batch.map(async (prompt: any, batchIndex: number) => {
          const globalIndex = i + batchIndex;
          
          setState(prev => ({ 
            ...prev, 
            currentPrompt: `Testing prompt ${globalIndex + 1} of ${prompts.length}: ${prompt.text.substring(0, 100)}...`,
            progress: 10 + Math.round((globalIndex / prompts.length) * 80)
          }));

          try {
            const { data: testResult, error: testError } = await supabase.functions.invoke('test-ai-models', {
              body: {
                prompt: prompt.text,
                companyName: company.company_name,
                industry: company.industry || '',
                description: company.description || '',
                model: 'openai-gpt-4o-mini'
              }
            });

            if (testError) throw testError;

            const result: TestResult = {
              prompt_text: prompt.text,
              prompt_id: prompt.id || null,
              ai_model: 'openai-gpt-4o-mini',
              company_mentioned: testResult.company_mentioned || false,
              mention_position: testResult.mention_position || null,
              sentiment: testResult.sentiment || null,
              mention_context: testResult.mention_context || null,
              competitors_mentioned: testResult.competitors_mentioned || [],
              response_text: testResult.response_text || '',
              test_date: new Date().toISOString(),
              company_id: company.id,
            };

            // Save to database immediately
            const { error: insertError } = await supabase
              .from('ai_tests')
              .insert(result);

            if (insertError) {
              console.error('Error saving test result:', insertError);
            }

            return result;
          } catch (error) {
            console.error(`Error testing prompt ${globalIndex + 1}:`, error);
            // Return a failed result so we can continue with other tests
            return {
              prompt_text: prompt.text,
              prompt_id: prompt.id || null,
              ai_model: 'openai-gpt-4o-mini',
              company_mentioned: false,
              mention_position: null,
              sentiment: null,
              mention_context: null,
              competitors_mentioned: [],
              response_text: 'Test failed',
              test_date: new Date().toISOString(),
              company_id: company.id,
            } as TestResult;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        testResults.push(...batchResults);

        // Update state with current results
        setState(prev => ({ 
          ...prev, 
          results: [...testResults],
        }));
      }

      // Calculate final metrics
      const mentionCount = testResults.filter(test => test.company_mentioned).length;
      const mentionRate = (mentionCount / testResults.length) * 100;
      
      const mentionedTests = testResults.filter(test => test.company_mentioned && test.mention_position);
      const averagePosition = mentionedTests.length > 0 
        ? mentionedTests.reduce((sum, test) => sum + (test.mention_position || 0), 0) / mentionedTests.length
        : null;
      
      const positionScore = averagePosition ? Math.max(0, (11 - averagePosition) / 10) : 0;
      const visibilityScore = Math.round((mentionRate * 0.7 + positionScore * 100 * 0.3));

      setState(prev => ({
        ...prev,
        isRunning: false,
        progress: 100,
        currentPrompt: 'Health check completed!',
        results: testResults,
        lastRunDate: new Date().toISOString(),
        visibilityScore,
        mentionRate: Math.round(mentionRate),
        averagePosition: averagePosition ? Math.round(averagePosition * 10) / 10 : null,
      }));

    } catch (error: any) {
      console.error('Health check error:', error);
      setState(prev => ({
        ...prev,
        isRunning: false,
        error: error.message || 'Health check failed. Please try again.',
        currentPrompt: '',
        progress: 0,
      }));
    }
  };

  const clearResults = () => {
    setState(initialState);
  };

  const resetHealthCheck = () => {
    setState(prev => ({
      ...prev,
      isRunning: false,
      progress: 0,
      currentPrompt: '',
      error: null,
    }));
  };

  const contextValue: HealthCheckContextType = {
    ...state,
    runHealthCheck,
    loadSavedResults,
    clearResults,
    resetHealthCheck,
  };

  return (
    <HealthCheckContext.Provider value={contextValue}>
      {children}
    </HealthCheckContext.Provider>
  );
};