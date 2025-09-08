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

  const generateAnalyticsData = async (company: any, testResults: TestResult[]) => {
    try {
      // Generate all analytics data in parallel to populate analytics hub sections
      const analyticsPromises = [];

      // Determine website URL: prefer company.website_url else latest generated_prompts.website_url
      let websiteUrl = company.website_url || '';
      if (!websiteUrl) {
        const { data: latestGenerated } = await supabase
          .from('generated_prompts')
          .select('website_url')
          .eq('user_id', company.user_id)
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        websiteUrl = latestGenerated?.website_url || '';
      }

      // 1. Website Analysis - analyze company website for AI optimization (Edge: analyze-website expects { url })
      if (websiteUrl) {
        analyticsPromises.push(
          supabase.functions.invoke('analyze-website', {
            body: {
              url: websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`,
              companyName: company.company_name,
              industry: company.industry
            }
          }).then(result => {
            if (result.data) {
              localStorage.setItem('website_analysis', JSON.stringify({
                ...result.data,
                fetchedAt: new Date().toISOString()
              }));
            }
          }).catch(error => console.error('Website analysis failed:', error))
        );
      }

      // 2. Authority Analysis - generate authority building opportunities (Edge: analyze-competitive-authority)
      analyticsPromises.push(
        supabase.functions.invoke('analyze-competitive-authority', {
          body: {
            companyName: company.company_name,
            industry: company.industry,
            keyDifferentiators: company.key_differentiators
          }
        }).then(result => {
          if (result.data) {
            localStorage.setItem('authority_analysis', JSON.stringify({
              ...result.data,
              generatedAt: new Date().toISOString()
            }));
          }
        }).catch(error => console.error('Authority analysis failed:', error))
      );

      // 3. Benchmarking Analysis - compare against industry (Edge: industry-benchmarking)
      analyticsPromises.push(
        supabase.functions.invoke('industry-benchmarking', {
          body: {
            companyName: company.company_name,
            industry: company.industry,
            mentionRate: Math.round((testResults.filter(r => r.company_mentioned).length / testResults.length) * 100),
            averagePosition: testResults.filter(r => r.company_mentioned && r.mention_position)
              .reduce((sum, r, _, arr) => sum + (r.mention_position || 0) / arr.length, 0) || 0,
            testResults: testResults
          }
        }).then(result => {
          if (result.data) {
            localStorage.setItem('benchmark_analysis', JSON.stringify({
              ...result.data,
              analyzedAt: new Date().toISOString()
            }));
          }
        }).catch(error => console.error('Benchmark analysis failed:', error))
      );

      // 4. Trending Analysis - find trending opportunities (Edge: trending-opportunities expects { industry, companyName, services, keywords })
      analyticsPromises.push(
        supabase.functions.invoke('trending-opportunities', {
          body: {
            industry: company.industry,
            companyName: company.company_name,
            services: (company.key_differentiators || '')
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean),
            keywords: [company.industry, company.company_name]
          }
        }).then(result => {
          if (result.data) {
            localStorage.setItem('trending_analysis', JSON.stringify({
              ...result.data,
              generatedAt: new Date().toISOString()
            }));
          }
        }).catch(error => console.error('Trending analysis failed:', error))
      );

      // Execute all analytics generation in parallel
      await Promise.allSettled(analyticsPromises);
      console.log('Analytics data generation completed');

    } catch (error) {
      console.error('Error generating analytics data:', error);
      // Don't throw error - analytics generation is supplementary to core health check
    }
  };

  const loadExistingPrompts = async (company: any) => {
    try {
      // 1) Prefer latest prompts generated from Prompts page (persistent and user-specific)
      const { data: latestGen, error: genErr } = await supabase
        .from('generated_prompts')
        .select('prompts, website_url, generated_at')
        .eq('user_id', company.user_id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (genErr) {
        console.warn('generated_prompts query error:', genErr);
      }

      if (latestGen && Array.isArray(latestGen.prompts) && latestGen.prompts.length > 0) {
        console.log(`Loaded ${latestGen.prompts.length} prompts from generated_prompts`);
        // Normalize shape: accept { text } objects or plain strings
        return latestGen.prompts.map((p: any, idx: number) => ({
          text: typeof p === 'string' ? p : p.text || '',
          id: p.id || `gen-${idx}`,
          category: p.category || 'moderate'
        }));
      }

      // 2) Fallback to prompts table if user hasn’t generated prompts yet
      const { data: dbPrompts } = await supabase
        .from('prompts')
        .select('id, text')
        .eq('company_id', company.id);

      if (dbPrompts && dbPrompts.length > 0) {
        console.log(`Loaded ${dbPrompts.length} prompts from prompts table`);
        return dbPrompts.map((p: any) => ({
          text: p.text,
          id: p.id,
          category: 'moderate'
        }));
      }

      // 3) As a last resort, generate fresh prompts
      console.log('No stored prompts found, generating new ones as fallback...');
      const { data, error } = await supabase.functions.invoke('generate-prompts', {
        body: {
          companyName: company.company_name,
          industry: company.industry,
          description: company.description,
          targetCustomers: company.target_customers,
          keyDifferentiators: company.key_differentiators,
          geographicFocus: (company.geographic_focus && company.geographic_focus[0]) || 'Global',
          requestedCount: 10,
        }
      });

      if (error) throw error;
      const generated = (data?.prompts || []).map((p: any, idx: number) => ({
        text: typeof p === 'string' ? p : p.text || '',
        id: p.id || `gen-fallback-${idx}`,
        category: p.category || 'moderate'
      }));
      return generated;
    } catch (error) {
      console.error('Error loading prompts:', error);
      throw new Error('Failed to load test prompts');
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

      // Load existing test prompts or generate new ones as fallback
      setState(prev => ({ ...prev, currentPrompt: 'Loading test prompts...' }));
      const prompts = await loadExistingPrompts(company);

      // Brand/company info (from latest generated_prompts), fallback to company profile
      let brandName = company.company_name as string;
      let brandIndustry = company.industry as string | undefined;
      let brandDescription = company.description as string | undefined;
      let brandDifferentiators = (company as any).key_differentiators as string | undefined;
      try {
        const { data: latestGen } = await supabase
          .from('generated_prompts')
          .select('company_data')
          .eq('user_id', user.id)
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latestGen?.company_data) {
          const cd: any = latestGen.company_data;
          brandName = cd.companyName || brandName;
          brandIndustry = cd.industry || brandIndustry;
          brandDescription = cd.description || brandDescription;
          brandDifferentiators = cd.keyDifferentiators || brandDifferentiators;
        }
      } catch {}
      
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
                companyName: brandName,
                industry: brandIndustry || '',
                description: brandDescription || '',
                differentiators: brandDifferentiators || ''
              }
            });

            if (testError) throw testError;

            const result: TestResult = {
              prompt_text: prompt.text,
              prompt_id: prompt.id || null,
              ai_model: 'openai-gpt-4o-mini',
              company_mentioned: testResult.mentioned || false,
              mention_position: testResult.position || null,
              sentiment: testResult.sentiment || null,
              mention_context: testResult.context || null,
              competitors_mentioned: testResult.competitors_mentioned || [],
              response_text: testResult.response || '',
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

      // Generate analytics data to populate all analytics hub sections
      setState(prev => ({ ...prev, currentPrompt: 'Generating analytics insights...' }));
      await generateAnalyticsData(company, testResults);

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