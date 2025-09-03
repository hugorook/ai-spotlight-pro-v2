import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import AppShell from '@/components/layout/AppShell'
import { AutopilotCard } from '@/components/dashboard/AutopilotCard'
import { WinsCard } from '@/components/dashboard/WinsCard'
import { TopActionsCard } from '@/components/dashboard/TopActionsCard'
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
    if (!data.project) return

    try {
      const response = await fetch('/api/health-check/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: data.project.id })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      toast({
        title: 'Success',
        description: 'Health check started'
      })

      // Refresh wins data after a delay
      setTimeout(() => {
        loadDashboardData()
      }, 2000)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to run health check',
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
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Compact Header - no center alignment */}
        <div className="mb-6">
          <h1 className="h1 mb-1">Dashboard</h1>
          <p className="body text-gray-600">Your AI visibility at a glance</p>
        </div>

        {/* Mobile: Single column, Desktop: Autopilot full-width top, Wins + Top 3 in 2-col grid */}
        <div className="space-y-4">
          {/* Autopilot Card - Full width */}
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

          {/* Wins + Top 3 Grid - 2 columns on md+ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <WinsCard
              wins={data.wins}
              isLoading={isLoading}
              onRefresh={handleRunHealthCheck}
            />

            <TopActionsCard
              actions={data.actions}
              isLoading={isLoading}
              onActionClick={handleActionClick}
            />
          </div>
        </div>
      </div>
    </AppShell>
  )
}