import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useHealthCheck } from '@/contexts/HealthCheckContext'
import { supabase } from '@/integrations/supabase/client'
import AppShell from '@/components/layout/AppShell'
import EnhancedSidebar from '@/components/layout/EnhancedSidebar'
import { WinsCard } from '@/components/dashboard/WinsCard'
import { TopActionsCard } from '@/components/dashboard/TopActionsCard'
import { ImprovementsCard } from '@/components/dashboard/ImprovementsCard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useNavigate } from 'react-router-dom'
import { Activity, ArrowRight, TrendingUp, Target, Sparkles } from 'lucide-react'

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
    improvements: []
  })
  const [isLoading, setIsLoading] = useState(true)

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
        // Try to get website URL from latest generated prompts
        const { data: latestGenerated } = await supabase
          .from('generated_prompts')
          .select('website_url, company_data')
          .eq('user_id', user.id)
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const websiteUrl = latestGenerated?.website_url || 'https://example.com'
        
        const { data: newProject, error } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            name: 'My Website Project',
            site_url: websiteUrl,
            cms_provider: 'manual',
            site_script_status: 'missing',
            autopilot_enabled: false,
            autopilot_scopes: []
          })
          .select()
          .single()

        if (error) throw error
        project = newProject
      }

      if (!project) {
        throw new Error('Could not create or load project')
      }

      // Load wins and actions in parallel using Supabase edge functions
      const [winsResult, actionsResult] = await Promise.all([
        supabase.functions.invoke('get-wins', {
          body: { projectId: project.id, limit: 8 }
        }),
        supabase.functions.invoke('get-recommendations', {
          body: { projectId: project.id, limit: 3 }
        })
      ])

      const wins = winsResult.data?.wins || []
      const actionsData = { recommendations: actionsResult.data?.recommendations || [] }

      setData({
        project,
        wins: wins.wins || [],
        actions: actionsData.recommendations || [],
        improvements: [] // Initialize as empty array until health check runs
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


  const updateDashboardWithHealthCheckResults = async () => {
    try {
      // Convert health check results to dashboard format
      const wins: any[] = []
      const improvements: any[] = []
      
      // Get company data for URLs from generated_prompts (URL-only workflow) or companies (legacy)
      const { data: companies } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user?.id)
        .limit(1)
      
      const { data: latestGenerated } = await supabase
        .from('generated_prompts')
        .select('website_url, company_data')
        .eq('user_id', user?.id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      const companyData = companies?.[0]
      const websiteUrl = latestGenerated?.website_url || companyData?.website_url || 'example.com'

      healthCheckResults.forEach((result, i) => {
        // If mentioned, add to wins
        if (result.company_mentioned && result.mention_position) {
          wins.push({
            id: `win-${i}`,
            prompt: result.prompt_text,
            rank: result.mention_position,
            url: websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`,
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

      // Update dashboard data with health check results (always latest session via context)
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
      const result = await runHealthCheck()
      toast({
        title: 'Health Check Complete',
        description: `Found ${(result && 'mentionRate' in result ? result.mentionRate : mentionRate)}% visibility rate with score of ${(result && 'visibilityScore' in result ? result.visibilityScore : visibilityScore)}`
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
    <div className="min-h-screen bg-[#ece7e0]">
      {/* Include sidebar directly */}
      <EnhancedSidebar />
      
      <div className="fixed inset-0 bg-[#ece7e0] lg:pl-[12.5rem]">
        <div className="h-full flex flex-col">
          {/* Header - Fixed height */}
          <div className="flex-shrink-0 px-6 pt-6 pb-4">
            <h1 className="font-corben text-[#282823] text-3xl mb-1" style={{fontWeight: 400}}>Dashboard</h1>
            <p className="text-[12px] text-[#3d3d38]">Your AI visibility at a glance</p>
          </div>

          {/* Health Check Loading State - Fixed height when active */}
          {isRunningHealthCheck && (
            <div className="flex-shrink-0 px-6 pb-4">
              <Card className="bg-white border-[#e7e5df] shadow-sm">
                <CardContent className="py-8">
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-[#ddff89] border-t-[#282823] rounded-full animate-spin mx-auto"></div>
                    <div>
                      <h3 className="font-corben text-[#282823] text-xl mb-1" style={{fontWeight: 400}}>
                        Running Health Check...
                      </h3>
                      <p className="text-sm text-[#3d3d38]">
                        Testing prompt {healthCheckProgress.current} of {healthCheckProgress.total}
                      </p>
                    </div>
                    
                    {currentTestPrompt && (
                      <div className="bg-[#f5f5f2] rounded-lg px-4 py-3 max-w-2xl mx-auto">
                        <p className="text-xs text-[#3d3d38] truncate">
                          "{currentTestPrompt}"
                        </p>
                      </div>
                    )}
                    
                    <div className="w-full max-w-md mx-auto">
                      <div className="w-full bg-[#e7e5df] rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-[#ddff89] h-full rounded-full transition-all duration-500 ease-out" 
                          style={{ width: `${(healthCheckProgress.current / healthCheckProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main dashboard grid - Fill remaining space, aligned with sidebar bottom */}
          <div className="flex-1 px-6 pb-6 min-h-0">
            <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Wins Card */}
              <Card className="bg-[#DDFB78] border-[#e7e5df] shadow-sm hover:shadow-md transition-shadow h-full overflow-hidden">
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-corben text-[#282823] text-sm" style={{fontWeight: 400}}>Where you're winning</h3>
                    </div>
                    <p className="text-[11px] text-[#3d3d38] mb-3">Install the site script to enable automatic fixes</p>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center">
                    {(!data.wins || data.wins.length === 0) ? (
                      <p className="text-[11px] text-[#3d3d38] text-center">
                        No results yet. Run a report to get started.
                      </p>
                    ) : (
                      <WinsCard
                        wins={data.wins}
                        isLoading={isLoading || isRunningHealthCheck}
                        onRefresh={handleRunHealthCheck}
                        embedded
                      />
                    )}
                  </div>
                  <div className="flex-shrink-0 mt-3">
                    <span 
                      onClick={() => navigate('/analytics?tab=results')}
                      className="text-[12px] text-[#3d3d38] hover:underline cursor-pointer"
                    >
                      View Details
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Actions Card */}
              <Card className="bg-white border-[#e7e5df] shadow-sm hover:shadow-md transition-shadow h-full overflow-hidden">
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-corben text-[#282823] text-sm" style={{fontWeight: 400}}>Next 30 days</h3>
                    </div>
                    <p className="text-[11px] text-[#3d3d38] mb-3">Non-automatable, high-leverage actions</p>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center">
                    {(!data.actions || data.actions.length === 0) ? (
                      <p className="text-[11px] text-[#3d3d38] text-center">
                        No results yet. Run a report to get started.
                      </p>
                    ) : (
                      <TopActionsCard
                        actions={data.actions}
                        isLoading={isLoading || isRunningHealthCheck}
                        onActionClick={handleActionClick}
                        embedded
                      />
                    )}
                  </div>
                  <div className="flex-shrink-0 mt-3">
                    <span 
                      onClick={() => navigate('/analytics?tab=results')}
                      className="text-[12px] text-[#3d3d38] hover:underline cursor-pointer"
                    >
                      View Details
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Improvements Card */}
              <Card className="bg-white border-[#e7e5df] shadow-sm hover:shadow-md transition-shadow h-full overflow-hidden">
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-corben text-[#282823] text-sm" style={{fontWeight: 400}}>Areas to improve</h3>
                    </div>
                    <p className="text-[11px] text-[#3d3d38] mb-3">Non-automatable, high-leverage actions</p>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center">
                    {(!data.improvements || data.improvements.length === 0) ? (
                      <p className="text-[11px] text-[#3d3d38] text-center">
                        No results yet. Run a report to get started.
                      </p>
                    ) : (
                      <ImprovementsCard
                        improvements={data.improvements}
                        isLoading={isLoading || isRunningHealthCheck}
                        onRefresh={handleRunHealthCheck}
                        embedded
                      />
                    )}
                  </div>
                  <div className="flex-shrink-0 mt-3">
                    <span 
                      onClick={() => navigate('/analytics?tab=results')}
                      className="text-[12px] text-[#3d3d38] hover:underline cursor-pointer"
                    >
                      View Details
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}