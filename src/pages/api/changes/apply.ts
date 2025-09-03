import { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { z } from 'zod'

const schema = z.object({
  projectId: z.string().uuid(),
  scopes: z.array(z.enum(['meta', 'h1', 'robots', 'sitemap', 'altText', 'internalLinks', 'geoPages'])).optional()
})

// Mock autopilot fixes for demonstration
const mockFixes = [
  {
    scope: 'meta',
    description: 'Optimized meta descriptions',
    pages: ['/', '/about', '/services'],
    count: 3
  },
  {
    scope: 'altText', 
    description: 'Added missing alt text',
    pages: ['/home', '/gallery'],
    count: 12
  },
  {
    scope: 'h1',
    description: 'Fixed duplicate H1 tags',
    pages: ['/contact', '/blog'],
    count: 2
  }
]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createServerSupabaseClient({ req, res })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const body = schema.parse(req.body)
    const { projectId, scopes } = body

    // Verify project and autopilot settings
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()
    
    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    // Check if autopilot is enabled and script is connected
    if (!project.autopilot_enabled) {
      return res.status(403).json({ error: 'Autopilot not enabled' })
    }

    if (project.site_script_status !== 'connected') {
      return res.status(403).json({ 
        error: 'Site script not connected',
        message: 'Install the site script to enable automatic fixes'
      })
    }

    // Use project scopes if no specific scopes provided
    const targetScopes = scopes || (project.autopilot_scopes as string[]) || ['meta', 'h1', 'altText']

    // Rate limiting check (1 job per 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: recentJobs } = await supabase
      .from('change_jobs')
      .select('id')
      .eq('project_id', projectId)
      .gte('created_at', tenMinutesAgo)
      .limit(1)

    if (recentJobs && recentJobs.length > 0) {
      return res.status(429).json({ 
        error: 'Rate limited',
        message: 'Please wait 10 minutes between autopilot runs'
      })
    }

    // Mock applying fixes (in production, this would call the autopilot engine)
    const appliedFixes = mockFixes.filter(fix => targetScopes.includes(fix.scope as any))
    const jobIds = []
    const appliedCount = appliedFixes.reduce((sum, fix) => sum + fix.count, 0)

    // Create change jobs and log entries
    for (const fix of appliedFixes) {
      const jobId = crypto.randomUUID()
      const rollbackToken = crypto.randomUUID()
      
      // Queue the job
      await supabase
        .from('change_jobs')
        .insert({
          id: jobId,
          project_id: projectId,
          scope: fix.scope,
          payload: { 
            description: fix.description, 
            pages: fix.pages,
            count: fix.count 
          },
          status: 'applied',
          applied_at: new Date().toISOString(),
          rollback_token: rollbackToken
        })

      // Log the change
      await supabase
        .from('change_log')
        .insert({
          project_id: projectId,
          scope: fix.scope,
          before: { status: 'needs_fix', pages: fix.pages },
          after: { status: 'fixed', pages: fix.pages, count: fix.count },
          source: 'autopilot',
          applied_by: user.email || user.id,
          rollback_token: rollbackToken
        })

      jobIds.push(jobId)
    }

    console.log(`Applied ${appliedCount} fixes for project ${projectId}`)

    return res.status(200).json({
      appliedCount,
      jobIds,
      fixes: appliedFixes.map(fix => ({
        scope: fix.scope,
        description: fix.description,
        count: fix.count
      }))
    })
  } catch (error) {
    console.error('Apply changes error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
}