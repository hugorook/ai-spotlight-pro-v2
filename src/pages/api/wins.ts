import { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { z } from 'zod'

const schema = z.object({
  projectId: z.string().uuid(),
  limit: z.number().min(1).max(50).optional().default(8)
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
      limit: req.query.limit ? parseInt(req.query.limit as string) : 8
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

    // Get recent wins (last 7 days, fallback to 14 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

    let { data: wins, error } = await supabase
      .from('prompt_results')
      .select('*')
      .eq('project_id', query.projectId)
      .eq('appears', true)
      .gte('last_seen', sevenDaysAgo)
      .order('rank', { ascending: true })
      .limit(query.limit)

    // Fallback to 14 days if no recent wins
    if (!wins || wins.length === 0) {
      const { data: olderWins } = await supabase
        .from('prompt_results')
        .select('*')
        .eq('project_id', query.projectId)
        .eq('appears', true)
        .gte('last_seen', fourteenDaysAgo)
        .order('rank', { ascending: true })
        .limit(query.limit)
      
      wins = olderWins || []
    }

    if (error) {
      throw error
    }

    return res.status(200).json({ 
      wins: wins || [],
      totalCount: wins?.length || 0
    })
  } catch (error) {
    console.error('Wins API error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
}