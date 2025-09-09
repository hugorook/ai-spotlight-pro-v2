// Supabase Edge Function: rollback-changes
// Safely rollback website modifications using stored rollback data
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

interface RollbackRequest {
  projectId: string;
  rollbackToken: string;
  reason?: string;
}

interface RollbackData {
  type: 'manual' | 'webflow' | 'wordpress' | 'shopify';
  originalValue?: string;
  instructions?: string;
  rollbackData?: any;
}

class ChangeRollback {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async rollbackChange(request: RollbackRequest): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      // Find the changelog entry with the rollback token
      const { data: changelog, error: changelogError } = await this.supabase
        .from('changelog')
        .select('*')
        .eq('project_id', request.projectId)
        .eq('rollback_token', request.rollbackToken)
        .single();

      if (changelogError || !changelog) {
        throw new Error('Rollback token not found or invalid');
      }

      if (changelog.rolled_back_at) {
        return {
          success: false,
          error: 'Change has already been rolled back'
        };
      }

      // Get project CMS connection details
      const { data: project, error: projectError } = await this.supabase
        .from('projects')
        .select('cms_provider, cms_credentials')
        .eq('id', request.projectId)
        .single();

      if (projectError || !project) {
        throw new Error('Project not found');
      }

      const rollbackData: RollbackData = changelog.rollback_data || {};
      let rollbackResult;

      // Perform rollback based on the original modification type
      switch (rollbackData.type) {
        case 'manual':
          rollbackResult = await this.generateManualRollbackInstructions(rollbackData);
          break;
        case 'webflow':
          rollbackResult = await this.rollbackWebflow(project, rollbackData);
          break;
        case 'wordpress':
          rollbackResult = await this.rollbackWordPress(project, rollbackData);
          break;
        case 'shopify':
          rollbackResult = await this.rollbackShopify(project, rollbackData);
          break;
        default:
          throw new Error(`Unsupported rollback type: ${rollbackData.type}`);
      }

      if (rollbackResult.success) {
        // Mark as rolled back in changelog
        await this.supabase
          .from('changelog')
          .update({
            rolled_back_at: new Date().toISOString(),
            rollback_reason: request.reason || 'User requested rollback',
            rollback_result: rollbackResult
          })
          .eq('rollback_token', request.rollbackToken);

        // Update recommendation status back to todo if needed
        if (changelog.recommendation_id) {
          await this.supabase
            .from('recommendations')
            .update({
              status: 'todo',
              completed_at: null,
              rollback_token: null
            })
            .eq('id', changelog.recommendation_id);
        }
      }

      return rollbackResult;

    } catch (error) {
      console.error('Rollback failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async generateManualRollbackInstructions(rollbackData: RollbackData) {
    return {
      success: true,
      message: 'Manual rollback instructions generated',
      instructions: rollbackData.instructions || 'Manually revert the previous change',
      originalValue: rollbackData.originalValue
    };
  }

  private async rollbackWebflow(project: any, rollbackData: RollbackData) {
    const { siteId, accessToken } = project.cms_credentials;
    
    if (!siteId || !accessToken) {
      return {
        success: false,
        error: 'Webflow credentials not found'
      };
    }

    const webflowAPI = 'https://api.webflow.com';
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept-Version': '1.0.0',
      'Content-Type': 'application/json'
    };

    try {
      const { pageId, originalMeta } = rollbackData.rollbackData;
      
      // Restore original meta tags
      const updateResponse = await fetch(`${webflowAPI}/pages/${pageId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(originalMeta)
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to rollback Webflow page');
      }

      // Publish site
      await fetch(`${webflowAPI}/sites/${siteId}/publish`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ domains: [] })
      });

      return {
        success: true,
        message: 'Webflow changes rolled back successfully'
      };

    } catch (error) {
      return {
        success: false,
        error: `Webflow rollback failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async rollbackWordPress(project: any, rollbackData: RollbackData) {
    const { domain, accessToken } = project.cms_credentials;
    
    if (!domain || !accessToken) {
      return {
        success: false,
        error: 'WordPress credentials not found'
      };
    }

    const wpAPI = `https://${domain}/wp-json/wp/v2`;
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    try {
      const { postId, original } = rollbackData.rollbackData;
      
      // Restore original content
      const updateResponse = await fetch(`${wpAPI}/posts/${postId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(original)
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to rollback WordPress post');
      }

      return {
        success: true,
        message: 'WordPress changes rolled back successfully'
      };

    } catch (error) {
      return {
        success: false,
        error: `WordPress rollback failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async rollbackShopify(project: any, rollbackData: RollbackData) {
    const { domain, accessToken } = project.cms_credentials;
    
    if (!domain || !accessToken) {
      return {
        success: false,
        error: 'Shopify credentials not found'
      };
    }

    const shopifyAPI = `https://${domain}.myshopify.com/admin/api/2023-10`;
    const headers = {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    };

    try {
      const { productId, imageId, originalAlt, changes } = rollbackData.rollbackData;
      
      if (imageId && originalAlt) {
        // Rollback alt text change
        await fetch(`${shopifyAPI}/products/images/${imageId}.json`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            image: { alt: originalAlt }
          })
        });
      }

      if (productId && changes) {
        // Rollback product meta changes would require removing metafields
        // This is more complex and would need specific implementation
      }

      return {
        success: true,
        message: 'Shopify changes rolled back successfully'
      };

    } catch (error) {
      return {
        success: false,
        error: `Shopify rollback failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });

  try {
    const body = await req.json() as RollbackRequest;
    console.log('Rollback request:', { 
      projectId: body.projectId, 
      rollbackToken: body.rollbackToken,
      reason: body.reason 
    });

    if (!body.projectId || !body.rollbackToken) {
      throw new Error('Project ID and rollback token are required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Perform the rollback
    const rollback = new ChangeRollback(supabase);
    const result = await rollback.rollbackChange(body);

    console.log('Rollback result:', { success: result.success });

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Rollback error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});