import { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { z } from 'zod'

const schema = z.object({
  projectId: z.string().uuid()
})

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
    const { projectId } = body

    // Verify user owns project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()
    
    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    // Generate job ID for tracking
    const jobId = crypto.randomUUID()
    
    // TODO: Queue background jobs to:
    // 1. Run existing health check logic from CleanGeoPage
    // 2. Update prompt_results table with current wins
    // 3. Generate fresh recommendations
    // 4. Update last health check timestamp
    
    // For now, return success with job ID
    console.log(`Health check queued for project ${projectId}, job ${jobId}`)
    
    return res.status(200).json({ 
      jobId, 
      status: 'queued',
      message: 'Health check started'
    })
  } catch (error) {
    console.error('Health check error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
}