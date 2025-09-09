import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useHealthCheck } from '@/contexts/HealthCheckContext'
import { supabase } from '@/integrations/supabase/client'
import AppShell from '@/components/layout/AppShell'
import ResultsSection from '@/components/ui/results-section'
import LoadingOverlay from '@/components/LoadingOverlay'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, BarChart3, Globe, Activity, Award, TrendingUp, Play } from 'lucide-react'
import { scheduleJob, logEvent } from '@/integrations/supabase/functions'
import type { Tables } from '@/types/supabase'

type Company = Tables<'companies'>

interface TestResult {
  prompt: string
  mentioned: boolean
  position: number
  sentiment: 'positive' | 'neutral' | 'negative'
  context: string
  response?: string
  failureAnalysis?: any
}

interface TrendingOpportunity {
  query: string
  trendScore: number
  timeWindow: string
  reasoning: string
  suggestedContent: string
  difficulty: 'easy' | 'moderate' | 'advanced'
}

interface ContentOpportunity {
  id: string
  title: string
  type: string
  priority: 'high' | 'medium' | 'low'
  description: string
  prompts: string[]
  outline: string[]
  optimizationTips: string[]
  expectedImpact: string
}

interface PersistedLastRun {
  type: 'health' | 'custom'
  results: TestResult[]
  strategies?: any[]
  timestamp: number
  websiteAnalysis?: any
}

export default function Analytics() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const {
    isRunning: isRunningHealthCheck,
    progress: healthCheckProgress,
    currentPrompt: currentTestPrompt,
    results: healthCheckResults,
    visibilityScore,
    mentionRate,
    averagePosition,
    runHealthCheck: contextRunHealthCheck,
    lastRunDate
  } = useHealthCheck()
  
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Convert health check results to TestResult format for UI
  const testResults: TestResult[] = healthCheckResults.map(r => ({
    prompt: r.prompt_text,
    mentioned: r.company_mentioned,
    position: r.mention_position || 0,
    sentiment: r.sentiment || 'neutral',
    context: r.mention_context || '',
    response: r.response_text
  }))
  
  const healthScore = visibilityScore || 0
  const testProgress = {
    current: Math.round((healthCheckProgress / 100) * 25),
    total: 25
  }
  const [contentOpportunities, setContentOpportunities] = useState<ContentOpportunity[]>([])
  const [autoStrategies, setAutoStrategies] = useState<any[]>([])
  const [trendingOpportunities, setTrendingOpportunities] = useState<TrendingOpportunity[]>([])
  const [websiteAnalysis, setWebsiteAnalysis] = useState<any>(null)
  const [authorityAnalysis, setAuthorityAnalysis] = useState<any>(null)
  const [industryBenchmark, setIndustryBenchmark] = useState<any>(null)
  
  // Tab management
  const [activeTab, setActiveTab] = useState('results')
  const [showResultsSection, setShowResultsSection] = useState(false)
  
  // Historical data for progress tracking
  const [historicalTests, setHistoricalTests] = useState<any[]>([])

  // One-time cleanup of legacy/stale localStorage keys that could show old results
  useEffect(() => {
    try {
      const legacyKeys = [
        'website_analysis',
        'authority_analysis',
        'benchmark_analysis',
        'trending_analysis',
        'website_analysis_enhanced',
        'geo_last_run',
        'geo_health_check_data'
      ]
      legacyKeys.forEach(k => localStorage.removeItem(k))
    } catch {}
  }, [])

  const tabs = [
    { id: 'results', label: 'Results', icon: BarChart3 },
    { id: 'website', label: 'Website Analysis', icon: Globe },
    { id: 'benchmark', label: 'Benchmarking', icon: Activity },
    { id: 'authority', label: 'Authority', icon: Award },
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    { id: 'progress', label: 'Progress Tracking', icon: TrendingUp }
  ]

  // Check URL parameters for initial tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get('tab')
    if (tabParam && tabs.some(tab => tab.id === tabParam)) {
      setActiveTab(tabParam)
    }
  }, [])

  // Load analytics data from most recent health check SESSION (from DB, not localStorage)
  useEffect(() => {
    try {
      const load = async () => {
        if (!user) return
        
        // Determine most recent session
        const { data: session } = await supabase
          .from('health_check_sessions')
          .select('id, completed_at')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!session) return

        // Load analytics data for that session in parallel
        const { data: analyticsRows } = await supabase
          .from('analytics_data')
          .select('analytics_type, data')
          .eq('health_check_session_id', session.id)
          .eq('user_id', user.id)

        if (analyticsRows && analyticsRows.length > 0) {
          console.log('📊 ANALYTICS LOADING DEBUG: Found analytics data:', analyticsRows.map(r => r.analytics_type));
          for (const row of analyticsRows) {
            if (row.analytics_type === 'website_analysis') {
              console.log('🌐 WEBSITE ANALYSIS LOADING DEBUG: Setting website analysis data');
              setWebsiteAnalysis(row.data)
            }
            if (row.analytics_type === 'authority_analysis') setAuthorityAnalysis(row.data?.analysis ?? row.data)
            if (row.analytics_type === 'industry_benchmark') setIndustryBenchmark(row.data?.benchmark ?? row.data)
            if (row.analytics_type === 'trending_opportunities') setTrendingOpportunities(row.data?.opportunities || [])
          }
        }

        // Show results when we have test results in context or from DB
        if (healthCheckResults.length > 0) {
          setShowResultsSection(true)
          if (company) generateContentOpportunities(testResults, company)
        }
      }
      load()
    } catch (error) {
      console.error('Error loading analytics data:', error)
    }
  }, [healthCheckResults, company, testResults, user])

  const loadCompanyData = useCallback(async () => {
    if (!user) return

    try {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error loading company:', error)
        return
      }

      const company = companies && companies.length > 0 ? companies[0] : null
      setCompany(company)

      if (company) {
        // Load historical AI test results for progress tracking
        const { data: aiTests } = await supabase
          .from('ai_tests')
          .select('*')
          .eq('company_id', company.id)
          .order('test_date', { ascending: false })

        if (aiTests) {
          setHistoricalTests(aiTests)
        }
      }
    } catch (error) {
      console.error('Error loading company data:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadCompanyData()
    } else {
      setLoading(false)
    }
  }, [user, loadCompanyData])


  const generateContentOpportunities = (results: TestResult[], companyData: Company) => {
    const missedPrompts = results.filter(r => !r.mentioned)
    const opportunities: ContentOpportunity[] = [
      {
        id: '1',
        title: `Create FAQ Page About Solutions`,
        type: 'FAQ Page',
        priority: 'high',
        description: 'Comprehensive FAQ addressing common questions in your industry',
        prompts: missedPrompts.slice(0, 3).map(r => r.prompt),
        outline: [
          'What is the best approach to your industry problem?',
          'How do you choose the right provider?',
          'What are the key features to look for?',
          'How much should you expect to pay?'
        ],
        optimizationTips: [
          'Use natural question-answer format',
          'Include specific use cases and examples',
          'Structure with clear headings and bullet points'
        ],
        expectedImpact: 'Should improve visibility for 3-5 question-based prompts'
      }
    ]
    setContentOpportunities(opportunities)
  }

  const runHealthCheck = async () => {
    try {
      const result = await contextRunHealthCheck()
      // Robust: compute metrics from latest session in DB to avoid any transient state
      let displayMention = (result as any)?.mentionRate ?? null
      let displayScore = (result as any)?.visibilityScore ?? null

      try {
        if (!displayMention || displayScore == null) {
          const { data: session } = await supabase
            .from('health_check_sessions')
            .select('id')
            .eq('user_id', user!.id)
            .order('completed_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (session) {
            const { data: tests } = await supabase
              .from('ai_tests')
              .select('company_mentioned, mention_position')
              .eq('company_id', company?.id!)
              .eq('health_check_session_id', session.id)

            if (tests && tests.length > 0) {
              const mentioned = tests.filter(t => t.company_mentioned)
              const mr = Math.round((mentioned.length / tests.length) * 100)
              const avgPos = mentioned.length > 0 
                ? mentioned.reduce((s, t) => s + (t.mention_position || 0), 0) / mentioned.length
                : 0
              const positionScore = avgPos ? Math.max(0, (11 - avgPos) / 10) : 0
              const vs = Math.round(mr * 0.7 + positionScore * 100 * 0.3)
              displayMention = displayMention ?? mr
              displayScore = displayScore ?? vs
            }
          }
        }
      } catch {}

      toast({
        title: 'Health Check Complete',
        description: `Found ${displayMention ?? 0}% mention rate with visibility score of ${displayScore ?? 0}`
      })
    } catch (error) {
      console.error('Error running health check:', error)
      toast({
        title: 'Error',
        description: 'Failed to run health check. Please try again.',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <AppShell>
        <LoadingOverlay />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="h1">Analytics Hub</h1>
            <p className="body text-gray-600">Detailed insights and performance analysis</p>
          </div>
          
          {/* Run Health Check Button */}
          <button
            onClick={runHealthCheck}
            disabled={isRunningHealthCheck || !company}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            {isRunningHealthCheck ? 'Running...' : 'Run Health Check'}
          </button>
        </div>

        {/* Analytics Section Boxes - 2 rows of 3 */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const descriptions = {
              results: 'Current health check test results and AI visibility analysis',
              website: 'Content analysis and optimization opportunities for your site',
              benchmark: 'Industry comparison and competitive positioning insights',
              authority: 'Authority building strategies and trust signal analysis',
              trending: 'Trending topics and emerging content opportunities',
              progress: 'Historical test results and performance tracking over time'
            }
            
            return (
              <div 
                key={tab.id}
                className={`p-4 border-2 rounded-lg transition-all duration-200 cursor-pointer hover:shadow-lg ${
                  activeTab === tab.id 
                    ? 'border-purple-600 bg-purple-50 shadow-lg' 
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <div className="text-center">
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${
                    activeTab === tab.id ? 'text-purple-600' : 'text-gray-600'
                  }`} />
                  <h2 className={`h3 mb-1 ${
                    activeTab === tab.id ? 'text-purple-900' : 'text-gray-900'
                  }`}>
                    {tab.label}
                  </h2>
                  <p className={`text-xs leading-relaxed ${
                    activeTab === tab.id ? 'text-purple-700' : 'text-gray-600'
                  }`}>
                    {descriptions[tab.id as keyof typeof descriptions]}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Loading state during health check */}
        {isRunningHealthCheck && (
          <div className="bg-white rounded-lg border p-8 mb-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <h3 className="h3 mb-2">Running Health Check...</h3>
              <p className="text-gray-600 mb-4">Testing prompt {testProgress.current} of {testProgress.total}</p>
              {currentTestPrompt && (
                <div className="bg-gray-50 rounded-lg p-3 max-w-2xl mx-auto">
                  <p className="text-sm text-gray-700">"{currentTestPrompt}"</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Progress Tracking Tab Content */}
        {activeTab === 'progress' ? (
          <div className="bg-white rounded-lg border">
            <div className="p-6">
              <h3 className="h3 mb-4">Progress Tracking</h3>
              <p className="body text-gray-600 mb-6">Historical AI visibility test results and performance over time</p>
              
              {historicalTests.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h4 className="h4 mb-2">No Historical Data</h4>
                  <p className="body text-gray-600 mb-4">
                    Run health checks to build your progress tracking history.
                  </p>
                  <button
                    onClick={runHealthCheck}
                    disabled={!company}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    <Play className="w-5 h-5 mr-2 inline" />
                    Run First Health Check
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-gray-900">{historicalTests.length}</div>
                      <div className="text-sm text-gray-600">Total Tests</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {historicalTests.filter(t => t.company_mentioned).length}
                      </div>
                      <div className="text-sm text-gray-600">Mentions Found</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.round((historicalTests.filter(t => t.company_mentioned).length / historicalTests.length) * 100) || 0}%
                      </div>
                      <div className="text-sm text-gray-600">Success Rate</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold">All Test Results</h4>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {historicalTests.map((test, index) => (
                        <div key={test.id || index} className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {test.prompt_id || 'Custom Test'}
                            </p>
                            <p className="text-xs text-gray-600">
                              {new Date(test.test_date).toLocaleDateString()} - {test.ai_model || 'Unknown Model'}
                            </p>
                            {test.mention_context && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {test.mention_context}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <div className={`w-3 h-3 rounded-full ${
                              test.company_mentioned ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                            {test.company_mentioned && test.mention_position && (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                Position #{test.mention_position}
                              </span>
                            )}
                            {test.sentiment && (
                              <span className={`px-2 py-1 text-xs rounded capitalize ${
                                test.sentiment === 'positive' 
                                  ? 'bg-green-100 text-green-800'
                                  : test.sentiment === 'negative'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {test.sentiment}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Results Section - Show for all other tabs */
          <ResultsSection
            isVisible={true}
            activeTab={activeTab}
            results={testResults}
            healthScore={healthScore}
            company={company}
            websiteAnalysis={websiteAnalysis}
            authorityAnalysis={authorityAnalysis}
            industryBenchmark={industryBenchmark}
            trendingOpportunities={trendingOpportunities}
            strategies={autoStrategies}
            onTabChange={setActiveTab}
          />
        )}
      </div>
    </AppShell>
  )
}