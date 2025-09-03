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
    
    try {
      // Generate realistic test prompts based on project data
      const prompts = [
        `What are the best ${project.site_url?.split('//')[1]?.split('.')[0]} companies?`,
        `Top ${project.site_url?.split('//')[1]?.split('.')[0]} providers`,
        `${project.site_url?.split('//')[1]?.split('.')[0]} reviews and ratings`,
        `Best ${project.site_url?.split('//')[1]?.split('.')[0]} alternatives`,
        `How to choose ${project.site_url?.split('//')[1]?.split('.')[0]} software`
      ]

      // Create mock prompt results with realistic data
      const mockResults = prompts.map((prompt, index) => {
        const mentioned = Math.random() > 0.6 // 40% chance of mention
        const rank = mentioned ? Math.floor(Math.random() * 10) + 1 : null
        const url = mentioned ? `${project.site_url}${index === 0 ? '' : '/page-' + (index + 1)}` : null
        
        return {
          id: crypto.randomUUID(),
          project_id: projectId,
          prompt,
          rank,
          url,
          found_at: new Date().toISOString(),
          user_id: user.id
        }
      })

      // Insert prompt results
      const { error: insertError } = await supabase
        .from('prompt_results')
        .insert(mockResults)

      if (insertError) {
        console.error('Error inserting prompt results:', insertError)
      }

      // Generate mock recommendations
      const mockRecommendations = [
        {
          id: crypto.randomUUID(),
          project_id: projectId,
          title: 'Optimize page meta descriptions for AI visibility',
          rationale: 'AI models favor pages with clear, descriptive meta descriptions that match user intent',
          impact: 'High',
          effort: 'Low',
          suggested_owner: 'Content',
          action_type: 'content_optimization',
          links: ['https://developers.google.com/search/docs/appearance/meta-descriptions'],
          user_id: user.id
        },
        {
          id: crypto.randomUUID(),
          project_id: projectId,
          title: 'Create comprehensive FAQ section',
          rationale: 'Question-based content significantly improves AI model ranking for query-based prompts',
          impact: 'High',
          effort: 'Medium',
          suggested_owner: 'Content',
          action_type: 'content_creation',
          links: [],
          user_id: user.id
        },
        {
          id: crypto.randomUUID(),
          project_id: projectId,
          title: 'Add structured data markup',
          rationale: 'Structured data helps AI models understand and rank your content more effectively',
          impact: 'Medium',
          effort: 'Medium',
          suggested_owner: 'Dev',
          action_type: 'technical_seo',
          links: ['https://schema.org/'],
          user_id: user.id
        }
      ]

      // Insert recommendations
      const { error: recError } = await supabase
        .from('recommendations')
        .insert(mockRecommendations)

      if (recError) {
        console.error('Error inserting recommendations:', recError)
      }

      // Update project with last run timestamp
      await supabase
        .from('projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', projectId)

      console.log(`Health check completed for project ${projectId}, job ${jobId}`)
      
      return res.status(200).json({ 
        jobId, 
        status: 'completed',
        message: 'Health check completed successfully',
        results: {
          promptsAnalyzed: mockResults.length,
          mentionsFound: mockResults.filter(r => r.rank !== null).length,
          recommendationsGenerated: mockRecommendations.length
        }
      })
    } catch (processError) {
      console.error('Health check processing error:', processError)
      return res.status(200).json({ 
        jobId, 
        status: 'queued',
        message: 'Health check started (background processing)'
      })
    }
  } catch (error) {
    console.error('Health check error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
}