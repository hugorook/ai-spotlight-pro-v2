import { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { z } from 'zod'

const schema = z.object({
  projectId: z.string().uuid(),
  limit: z.number().min(1).max(10).optional().default(3)
})

// Default recommendations to ensure we always have exactly 3
const defaultRecommendations = [
  {
    title: 'Create location-specific content',
    rationale: 'Target local search queries to improve geographic visibility',
    impact: 'High' as const,
    effort: 'Medium' as const,
    action_type: 'content_creation',
    suggested_owner: 'Content' as const,
    links: ['https://example.com/local-seo-guide']
  },
  {
    title: 'Engage in industry forums',
    rationale: 'Build authority and discover mention opportunities',
    impact: 'Medium' as const,
    effort: 'Low' as const,
    action_type: 'community_engagement',
    suggested_owner: 'PR' as const,
    links: ['https://reddit.com/r/entrepreneur']
  },
  {
    title: 'Monitor competitor mentions',
    rationale: 'Track where competitors appear to find new opportunities',
    impact: 'Medium' as const,
    effort: 'Low' as const,
    action_type: 'competitive_analysis',
    suggested_owner: 'Content' as const,
    links: []
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
    const { projectId, limit } = body

    // Verify project ownership
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    // Get existing recommendations, prioritizing High impact
    const { data: recommendations, error } = await supabase
      .from('recommendations')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'todo')
      .order('impact', { ascending: false }) // High, Medium, Low
      .order('effort', { ascending: true })  // Low effort first within same impact
      .limit(limit)

    if (error) {
      throw error
    }

    // Ensure exactly 3 recommendations (pad with defaults if needed)
    let finalRecommendations = recommendations || []
    
    // If we have fewer than requested, add defaults
    const needed = limit - finalRecommendations.length
    if (needed > 0) {
      const defaults = defaultRecommendations.slice(0, needed)
      finalRecommendations = [...finalRecommendations, ...defaults]
    }

    // Ensure exactly the requested number
    finalRecommendations = finalRecommendations.slice(0, limit)

    return res.status(200).json({ 
      recommendations: finalRecommendations
    })
  } catch (error) {
    console.error('Top recommendations API error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
}