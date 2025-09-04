import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import AppShell from '@/components/layout/AppShell'
import { AutopilotCard } from '@/components/dashboard/AutopilotCard'
import { WinsCard } from '@/components/dashboard/WinsCard'
import { TopActionsCard } from '@/components/dashboard/TopActionsCard'
import { ImprovementsCard } from '@/components/dashboard/ImprovementsCard'
import { useToast } from '@/components/ui/use-toast'
import { useNavigate } from 'react-router-dom'

interface Project {
  id: string
  site_url: string
  cms_provider: string
  site_script_status: 'connected' | 'missing'
  autopilot_enabled: boolean
  autopilot_scopes: string[]
}

interface DashboardData {
  project: Project | null
  wins: any[]
  actions: any[]
  improvements: any[]
  recentChanges: number
  lastRunAt?: string
  recentFixes: any[]
}

export default function TodayDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  
  const [data, setData] = useState<DashboardData>({
    project: null,
    wins: [],
    actions: [],
    improvements: [],
    recentChanges: 0,
    recentFixes: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isApplying, setIsApplying] = useState(false)
  const [isRunningHealthCheck, setIsRunningHealthCheck] = useState(false)
  const [healthCheckProgress, setHealthCheckProgress] = useState({ current: 0, total: 0 })
  const [currentTestPrompt, setCurrentTestPrompt] = useState('')

  // Load dashboard data
  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)

      // Get or create user's project
      let { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user?.id)
        .limit(1)

      let project = projects?.[0]

      // Create default project if none exists
      if (!project && user) {
        const { data: newProject, error } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            site_url: 'https://example.com', // TODO: Get from user input
            cms_provider: 'manual',
            site_script_status: 'missing',
            autopilot_enabled: false
          })
          .select()
          .single()

        if (error) throw error
        project = newProject
      }

      if (!project) {
        throw new Error('Could not create or load project')
      }

      // Load wins, actions, and recent changes in parallel
      const [winsResponse, actionsResponse, changelogResponse] = await Promise.all([
        fetch(`/api/wins?projectId=${project.id}&limit=8`),
        fetch('/api/recommendations/top', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: project.id, limit: 3 })
        }),
        fetch(`/api/changelog?projectId=${project.id}&limit=10`)
      ])

      const [wins, actionsData, changelog] = await Promise.all([
        winsResponse.json(),
        actionsResponse.json(),
        changelogResponse.json()
      ])

      // Calculate recent changes (last 7 days)
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      const recentChanges = changelog.changelog?.filter((change: any) => 
        new Date(change.appliedAt).getTime() > sevenDaysAgo
      ) || []

      const recentFixes = recentChanges.slice(0, 3).map((change: any) => ({
        scope: change.scope,
        description: change.description,
        count: change.diff?.after?.count || 1
      }))

      setData({
        project,
        wins: wins.wins || [],
        actions: actionsData.recommendations || [],
        recentChanges: recentChanges.length,
        lastRunAt: recentChanges[0]?.appliedAt,
        recentFixes
      })
    } catch (error) {
      console.error('Error loading dashboard:', error)
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleApplyFixes = async () => {
    if (!data.project) return

    try {
      setIsApplying(true)
      
      const response = await fetch('/api/changes/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: data.project.id })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to apply fixes')
      }

      toast({
        title: 'Success',
        description: `Applied ${result.appliedCount} fixes to your site`
      })

      // Refresh dashboard data
      await loadDashboardData()
    } catch (error: any) {
      console.error('Error applying fixes:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to apply fixes',
        variant: 'destructive'
      })
    } finally {
      setIsApplying(false)
    }
  }

  const handleToggleAutopilot = async () => {
    if (!data.project) return

    try {
      const response = await fetch('/api/autopilot/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: data.project.id,
          enabled: !data.project.autopilot_enabled
        })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      toast({
        title: 'Success',
        description: `Autopilot ${result.project.autopilot_enabled ? 'enabled' : 'disabled'}`
      })

      // Refresh data
      await loadDashboardData()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to toggle autopilot',
        variant: 'destructive'
      })
    }
  }

  const handleRunHealthCheck = async () => {
    if (!user) return

    setIsRunningHealthCheck(true)
    
    try {
      // Get company data from companies table
      const { data: companies, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)

      if (companyError || !companies || companies.length === 0) {
        toast({
          title: 'Error',
          description: 'Company profile not found. Please set up your company profile first.',
          variant: 'destructive'
        })
        return
      }

      const companyData = companies[0]

      // Generate prompts based on company data
      const prompts = [
        `What are the best companies in ${companyData.industry}?`,
        `Who are the top players in ${companyData.industry}?`,
        `Recommend solutions for ${companyData.target_customers}`,
        `Best ${companyData.industry} providers`,
        `${companyData.industry} market leaders`,
        `How to choose ${companyData.industry} software`,
        `${companyData.industry} comparison`,
        `Top ${companyData.industry} vendors`,
        `${companyData.industry} reviews`,
        `Best practices for ${companyData.industry}`,
        `${companyData.industry} implementation guide`,
        `${companyData.industry} cost comparison`,
        `${companyData.industry} features to look for`,
        `${companyData.industry} trends 2024`,
        `${companyData.industry} case studies`
      ]

      setHealthCheckProgress({ current: 0, total: prompts.length })

      // Process prompts one by one with real AI testing
      const results: any[] = []
      const wins: any[] = []
      const improvements: any[] = []
      
      for (let i = 0; i < prompts.length; i++) {
        const currentPrompt = prompts[i]
        setCurrentTestPrompt(`Testing: ${currentPrompt}`)
        setHealthCheckProgress({ current: i + 1, total: prompts.length })
        
        try {
          // Make real API call to test AI models
          const { data: result, error: testError } = await supabase.functions.invoke('test-ai-models', {
            body: {
              prompt: currentPrompt,
              companyName: companyData.company_name,
              industry: companyData.industry,
              description: companyData.description,
              differentiators: companyData.key_differentiators
            }
          })

          if (testError) {
            console.error('Error testing prompt:', testError)
            continue
          }

          const testResult = {
            prompt: currentPrompt,
            mentioned: result.mentioned || false,
            position: result.position || 0,
            sentiment: result.sentiment || 'neutral',
            context: result.context || 'No mention found',
            response: result.response || 'No response available'
          }
          
          results.push(testResult)

          // If mentioned, add to wins
          if (testResult.mentioned && testResult.position > 0) {
            wins.push({
              id: `win-${i}`,
              prompt: testResult.prompt,
              rank: testResult.position,
              url: `https://${companyData.website_url || 'example.com'}`,
              lastSeen: new Date().toISOString()
            })
          } else if (!testResult.mentioned) {
            // If not mentioned, add to improvements
            improvements.push({
              id: `improve-${i}`,
              prompt: testResult.prompt,
              reason: testResult.context || 'Company not mentioned in AI response',
              priority: i < 5 ? 'High' : i < 10 ? 'Medium' : 'Low',
              lastChecked: new Date().toISOString()
            })
          }

          // Store result in ai_tests table
          await supabase.from('ai_tests').insert({
            company_id: companyData.id,
            prompt_text: currentPrompt,
            ai_model: 'gpt-4o-mini',
            company_mentioned: testResult.mentioned,
            mention_position: testResult.position > 0 ? testResult.position : null,
            sentiment: testResult.sentiment,
            mention_context: testResult.context,
            competitors_mentioned: [],
            response_text: testResult.response,
            test_date: new Date().toISOString()
          })
          
        } catch (error) {
          console.error('Error processing prompt:', currentPrompt, error)
        }
      }

      // Generate top 3 actions from failed prompts using AI
      const failedPrompts = results.filter(r => !r.mentioned)
      const actions: any[] = []

      if (failedPrompts.length > 0) {
        // Create actionable recommendations from failed prompts
        const topFailures = failedPrompts.slice(0, 6) // Use top 6 failures to create 3 actions
        
        for (let i = 0; i < Math.min(3, Math.ceil(topFailures.length / 2)); i++) {
          const relevantPrompts = topFailures.slice(i * 2, (i + 1) * 2)
          actions.push({
            id: `action-${i}`,
            title: `Create content targeting "${relevantPrompts[0]?.prompt.split(' ').slice(0, 4).join(' ')}..." queries`,
            rationale: `You're not appearing for ${relevantPrompts.length} related queries. Create targeted content to capture this audience.`,
            impact: i === 0 ? 'High' : i === 1 ? 'Medium' : 'Low',
            effort: 'Medium',
            suggestedOwner: 'Content',
            actionType: 'content-creation',
            links: [`https://docs.google.com/document/create`],
            status: 'todo'
          })
        }
      }

      // Update dashboard data with real results
      setData(prev => ({
        ...prev,
        wins: wins.sort((a, b) => a.rank - b.rank), // Sort by rank
        actions,
        improvements: improvements.slice(0, 8) // Show top 8 improvements
      }))

      const mentionCount = results.filter(r => r.mentioned).length
      const successRate = Math.round((mentionCount / results.length) * 100)
      
      toast({
        title: 'Health Check Complete',
        description: `Found ${mentionCount} mentions out of ${results.length} tests (${successRate}% visibility rate)`
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
      setHealthCheckProgress({ current: 0, total: 0 })
    }
  }

  const handleActionClick = (action: any) => {
    // Navigate to action details or external link
    if (action.links && action.links.length > 0) {
      window.open(action.links[0], '_blank')
    } else {
      toast({
        title: 'Action',
        description: `Starting: ${action.title}`
      })
    }
  }

  if (!user) {
    return (
      <AppShell>
        <div className="text-center py-12">
          <p className="text-gray-600">Please sign in to access your dashboard</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Compact Header - no center alignment */}
        <div className="mb-6">
          <h1 className="h1 mb-1">Dashboard</h1>
          <p className="body text-gray-600">Your AI visibility at a glance</p>
        </div>

        {/* Health Check Loading State */}
        {isRunningHealthCheck && (
          <div className="bg-white rounded-lg border shadow-sm p-6 mb-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5F209B] mx-auto mb-3"></div>
              <h3 className="h4 mb-2">Running Health Check...</h3>
              <p className="text-sm text-gray-600 mb-3">
                Testing prompt {healthCheckProgress.current} of {healthCheckProgress.total}
              </p>
              {currentTestPrompt && (
                <div className="bg-gray-50 rounded-lg p-3 max-w-2xl mx-auto">
                  <p className="text-xs text-gray-700 truncate">"{currentTestPrompt}"</p>
                </div>
              )}
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div 
                  className="bg-[#5F209B] h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${(healthCheckProgress.current / healthCheckProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Single Column Layout - Stacked Flow */}
        <div className="max-w-2xl mx-auto space-y-4">
          {/* 1. Autopilot Card */}
          <AutopilotCard
            isEnabled={data.project?.autopilot_enabled || false}
            scriptConnected={data.project?.site_script_status === 'connected'}
            recentChanges={data.recentChanges}
            lastRunAt={data.lastRunAt}
            isApplying={isApplying}
            recentFixes={data.recentFixes}
            onApplyFixes={handleApplyFixes}
            onToggleAutopilot={handleToggleAutopilot}
          />

          {/* 2. Where You're Winning */}
          <WinsCard
            wins={data.wins}
            isLoading={isLoading || isRunningHealthCheck}
            onRefresh={handleRunHealthCheck}
          />

          {/* 3. Your Top 3 */}
          <TopActionsCard
            actions={data.actions}
            isLoading={isLoading || isRunningHealthCheck}
            onActionClick={handleActionClick}
          />

          {/* 4. Key Areas to Improve */}
          <ImprovementsCard
            improvements={data.improvements}
            isLoading={isLoading || isRunningHealthCheck}
            onRefresh={handleRunHealthCheck}
          />

          {/* Run Health Check Button */}
          {!isRunningHealthCheck && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleRunHealthCheck}
                disabled={!user}
                className="px-6 py-3 bg-[#5F209B] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Run Health Check
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}