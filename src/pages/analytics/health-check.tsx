import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import AppShell from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Play, Loader2, TestTube, TrendingUp } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import type { Tables } from '@/types/supabase'

type Company = Tables<'companies'>

interface TestResult {
  prompt: string
  mentioned: boolean
  position: number
  sentiment: 'positive' | 'neutral' | 'negative'
  context: string
}

export default function HealthCheckAnalytics() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [company, setCompany] = useState<Company | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [currentPrompt, setCurrentPrompt] = useState('')
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!user) return

    try {
      // Load company
      const { data: companies } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)

      const company = companies?.[0] || null
      setCompany(company)

      // Load existing test results
      if (company) {
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
            context: test.mention_context || ''
          }))
          setTestResults(results)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load health check data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user, loadData])

  const runHealthCheck = async () => {
    if (!company) {
      toast({
        title: 'Error',
        description: 'Company profile required',
        variant: 'destructive'
      })
      return
    }

    setIsRunning(true)
    setProgress({ current: 0, total: 25 })
    
    try {
      // Generate 25 relevant prompts
      const prompts = [
        `What are the best ${company.industry} companies?`,
        `Who are the top players in ${company.industry}?`,
        `Recommend ${company.industry} solutions for ${company.target_customers}`,
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

      const results: TestResult[] = []
      
      for (let i = 0; i < prompts.length; i++) {
        const currentTestPrompt = prompts[i]
        setCurrentPrompt(`Testing: "${currentTestPrompt}"`)
        setProgress({ current: i + 1, total: prompts.length })
        
        try {
          const { data: result, error } = await supabase.functions.invoke('test-ai-models', {
            body: {
              prompt: currentTestPrompt,
              companyName: company.company_name,
              industry: company.industry,
              description: company.description,
              differentiators: company.key_differentiators
            }
          })

          if (error) {
            console.error('Prompt error:', error)
            continue
          }

          if (result) {
            const testResult: TestResult = {
              prompt: currentTestPrompt,
              mentioned: result.mentioned || false,
              position: result.position || 0,
              sentiment: (result.sentiment || 'neutral') as 'positive' | 'neutral' | 'negative',
              context: result.context || result.response || ''
            }
            
            results.push(testResult)
            
            const currentMentions = results.filter(r => r.mentioned).length
            setCurrentPrompt(`Found ${currentMentions} mentions so far...`)
            
            await new Promise(resolve => setTimeout(resolve, 500))
          }
          
        } catch (promptError) {
          console.error('Error processing prompt:', promptError)
        }
      }

      if (results.length === 0) {
        toast({
          title: 'Error',
          description: 'Health check failed - no results returned',
          variant: 'destructive'
        })
        return
      }

      setTestResults(results)
      
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
      setIsRunning(false)
      setCurrentPrompt('')
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AppShell>
    )
  }

  if (!company) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto text-center py-20">
          <TestTube className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="h2 mb-2">Company Profile Required</h2>
          <p className="body text-gray-600 mb-6">
            Set up your company profile to start using AI Visibility testing.
          </p>
          <Button onClick={() => router.push('/geo')}>
            Set Up Company Profile
          </Button>
        </div>
      </AppShell>
    )
  }

  const healthScore = testResults.length > 0 
    ? Math.round((testResults.filter(r => r.mentioned).length / testResults.length) * 100)
    : 0

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button 
            onClick={() => router.push('/analytics')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="h1">Health Check</h1>
            <p className="body text-gray-600">AI visibility testing and analysis</p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <TrendingUp className="w-4 h-4 mr-2" />
            Health Score: {healthScore}/100
          </Badge>
        </div>

        {/* Main Health Check Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-purple-600" />
              AI Visibility Health Check
            </CardTitle>
            <p className="text-gray-600">
              Test how your company appears across 25+ AI-generated responses
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Run Health Check */}
            <div className="text-center space-y-4">
              <Button 
                onClick={runHealthCheck} 
                disabled={isRunning}
                size="lg"
                className="w-full max-w-md h-12 text-lg"
              >
                {isRunning ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Running Health Check...
                  </div>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Run Automated Health Check
                  </>
                )}
              </Button>
              
              {isRunning && (
                <div className="space-y-3 max-w-md mx-auto">
                  <Progress 
                    value={(progress.current / progress.total) * 100} 
                    className="h-2"
                  />
                  <p className="text-sm text-gray-600">
                    Testing prompt {progress.current} of {progress.total}...
                  </p>
                  {currentPrompt && (
                    <div className="p-3 bg-gray-100 rounded-lg">
                      <p className="text-sm font-medium text-center">
                        "{currentPrompt}"
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Results Display */}
            {testResults.length > 0 && (
              <div className="border-t pt-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="bg-gray-50">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold">{testResults.length}</div>
                      <div className="text-sm text-gray-600">Prompts Tested</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-50">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round((testResults.filter(r => r.mentioned).length / testResults.length) * 100)}%
                      </div>
                      <div className="text-sm text-gray-600">Mention Rate</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-50">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold">
                        {testResults
                          .filter(r => r.mentioned && r.position > 0)
                          .reduce((sum, r, _, arr) => sum + r.position / arr.length, 0)
                          .toFixed(1) || '0'}
                      </div>
                      <div className="text-sm text-gray-600">Avg Position</div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold">Detailed Results</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {testResults.map((result, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{result.prompt}</p>
                          {result.context && (
                            <p className="text-sm text-gray-600 mt-1 truncate">{result.context}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Badge 
                            variant={result.mentioned ? "default" : "secondary"}
                            className={result.mentioned ? "bg-green-600" : ""}
                          >
                            {result.mentioned ? `Position ${result.position}` : 'Not Mentioned'}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {result.sentiment}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}