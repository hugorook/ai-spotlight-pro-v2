import { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { z } from 'zod'

const schema = z.object({
  projectId: z.string().uuid(),
  limit: z.number().min(1).max(100).optional().default(50)
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createServerSupabaseClient({ req, res })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const query = schema.parse({
      projectId: req.query.projectId,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50
    })

    // Verify project ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', query.projectId)
      .eq('user_id', user.id)
      .single()
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    // Get recent changes with rollback capability
    const { data: changelog, error } = await supabase
      .from('change_log')
      .select('*')
      .eq('project_id', query.projectId)
      .order('applied_at', { ascending: false })
      .limit(query.limit)

    if (error) {
      throw error
    }

    // Format for frontend consumption
    const formattedChangelog = (changelog || []).map(change => ({
      id: change.id,
      scope: change.scope,
      description: getChangeDescription(change),
      appliedAt: change.applied_at,
      appliedBy: change.applied_by,
      canRollback: !!change.rollback_token,
      rollbackToken: change.rollback_token,
      diff: {
        before: change.before,
        after: change.after
      }
    }))

    return res.status(200).json({
      changelog: formattedChangelog,
      totalCount: changelog?.length || 0
    })
  } catch (error) {
    console.error('Changelog API error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// Helper function to generate human-readable descriptions
function getChangeDescription(change: any): string {
  const { scope, after } = change
  
  switch (scope) {
    case 'meta':
      return `Optimized meta descriptions (${after.count || 'multiple'} pages)`
    case 'h1':
      return `Fixed duplicate H1 tags (${after.count || 'multiple'} pages)`
    case 'altText':
      return `Added missing alt text (${after.count || 'multiple'} images)`
    case 'robots':
      return 'Updated robots.txt configuration'
    case 'sitemap':
      return 'Generated/updated XML sitemap'
    case 'internalLinks':
      return `Added contextual internal links (${after.count || 'multiple'} pages)`
    case 'geoPages':
      return `Created location-specific pages (${after.count || 'multiple'} pages)`
    default:
      return `Applied ${scope} fixes`
  }
}