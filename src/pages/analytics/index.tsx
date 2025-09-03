import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import AppShell from '@/components/layout/AppShell'
import ResultsSection from '@/components/ui/results-section'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, BarChart3, Globe, Activity, Award, TrendingUp, Play } from 'lucide-react'
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
  
  const [activeTab, setActiveTab] = useState('results')
  const [company, setCompany] = useState<Company | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [healthScore, setHealthScore] = useState<number>(0)
  const [websiteAnalysis, setWebsiteAnalysis] = useState<any>(null)
  const [authorityAnalysis, setAuthorityAnalysis] = useState<any>(null)
  const [industryBenchmark, setIndustryBenchmark] = useState<any>(null)
  const [trendingOpportunities, setTrendingOpportunities] = useState<TrendingOpportunity[]>([])
  const [autoStrategies, setAutoStrategies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isRunningHealthCheck, setIsRunningHealthCheck] = useState(false)
  const [showResultsSection, setShowResultsSection] = useState(false)

  const tabs = [
    { id: 'results', label: 'Results', icon: BarChart3 },
    { id: 'website', label: 'Website Analysis', icon: Globe },
    { id: 'benchmark', label: 'Benchmarking', icon: Activity },
    { id: 'authority', label: 'Authority', icon: Award },
    { id: 'trending', label: 'Trending', icon: TrendingUp }
  ]

  // Check URL parameters for initial tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get('tab')
    if (tabParam && tabs.some(tab => tab.id === tabParam)) {
      setActiveTab(tabParam)
    }
  }, [])

  // Load persisted data on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('geo_last_run')
      if (raw) {
        const parsed: PersistedLastRun = JSON.parse(raw)
        setTestResults(parsed.results || [])
        if (parsed.results && parsed.results.length > 0) {
          setShowResultsSection(true)
          calculateHealthScore(parsed.results)
        }
        if (parsed.type === 'health') {
          setAutoStrategies(parsed.strategies || [])
          setWebsiteAnalysis(parsed.websiteAnalysis || null)
        }
      }
    } catch {}
  }, [])

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
        // Load AI test results
        const { data: aiTests } = await supabase
          .from('ai_tests')
          .select('*')
          .eq('company_id', company.id)
          .order('test_date', { ascending: false })

        if (aiTests) {
          const results = aiTests.map((test) => ({
            prompt: test.prompt_id || 'Custom prompt',
            mentioned: test.company_mentioned,
            position: test.mention_position || 0,
            sentiment: (test.sentiment || 'neutral') as 'positive' | 'neutral' | 'negative',
            context: test.mention_context || '',
            response: test.ai_response || ''
          }))
          
          if (results.length > 0) {
            setTestResults(results)
            setShowResultsSection(true)
            calculateHealthScore(results)
          }
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

  const calculateHealthScore = (results: TestResult[]) => {
    if (results.length === 0) {
      setHealthScore(0)
      return
    }
    
    const mentionRate = results.filter(r => r.mentioned).length / results.length
    const avgPosition = results
      .filter(r => r.mentioned && r.position > 0)
      .reduce((sum, r) => sum + r.position, 0) / results.filter(r => r.mentioned && r.position > 0).length || 10
    
    const positionScore = Math.max(0, (10 - avgPosition) / 10)
    const score = Math.round((mentionRate * 0.7 + positionScore * 0.3) * 100)
    setHealthScore(score)
  }

  const runHealthCheck = async () => {
    if (!company) {
      toast({
        title: 'Error',
        description: 'Company profile required to run health check',
        variant: 'destructive'
      })
      return
    }

    setIsRunningHealthCheck(true)
    navigate('/analytics/health-check')
  }

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
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
            <p className="body text-gray-600">Detailed insights and performance analysis - updated</p>
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

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-3 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Overview Cards - Always show when no data */}
        {!showResultsSection && testResults.length === 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const descriptions = {
                results: 'View detailed test results and AI visibility analysis',
                website: 'Content analysis and optimization opportunities',
                benchmark: 'Industry comparison and competitive positioning',
                authority: 'Authority building and trust signal analysis',
                trending: 'Trending topics and content opportunities'
              }
              
              return (
                <div 
                  key={tab.id}
                  className={`p-4 border rounded-lg transition-colors cursor-pointer ${
                    activeTab === tab.id 
                      ? 'border-purple-600 bg-purple-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-purple-600' : 'text-gray-600'}`} />
                    <h3 className={`font-medium ${activeTab === tab.id ? 'text-purple-900' : 'text-gray-900'}`}>
                      {tab.label}
                    </h3>
                  </div>
                  <p className={`text-sm ${activeTab === tab.id ? 'text-purple-700' : 'text-gray-600'}`}>
                    {descriptions[tab.id as keyof typeof descriptions]}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-white rounded-lg border">
          {!showResultsSection && testResults.length === 0 && activeTab === 'results' ? (
            <div className="p-8 text-center">
              <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="h3 mb-4">No Data Available</h3>
              <p className="body text-gray-600 mb-6">
                Run a health check to generate data for all analytics sections.
              </p>
              <button
                onClick={runHealthCheck}
                disabled={!company}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <Play className="w-5 h-5 mr-2 inline" />
                Run Your First Health Check
              </button>
            </div>
          ) : activeTab !== 'results' && !showResultsSection && testResults.length === 0 ? (
            <div className="p-8 text-center">
              {(() => {
                const Icon = tabs.find(t => t.id === activeTab)?.icon || BarChart3
                const tabNames = {
                  website: 'Website Analysis',
                  benchmark: 'Benchmarking',
                  authority: 'Authority',
                  trending: 'Trending'
                }
                return (
                  <>
                    <Icon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="h3 mb-4">{tabNames[activeTab as keyof typeof tabNames]} Data</h3>
                    <p className="body text-gray-600 mb-6">
                      Run a health check to generate {activeTab} analysis and insights.
                    </p>
                    <button
                      onClick={runHealthCheck}
                      disabled={!company}
                      className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      <Play className="w-5 h-5 mr-2 inline" />
                      Run Health Check
                    </button>
                  </>
                )
              })()}
            </div>
          ) : (
            <ResultsSection
              healthCheckTab={activeTab}
              testResults={testResults}
              healthScore={healthScore}
              company={company}
              websiteAnalysis={websiteAnalysis}
              authorityAnalysis={authorityAnalysis}
              industryBenchmark={industryBenchmark}
              trendingOpportunities={trendingOpportunities}
              autoStrategies={autoStrategies}
              onTabChange={setActiveTab}
              isRunningHealthCheck={isRunningHealthCheck}
            />
          )}
        </div>
      </div>
    </AppShell>
  )
}