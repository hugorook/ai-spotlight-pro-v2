import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useHealthCheck } from '@/contexts/HealthCheckContext'
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


export default function HealthCheckAnalytics() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const {
    isRunning,
    progress,
    currentPrompt,
    results: healthCheckResults,
    visibilityScore,
    mentionRate,
    averagePosition,
    runHealthCheck,
    error: healthCheckError
  } = useHealthCheck()
  
  const [company, setCompany] = useState<Company | null>(null)
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
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load company data',
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

  const handleRunHealthCheck = async () => {
    if (!company) {
      toast({
        title: 'Error',
        description: 'Company profile required',
        variant: 'destructive'
      })
      return
    }

    try {
      await runHealthCheck()
      
      toast({
        title: 'Success',
        description: `Health check completed! Found ${mentionRate}% mention rate with score of ${visibilityScore}`
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
          <Button onClick={() => navigate('/geo')}>
            Set Up Company Profile
          </Button>
        </div>
      </AppShell>
    )
  }

  const healthScore = visibilityScore || 0

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button 
            onClick={() => navigate('/analytics')}
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
                onClick={handleRunHealthCheck} 
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
                    value={progress} 
                    className="h-2"
                  />
                  <p className="text-sm text-gray-600">
                    Running health check... {progress}% complete
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
            {healthCheckResults.length > 0 && (
              <div className="border-t pt-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="bg-gray-50">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold">{healthCheckResults.length}</div>
                      <div className="text-sm text-gray-600">Prompts Tested</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-50">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {mentionRate || 0}%
                      </div>
                      <div className="text-sm text-gray-600">Mention Rate</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-50">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold">
                        {averagePosition || '0'}
                      </div>
                      <div className="text-sm text-gray-600">Avg Position</div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold">Detailed Results</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {healthCheckResults.map((result, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{result.prompt_text}</p>
                          {result.mention_context && (
                            <p className="text-sm text-gray-600 mt-1 truncate">{result.mention_context}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Badge 
                            variant={result.company_mentioned ? "default" : "secondary"}
                            className={result.company_mentioned ? "bg-green-600" : ""}
                          >
                            {result.company_mentioned ? `Position ${result.mention_position || 'N/A'}` : 'Not Mentioned'}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {result.sentiment || 'neutral'}
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