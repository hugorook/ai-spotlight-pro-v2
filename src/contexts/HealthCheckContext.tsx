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
  runHealthCheck: () => Promise<{ mentionRate: number; visibilityScore: number | null } | void>;
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
      console.log('🔍 PERSISTENCE DEBUG: Loading saved results for user:', user.id);
      
      // Load MOST RECENT completed session's results (works for both company and URL-only workflow)
      const { data: recentSession } = await supabase
        .from('health_check_sessions')
        .select('id, completed_at, mention_rate, average_position, health_score')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null) // Only get completed sessions
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('🔍 PERSISTENCE DEBUG: Recent session:', recentSession);

      if (!recentSession) {
        console.log('🔍 PERSISTENCE DEBUG: No completed sessions found');
        return;
      }

      const { data: tests, error: testsError } = await supabase
        .from('ai_tests')
        .select('*')
        .eq('health_check_session_id', recentSession.id)
        .order('test_date', { ascending: false });

      console.log('🔍 PERSISTENCE DEBUG: Loaded tests:', { tests, error: testsError });

      if (testsError) {
        console.error('Error loading test results:', testsError);
        return;
      }

      if (tests && tests.length > 0) {
        console.log('🔍 PERSISTENCE DEBUG: Setting state with', tests.length, 'test results');
        
        // Use session metrics if available, otherwise calculate from tests
        const sessionMetrics = {
          mentionRate: recentSession.mention_rate ? Math.round(recentSession.mention_rate) : null,
          averagePosition: recentSession.average_position,
          visibilityScore: recentSession.health_score
        };
        
        // Calculate metrics from tests if session doesn't have them
        let calculatedMetrics = { mentionRate: 0, averagePosition: null, visibilityScore: 0 };
        if (!sessionMetrics.mentionRate) {
          const mentionCount = tests.filter(test => test.company_mentioned).length;
          calculatedMetrics.mentionRate = Math.round((mentionCount / tests.length) * 100);
          
          const mentionedTests = tests.filter(test => test.company_mentioned && test.mention_position);
          calculatedMetrics.averagePosition = mentionedTests.length > 0 
            ? Math.round((mentionedTests.reduce((sum, test) => sum + (test.mention_position || 0), 0) / mentionedTests.length) * 10) / 10
            : null;
          
          const positionScore = calculatedMetrics.averagePosition ? Math.max(0, (11 - calculatedMetrics.averagePosition) / 10) : 0;
          calculatedMetrics.visibilityScore = Math.round((calculatedMetrics.mentionRate * 0.7 + positionScore * 100 * 0.3));
        }

        setState(prev => ({
          ...prev,
          results: tests,
          lastRunDate: tests[0].test_date,
          visibilityScore: sessionMetrics.visibilityScore || calculatedMetrics.visibilityScore,
          mentionRate: sessionMetrics.mentionRate || calculatedMetrics.mentionRate,
          averagePosition: sessionMetrics.averagePosition || calculatedMetrics.averagePosition,
        }));
        
        console.log('🔍 PERSISTENCE DEBUG: State updated successfully');
      } else {
        console.log('🔍 PERSISTENCE DEBUG: No test results found for session');
      }
    } catch (error) {
      console.error('Error loading saved results:', error);
      setState(prev => ({ ...prev, error: 'Failed to load saved results' }));
    }
  };

  const generateAnalyticsData = async (company: any, testResults: TestResult[], sessionId: string) => {
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
          }).then(async result => {
            if (result.data) {
              await supabase
                .from('analytics_data')
                .insert({
                  user_id: company.user_id,
                  health_check_session_id: sessionId,
                  analytics_type: 'website_analysis',
                  data: result.data
                });
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
        }).then(async result => {
          if (result.data) {
            await supabase
              .from('analytics_data')
              .insert({
                user_id: company.user_id,
                health_check_session_id: sessionId,
                analytics_type: 'authority_analysis',
                data: result.data
              });
          }
        }).catch(error => console.error('Authority analysis failed:', error))
      );

      // 3. Benchmarking Analysis - compare against industry (Edge: industry-benchmarking)
      analyticsPromises.push(
        supabase.functions.invoke('industry-benchmarking', {
          body: {
            companyName: company.company_name,
            industry: company.industry,
            currentMentionRate: Math.round((testResults.filter(r => r.company_mentioned).length / testResults.length) * 100),
            currentAvgPosition: testResults.filter(r => r.company_mentioned && r.mention_position)
              .reduce((sum, r, _, arr) => sum + (r.mention_position || 0) / arr.length, 0) || 0,
            testResults: testResults
          }
        }).then(async result => {
          if (result.data) {
            await supabase
              .from('analytics_data')
              .insert({
                user_id: company.user_id,
                health_check_session_id: sessionId,
                analytics_type: 'industry_benchmark',
                data: result.data
              });
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
        }).then(async result => {
          if (result.data) {
            await supabase
              .from('analytics_data')
              .insert({
                user_id: company.user_id,
                health_check_session_id: sessionId,
                analytics_type: 'trending_opportunities',
                data: result.data
              });
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

  const loadExistingPrompts = async (userId: string) => {
    try {
      // 1) Prefer latest prompts generated from Prompts page (persistent and user-specific)
      console.log('🔍 HEALTH CHECK DEBUG: Loading prompts for user:', userId);
      
      const { data: latestGen, error: genErr } = await supabase
        .from('generated_prompts')
        .select('*')
        .eq('user_id', userId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('🔍 HEALTH CHECK DEBUG: Database query result:', { 
        data: latestGen, 
        error: genErr,
        hasData: !!latestGen,
        promptsArray: latestGen?.prompts,
        promptsLength: latestGen?.prompts?.length,
        isArray: Array.isArray(latestGen?.prompts)
      });

      if (genErr) {
        console.warn('generated_prompts query error:', genErr);
      }

      if (latestGen && Array.isArray(latestGen.prompts) && latestGen.prompts.length > 0) {
        console.log(`✅ Loaded ${latestGen.prompts.length} prompts from generated_prompts`);
        console.log('🔍 First prompt sample:', latestGen.prompts[0]);
        
        // Normalize shape: accept { text } objects or plain strings
        const normalizedPrompts = latestGen.prompts.map((p: any, idx: number) => ({
          text: typeof p === 'string' ? p : p.text || '',
          id: p.id || `gen-${idx}`,
          category: p.category || 'moderate'
        }));
        
        console.log('🔍 Normalized prompts sample:', normalizedPrompts[0]);
        return normalizedPrompts;
      }

      // 2) Fallback to prompts table if user hasn’t generated prompts yet
      console.log('❌ No prompts found in generated_prompts table');
      throw new Error('No prompts found. Please generate prompts first from the Prompts page.');
      
      // REMOVED: Fallback logic
      const { data: dbPrompts } = await supabase
        .from('prompts')
        .select('id, text')
        .eq('user_id', userId); // REMOVED - URL-only workflow doesn't use company_id

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
      throw new Error('Failed to load test prompts. Please generate prompts first from the Prompts page.');
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

      // Try to get user's company (for legacy support), but don't require it
      const { data: companies } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);

      // For URL-only workflow, get company data from generated_prompts instead
      const { data: latestGen } = await supabase
        .from('generated_prompts')
        .select('*')
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!companies?.length && !latestGen) {
        throw new Error('No company data found. Please generate prompts first from the Prompts page.');
      }

      // Use company data from companies table if available, otherwise from generated_prompts
      const company = companies?.[0] || {
        id: 'generated-company',
        user_id: user.id,
        company_name: latestGen?.company_data?.companyName || 'Unknown Company',
        industry: latestGen?.company_data?.industry || 'Unknown',
        description: latestGen?.company_data?.description || '',
        website_url: latestGen?.website_url || '',
        key_differentiators: latestGen?.company_data?.keyDifferentiators || ''
      };

      // Create a new health check session
      // Load existing test prompts or generate new ones as fallback
      setState(prev => ({ ...prev, currentPrompt: 'Loading test prompts...' }));
      const prompts = await loadExistingPrompts(user.id);

      // Create a new health check session AFTER loading prompts, so we can persist required fields
      const { data: sessionInsert, error: sessionError } = await supabase
        .from('health_check_sessions')
        .insert({ 
          user_id: user.id, 
          company_id: companies?.[0]?.id || null, // Only use real company ID, null for URL-only workflow
          website_url: company.website_url || null,
          company_data: {
            company_name: company.company_name,
            industry: company.industry,
            description: company.description,
            key_differentiators: company.key_differentiators
          },
          prompts_used: prompts.map((p: any) => p.text),
          total_prompts: prompts.length,
          session_type: companies?.[0] ? 'company_profile' : 'url_only'
        })
        .select('id')
        .single();

      if (sessionError || !sessionInsert) {
        console.error('🔍 HEALTH CHECK DEBUG: Session creation error:', sessionError);
        throw new Error(`Failed to create health check session: ${sessionError?.message || 'No session data returned'}`);
      }
      const sessionId = sessionInsert.id as string;

      // Brand/company info (from latest generated_prompts), fallback to company profile
      let brandName = company.company_name as string;
      let brandIndustry = company.industry as string | undefined;
      let brandDescription = company.description as string | undefined;
      let brandDifferentiators = (company as any).key_differentiators as string | undefined;
      // Also capture website URL to pass into mention detection
      let websiteUrlForDetection: string | undefined = (company as any).website_url || undefined;
      try {
        const { data: latestGen } = await supabase
          .from('generated_prompts')
          .select('company_data, website_url')
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
        if (!websiteUrlForDetection && latestGen?.website_url) {
          websiteUrlForDetection = latestGen.website_url;
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
                differentiators: brandDifferentiators || '',
                websiteUrl: websiteUrlForDetection || ''
              }
            });

            if (testError) throw testError;

            const result: TestResult = {
              prompt_text: prompt.text,
              prompt_id: prompt.id || null,
              ai_model: 'openai-gpt-4o',
              company_mentioned: testResult.mentioned || false,
              mention_position: testResult.position || null,
              sentiment: testResult.sentiment || null,
              mention_context: testResult.context || null,
              competitors_mentioned: testResult.competitors_mentioned || [],
              response_text: testResult.response || '',
              test_date: new Date().toISOString(),
              company_id: companies?.[0]?.id || null,
            };

            // Save to database immediately
            const { error: insertError } = await supabase
              .from('ai_tests')
              .insert({ ...result, health_check_session_id: sessionId });

            if (insertError) {
              console.error('🔍 SAVING DEBUG: Error saving test result:', insertError);
            } else if (globalIndex === 0) {
              console.log('🔍 SAVING DEBUG: Successfully saved test result to ai_tests table');
            }

            return result;
          } catch (error) {
            console.error(`Error testing prompt ${globalIndex + 1}:`, error);
            // Return a failed result so we can continue with other tests
            return {
              prompt_text: prompt.text,
              prompt_id: prompt.id || null,
              ai_model: 'openai-gpt-4o',
              company_mentioned: false,
              mention_position: null,
              sentiment: null,
              mention_context: null,
              competitors_mentioned: [],
              response_text: 'Test failed',
              test_date: new Date().toISOString(),
              company_id: companies?.[0]?.id || null,
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

      // Second-pass local detection to reduce false negatives (name/domain scan)
      try {
        const normalizedName = (brandName || '').toLowerCase();
        const nameStripped = normalizedName.replace(/[^a-z0-9\s]/gi, '').trim();
        let host: string | undefined;
        if (websiteUrlForDetection) {
          try {
            const url = new URL(websiteUrlForDetection.startsWith('http') ? websiteUrlForDetection : `https://${websiteUrlForDetection}`);
            host = url.hostname.replace(/^www\./, '').toLowerCase();
          } catch {}
        }
        for (const r of testResults) {
          if (!r.company_mentioned && r.response_text) {
            const resp = r.response_text.toLowerCase();
            const hitName = resp.includes(normalizedName) || (!!nameStripped && resp.includes(nameStripped));
            const hitDomain = host ? resp.includes(host) : false;
            if (hitName || hitDomain) {
              r.company_mentioned = true;
              r.mention_position = r.mention_position || 1;
            }
          }
        }
      } catch {}

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
      // Generate analytics bound to the same brand/companydata we just used
      const brandForAnalytics = {
        ...company,
        company_name: brandName,
        industry: brandIndustry || company.industry,
        description: brandDescription || company.description,
        key_differentiators: brandDifferentiators || (company as any).key_differentiators,
        website_url: (company as any).website_url
      };
      await generateAnalyticsData(brandForAnalytics, testResults, sessionId);

      // Mark session complete with summary metrics
      console.log('🔍 SAVING DEBUG: Updating session with results:', {
        sessionId,
        mention_rate: Math.round(mentionRate),
        average_position: averagePosition ? Math.round(averagePosition * 10) / 10 : null,
        health_score: visibilityScore,
        total_tests: testResults.length
      });
      
      const { error: updateError } = await supabase
        .from('health_check_sessions')
        .update({
          completed_at: new Date().toISOString(),
          mention_rate: Math.round(mentionRate),
          average_position: averagePosition ? Math.round(averagePosition * 10) / 10 : null,
          health_score: visibilityScore
        })
        .eq('id', sessionId);
      
      if (updateError) {
        console.error('🔍 SAVING DEBUG: Failed to update session:', updateError);
      } else {
        console.log('🔍 SAVING DEBUG: Session updated successfully');
      }

      // Verify data was saved by attempting to load it back
      console.log('🔍 VERIFICATION DEBUG: Verifying saved data...');
      try {
        const { data: verifySession } = await supabase
          .from('health_check_sessions')
          .select('id, completed_at, mention_rate, health_score')
          .eq('id', sessionId)
          .single();
        
        const { data: verifyTests } = await supabase
          .from('ai_tests')
          .select('id')
          .eq('health_check_session_id', sessionId);
        
        console.log('🔍 VERIFICATION DEBUG: Data verification complete:', {
          session: verifySession,
          testCount: verifyTests?.length || 0,
          sessionHasCompletedAt: !!verifySession?.completed_at,
          sessionHasMetrics: !!verifySession?.mention_rate
        });
      } catch (verifyError) {
        console.error('🔍 VERIFICATION DEBUG: Could not verify saved data:', verifyError);
      }

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

      return { mentionRate: Math.round(mentionRate), visibilityScore };

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