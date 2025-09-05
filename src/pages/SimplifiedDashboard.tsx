import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useHealthCheck } from '@/contexts/HealthCheckContext'
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
  const { 
    isRunning: isRunningHealthCheck,
    progress: healthCheckProgress,
    currentPrompt: currentTestPrompt,
    results: healthCheckResults,
    visibilityScore,
    mentionRate,
    averagePosition,
    runHealthCheck,
    loadSavedResults
  } = useHealthCheck()
  
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

  // Load dashboard data
  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  // Update dashboard data when health check results change
  useEffect(() => {
    if (healthCheckResults.length > 0) {
      updateDashboardWithHealthCheckResults()
    }
  }, [healthCheckResults])

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

      // Load wins, actions, and recent changes in parallel using Supabase edge functions
      const [winsResult, actionsResult, changelogResult] = await Promise.all([
        supabase.functions.invoke('get-wins', {
          body: { projectId: project.id, limit: 8 }
        }),
        supabase.functions.invoke('get-recommendations', {
          body: { projectId: project.id, limit: 3 }
        }),
        supabase.functions.invoke('get-changelog', {
          body: { projectId: project.id, limit: 10 }
        })
      ])

      const wins = winsResult.data?.wins || []
      const actionsData = { recommendations: actionsResult.data?.recommendations || [] }
      const changelog = { changelog: changelogResult.data?.changelog || [] }

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
      
      const { data: result, error } = await supabase.functions.invoke('apply-changes', {
        body: { projectId: data.project.id }
      })

      if (error) {
        throw new Error(error.message || 'Failed to apply fixes')
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
      const { data: result, error } = await supabase.functions.invoke('toggle-autopilot', {
        body: {
          projectId: data.project.id,
          enabled: !data.project.autopilot_enabled
        }
      })

      if (error) throw new Error(error.message || 'Failed to toggle autopilot')

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

  const updateDashboardWithHealthCheckResults = async () => {
    try {
      // Convert health check results to dashboard format
      const wins: any[] = []
      const improvements: any[] = []
      
      // Get company data for URLs
      const { data: companies } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user?.id)
        .limit(1)
      
      const companyData = companies?.[0]

      healthCheckResults.forEach((result, i) => {
        // If mentioned, add to wins
        if (result.company_mentioned && result.mention_position) {
          wins.push({
            id: `win-${i}`,
            prompt: result.prompt_text,
            rank: result.mention_position,
            url: `https://${companyData?.website_url || 'example.com'}`,
            lastSeen: result.test_date
          })
        } else if (!result.company_mentioned) {
          // If not mentioned, add to improvements
          improvements.push({
            id: `improve-${i}`,
            prompt: result.prompt_text,
            reason: result.mention_context || 'Company not mentioned in AI response',
            priority: i < 5 ? 'High' : i < 10 ? 'Medium' : 'Low',
            lastChecked: result.test_date
          })
        }
      })

      // Generate actions from failed prompts
      const failedResults = healthCheckResults.filter(r => !r.company_mentioned)
      const actions: any[] = []

      if (failedResults.length > 0) {
        // Create actionable recommendations from failed prompts
        const topFailures = failedResults.slice(0, 6) // Use top 6 failures to create 3 actions
        
        for (let i = 0; i < Math.min(3, Math.ceil(topFailures.length / 2)); i++) {
          const relevantPrompts = topFailures.slice(i * 2, (i + 1) * 2)
          actions.push({
            id: `action-${i}`,
            title: `Create content targeting "${relevantPrompts[0]?.prompt_text.split(' ').slice(0, 4).join(' ')}..." queries`,
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

      // Update dashboard data with health check results
      setData(prev => ({
        ...prev,
        wins: wins.sort((a, b) => a.rank - b.rank), // Sort by rank
        actions,
        improvements: improvements.slice(0, 8) // Show top 8 improvements
      }))

    } catch (error) {
      console.error('Error updating dashboard with health check results:', error)
    }
  }

  const handleRunHealthCheck = async () => {
    try {
      await runHealthCheck()
      toast({
        title: 'Health Check Complete',
        description: `Found ${mentionRate}% visibility rate with score of ${visibilityScore}`
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
                  style={{ width: `${healthCheckProgress}%` }}
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