// Supabase Edge Function: report-issues
// Receives issue reports from the website tracker script
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

interface IssueReport {
  projectId: string;
  pageUrl: string;
  issues: Array<{
    category: 'meta' | 'h1' | 'altText' | 'internalLinks' | 'performance' | 'mobile' | 'structured_data';
    type: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    url: string;
    timestamp: string;
    element?: any;
  }>;
  pageData: {
    url: string;
    title: string;
    timestamp: string;
    userAgent: string;
    viewport: {
      width: number;
      height: number;
    };
  };
  trackerVersion: string;
}

interface ProcessedRecommendation {
  project_id: string;
  action_type: string;
  title: string;
  description: string;
  target_page: string;
  target_element?: string;
  current_value: string;
  suggested_value: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  status: 'todo';
  source: 'tracker';
  metadata: any;
}

class IssueProcessor {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async processIssueReport(report: IssueReport): Promise<{
    success: boolean;
    processedCount: number;
    recommendationsCreated: number;
    error?: string;
  }> {
    try {
      // Verify project exists and autopilot is enabled
      const { data: project, error: projectError } = await this.supabase
        .from('projects')
        .select('id, autopilot_enabled, autopilot_scopes')
        .eq('id', report.projectId)
        .single();

      if (projectError || !project) {
        throw new Error('Project not found or invalid');
      }

      if (!project.autopilot_enabled) {
        // Still process issues but don't create recommendations
        console.log('Autopilot disabled, issues logged but no recommendations created');
        await this.logIssues(report);
        return {
          success: true,
          processedCount: report.issues.length,
          recommendationsCreated: 0
        };
      }

      // Filter issues by autopilot scopes
      const allowedScopes = project.autopilot_scopes || [];
      const relevantIssues = report.issues.filter(issue => 
        allowedScopes.includes(this.mapCategoryToScope(issue.category))
      );

      console.log(`Processing ${relevantIssues.length} issues (${report.issues.length} total, filtered by scopes)`);

      // Convert issues to recommendations
      const recommendations: ProcessedRecommendation[] = [];
      
      for (const issue of relevantIssues) {
        const recommendation = await this.convertIssueToRecommendation(issue, report);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }

      // Remove duplicates and merge similar recommendations
      const uniqueRecommendations = this.deduplicateRecommendations(recommendations);

      // Save recommendations to database
      let savedCount = 0;
      for (const rec of uniqueRecommendations) {
        try {
          const { error: insertError } = await this.supabase
            .from('recommendations')
            .insert(rec);

          if (!insertError) {
            savedCount++;
          } else {
            console.warn('Failed to save recommendation:', rec.title, insertError.message);
          }
        } catch (error) {
          console.warn('Error saving recommendation:', error);
        }
      }

      // Log all issues for tracking
      await this.logIssues(report);

      return {
        success: true,
        processedCount: report.issues.length,
        recommendationsCreated: savedCount
      };

    } catch (error) {
      console.error('Issue processing failed:', error);
      return {
        success: false,
        processedCount: 0,
        recommendationsCreated: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private mapCategoryToScope(category: string): string {
    const mapping: Record<string, string> = {
      'meta': 'meta',
      'h1': 'h1',
      'altText': 'altText',
      'internalLinks': 'internalLinks',
      'performance': 'meta', // Performance issues might be handled via meta optimizations
      'mobile': 'meta',
      'structured_data': 'meta'
    };
    
    return mapping[category] || category;
  }

  private async convertIssueToRecommendation(issue: any, report: IssueReport): Promise<ProcessedRecommendation | null> {
    try {
      const baseRecommendation = {
        project_id: report.projectId,
        target_page: report.pageUrl,
        impact: issue.priority as 'high' | 'medium' | 'low',
        effort: this.calculateEffort(issue) as 'low' | 'medium' | 'high',
        status: 'todo' as const,
        source: 'tracker' as const,
        metadata: {
          trackerVersion: report.trackerVersion,
          detectedAt: issue.timestamp,
          pageData: report.pageData
        }
      };

      switch (issue.category) {
        case 'meta':
          return this.createMetaRecommendation(issue, baseRecommendation, report);
        
        case 'h1':
          return this.createH1Recommendation(issue, baseRecommendation, report);
        
        case 'altText':
          return this.createAltTextRecommendation(issue, baseRecommendation, report);
        
        case 'internalLinks':
          return this.createInternalLinksRecommendation(issue, baseRecommendation, report);
        
        default:
          return null;
      }
    } catch (error) {
      console.warn('Failed to convert issue to recommendation:', error);
      return null;
    }
  }

  private createMetaRecommendation(issue: any, base: any, report: IssueReport): ProcessedRecommendation {
    let title, description, suggestedValue, currentValue;

    switch (issue.type) {
      case 'missing_title':
        title = 'Add missing page title';
        description = 'Create an SEO-optimized title tag for this page';
        currentValue = '';
        suggestedValue = this.generateTitleSuggestion(report.pageData);
        break;

      case 'short_title':
        title = 'Optimize short page title';
        description = 'Expand the page title to improve SEO performance';
        currentValue = report.pageData.title;
        suggestedValue = this.generateTitleSuggestion(report.pageData, report.pageData.title);
        break;

      case 'missing_description':
        title = 'Add missing meta description';
        description = 'Create an engaging meta description for this page';
        currentValue = '';
        suggestedValue = this.generateDescriptionSuggestion(report.pageData);
        break;

      default:
        title = `Fix: ${issue.description}`;
        description = issue.description;
        currentValue = '';
        suggestedValue = 'Auto-generated fix';
    }

    return {
      ...base,
      action_type: 'meta',
      title,
      description,
      current_value: currentValue,
      suggested_value: suggestedValue
    };
  }

  private createH1Recommendation(issue: any, base: any, report: IssueReport): ProcessedRecommendation {
    let title, description, suggestedValue;

    switch (issue.type) {
      case 'missing_h1':
        title = 'Add missing H1 tag';
        description = 'Add a primary heading to improve page structure';
        suggestedValue = this.generateH1Suggestion(report.pageData);
        break;

      case 'multiple_h1':
        title = 'Fix multiple H1 tags';
        description = 'Consolidate multiple H1 tags into a single primary heading';
        suggestedValue = 'Convert additional H1s to H2s';
        break;

      default:
        title = `Fix: ${issue.description}`;
        description = issue.description;
        suggestedValue = 'Fix heading structure';
    }

    return {
      ...base,
      action_type: 'h1',
      title,
      description,
      current_value: '',
      suggested_value: suggestedValue
    };
  }

  private createAltTextRecommendation(issue: any, base: any, report: IssueReport): ProcessedRecommendation {
    return {
      ...base,
      action_type: 'altText',
      title: 'Add missing image alt text',
      description: issue.description,
      target_element: issue.description.includes('Image') ? 
        issue.description.split(': ')[1] : undefined,
      current_value: '',
      suggested_value: 'Descriptive alt text based on image content'
    };
  }

  private createInternalLinksRecommendation(issue: any, base: any, report: IssueReport): ProcessedRecommendation {
    return {
      ...base,
      action_type: 'internalLinks',
      title: 'Improve internal linking',
      description: issue.description,
      current_value: '',
      suggested_value: 'Add contextual internal links'
    };
  }

  private calculateEffort(issue: any): string {
    // Effort estimation based on issue type
    const highEffort = ['broken_hierarchy', 'insufficient_internal_links'];
    const mediumEffort = ['multiple_h1', 'long_title', 'long_description'];
    
    if (highEffort.includes(issue.type)) return 'high';
    if (mediumEffort.includes(issue.type)) return 'medium';
    return 'low';
  }

  private generateTitleSuggestion(pageData: any, currentTitle?: string): string {
    // Simple title generation logic
    const url = new URL(pageData.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    if (currentTitle && currentTitle.length > 0) {
      return `${currentTitle} | Enhanced SEO Title`;
    }
    
    if (pathSegments.length === 0) {
      return 'Home | Your Website Name';
    }
    
    const lastSegment = pathSegments[pathSegments.length - 1];
    const titleWords = lastSegment.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return `${titleWords} | Your Website Name`;
  }

  private generateDescriptionSuggestion(pageData: any): string {
    return `Discover more about ${pageData.title || 'this page'} and how it can benefit you. Learn more about our services and solutions.`;
  }

  private generateH1Suggestion(pageData: any): string {
    return pageData.title || 'Welcome to Our Website';
  }

  private deduplicateRecommendations(recommendations: ProcessedRecommendation[]): ProcessedRecommendation[] {
    const unique = new Map<string, ProcessedRecommendation>();
    
    recommendations.forEach(rec => {
      const key = `${rec.action_type}-${rec.target_page}-${rec.title}`;
      if (!unique.has(key) || unique.get(key)!.impact === 'low') {
        unique.set(key, rec);
      }
    });
    
    return Array.from(unique.values());
  }

  private async logIssues(report: IssueReport): Promise<void> {
    try {
      // Log issues for tracking purposes
      const logEntry = {
        project_id: report.projectId,
        page_url: report.pageUrl,
        issues_detected: report.issues.length,
        issue_categories: [...new Set(report.issues.map(i => i.category))],
        tracker_version: report.trackerVersion,
        detected_at: new Date().toISOString(),
        page_data: report.pageData
      };

      await this.supabase
        .from('tracker_logs')
        .insert(logEntry);

    } catch (error) {
      console.warn('Failed to log issues:', error);
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
    const report = await req.json() as IssueReport;
    console.log('Issue report received:', { 
      projectId: report.projectId, 
      issueCount: report.issues.length,
      pageUrl: report.pageUrl
    });

    if (!report.projectId || !report.issues || !Array.isArray(report.issues)) {
      throw new Error('Invalid report format');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Process the issue report
    const processor = new IssueProcessor(supabase);
    const result = await processor.processIssueReport(report);

    console.log('Issue processing result:', result);

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Report processing error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({
      success: false,
      processedCount: 0,
      recommendationsCreated: 0,
      error: errorMessage
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});