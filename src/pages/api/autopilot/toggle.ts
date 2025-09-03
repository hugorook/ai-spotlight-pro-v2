import { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { z } from 'zod'

const schema = z.object({
  projectId: z.string().uuid(),
  enabled: z.boolean(),
  scopes: z.array(z.enum(['meta', 'h1', 'robots', 'sitemap', 'altText', 'internalLinks', 'geoPages'])).optional()
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
    const { projectId, enabled, scopes } = body

    // Verify project ownership
    const { data: existingProject } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()
    
    if (!existingProject) {
      return res.status(404).json({ error: 'Project not found' })
    }

    // Default safe scopes if not provided
    const defaultScopes = ['meta', 'h1', 'altText', 'robots', 'sitemap']
    const finalScopes = scopes || defaultScopes

    // Update project settings
    const { data: project, error: updateError } = await supabase
      .from('projects')
      .update({
        autopilot_enabled: enabled,
        autopilot_scopes: finalScopes,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // If enabling autopilot, perform dry-run validation
    let dryRunResults = null
    if (enabled && existingProject.site_script_status === 'connected') {
      // TODO: Implement dry-run validation to check if fixes can be applied safely
      dryRunResults = {
        canApplyFixes: true,
        potentialFixes: finalScopes.length,
        estimatedChanges: Math.floor(Math.random() * 20) + 5 // Mock estimate
      }
    }

    return res.status(200).json({
      project,
      dryRunResults,
      message: enabled ? 'Autopilot enabled' : 'Autopilot disabled'
    })
  } catch (error) {
    console.error('Autopilot toggle error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
}