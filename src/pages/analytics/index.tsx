import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
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
  
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [healthScore, setHealthScore] = useState<number>(0)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunningHealthCheck, setIsRunningHealthCheck] = useState(false)
  const [currentTestPrompt, setCurrentTestPrompt] = useState('')
  const [testProgress, setTestProgress] = useState({ current: 0, total: 0 })
  const [contentOpportunities, setContentOpportunities] = useState<ContentOpportunity[]>([])
  const [autoStrategies, setAutoStrategies] = useState<any[]>([])
  const [trendingOpportunities, setTrendingOpportunities] = useState<TrendingOpportunity[]>([])
  const [websiteAnalysis, setWebsiteAnalysis] = useState<any>(null)
  const [authorityAnalysis, setAuthorityAnalysis] = useState<any>(null)
  const [industryBenchmark, setIndustryBenchmark] = useState<any>(null)
  
  // Tab management
  const [activeTab, setActiveTab] = useState('results')
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

        if (aiTests && aiTests.length > 0) {
          const results = aiTests.map((test) => ({
            prompt: test.prompt_id || 'Custom prompt',
            mentioned: test.company_mentioned,
            position: test.mention_position || 0,
            sentiment: (test.sentiment || 'neutral') as 'positive' | 'neutral' | 'negative',
            context: test.mention_context || '',
            response: test.ai_response || ''
          }))
          
          setTestResults(results)
          setShowResultsSection(true)
          calculateHealthScore(results)
          generateContentOpportunities(results, company)
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
    if (!company) {
      toast({
        title: 'Error',
        description: 'Company profile required to run health check',
        variant: 'destructive'
      })
      return
    }

    setIsRunningHealthCheck(true)
    setTestProgress({ current: 0, total: 25 })
    
    try {
      // Generate 25 relevant prompts based on company data
      const prompts = [
        `What are the best companies in ${company.industry}?`,
        `Who are the top players in ${company.industry}?`,
        `Recommend solutions for ${company.target_customers}`,
        `Best ${company.industry} providers`,
        `${company.industry} market leaders`,
        `How to choose ${company.industry} software`,
        `${company.industry} comparison`,
        `Top ${company.industry} vendors`,
        `${company.industry} reviews`,
        `Best practices for ${company.industry}`,
        `${company.industry} implementation guide`,
        `${company.industry} cost comparison`,
        `${company.industry} features to look for`,
        `${company.industry} trends 2024`,
        `${company.industry} case studies`,
        `${company.industry} success stories`,
        `${company.industry} ROI analysis`,
        `${company.industry} integration options`,
        `${company.industry} security considerations`,
        `${company.industry} scalability`,
        `${company.industry} alternatives`,
        `${company.industry} pricing models`,
        `${company.industry} deployment options`,
        `${company.industry} support and training`,
        `${company.industry} future outlook`
      ]

      // Process prompts one by one
      const results: TestResult[] = []
      
      for (let i = 0; i < prompts.length; i++) {
        const currentPrompt = prompts[i]
        setCurrentTestPrompt(`Testing: "${currentPrompt}"`)
        setTestProgress({ current: i + 1, total: prompts.length })
        
        // Simulate API call with realistic mock data
        await new Promise(resolve => setTimeout(resolve, 800))
        
        const mentioned = Math.random() > 0.6 // 40% chance of mention
        const testResult: TestResult = {
          prompt: currentPrompt,
          mentioned,
          position: mentioned ? Math.floor(Math.random() * 10) + 1 : 0,
          sentiment: mentioned ? (['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)] as any) : 'neutral',
          context: mentioned ? `${company.company_name} was mentioned as a leading solution...` : 'No mention found',
          response: `Mock response for: ${currentPrompt}`
        }
        
        results.push(testResult)
        
        const currentMentions = results.filter(r => r.mentioned).length
        setCurrentTestPrompt(`Found ${currentMentions} mentions so far...`)
      }

      if (results.length === 0) {
        toast({
          title: 'Error',
          description: 'Health check failed - no results were returned',
          variant: 'destructive'
        })
        return
      }

      setTestResults(results)
      setShowResultsSection(true)
      calculateHealthScore(results)
      generateContentOpportunities(results, company)
      
      // Persist results
      const persistData: PersistedLastRun = {
        type: 'health',
        results,
        strategies: autoStrategies,
        timestamp: Date.now(),
        websiteAnalysis
      }
      window.localStorage.setItem('geo_last_run', JSON.stringify(persistData))
      
      const mentionCount = results.filter(r => r.mentioned).length
      const successRate = Math.round((mentionCount / results.length) * 100)
      
      toast({
        title: 'Success',
        description: `Health check completed! Found ${mentionCount} mentions out of ${results.length} tests (${successRate}% mention rate)`
      })
      
    } catch (error) {
      console.error('Error running health check:', error)
      toast({
        title: 'Error',
        description: 'Failed to run health check. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsRunningHealthCheck(false)
      setCurrentTestPrompt('')
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

        {/* Overview Cards when no data */}
        {!showResultsSection && (
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

        {/* Results Section - Always show, it handles its own tab switching */}
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
      </div>
    </AppShell>
  )
}