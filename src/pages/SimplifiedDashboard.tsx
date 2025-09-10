import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useHealthCheck } from '@/contexts/HealthCheckContext'
import { supabase } from '@/integrations/supabase/client'
import AppShell from '@/components/layout/AppShell'
import EnhancedSidebar from '@/components/layout/EnhancedSidebar'
import { WinsCard } from '@/components/dashboard/WinsCard'
import { TopActionsCard } from '@/components/dashboard/TopActionsCard'
import { ImprovementsCard } from '@/components/dashboard/ImprovementsCard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useNavigate } from 'react-router-dom'
import { Activity, ArrowRight, TrendingUp, Target, Sparkles } from 'lucide-react'

// Custom hook for typewriter effect
function useTypewriter(text: string, typingSpeed = 100, startDelay = 500, onComplete?: () => void) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    // Start typing after the initial delay
    timeout = setTimeout(() => {
      if (displayedText.length < text.length) {
        const newLength = displayedText.length + 1;
        setDisplayedText(text.substring(0, newLength));
      } else {
        setIsTyping(false);
        // Trigger callback when typing is complete, with a small delay
        if (onComplete) {
          setTimeout(() => {
            onComplete();
          }, 500); // Half second delay after typing completes
        }
      }
    }, displayedText.length === 0 ? startDelay : typingSpeed);
    
    return () => clearTimeout(timeout);
  }, [displayedText, text, typingSpeed, startDelay, onComplete]);

  return { displayedText, isTyping };
}

// Typewriter text component
function TypewriterText({ text, typingSpeed, startDelay, onComplete }: { text: string; typingSpeed?: number; startDelay?: number; onComplete?: () => void }) {
  const { displayedText, isTyping } = useTypewriter(text, typingSpeed, startDelay, onComplete);
  
  return (
    <span className="relative font-corben" style={{fontWeight: 400}}>
      {displayedText}
      <span 
        className={`inline-block w-[0.1em] h-[1.2em] bg-[#282823] align-middle ml-1 ${isTyping ? 'animate-blink' : 'opacity-0'}`}
      />
    </span>
  );
}

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
  improvements: any[]
}

export default function TodayDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { 
    isRunning: isRunningHealthCheck,
    progress: healthCheckProgress,
    currentPrompt: currentTestPrompt,
    results: healthCheckResults,
    visibilityScore,
    mentionRate,
    averagePosition,
    runHealthCheck,
    loadSavedResults
  } = useHealthCheck()
  
  const [data, setData] = useState<DashboardData>({
    project: null,
    wins: [],
    actions: [],
    improvements: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const [expandedCard, setExpandedCard] = useState<'wins' | 'actions' | 'improvements'>('wins')
  
  // Debug log data changes
  useEffect(() => {
    console.log('🎯 Dashboard data updated:', {
      winsCount: data.wins?.length || 0,
      actionsCount: data.actions?.length || 0, 
      improvementsCount: data.improvements?.length || 0,
      hasProcessed: hasProcessedHealthCheck,
      healthCheckResultsCount: healthCheckResults?.length || 0
    })
  }, [data, hasProcessedHealthCheck, healthCheckResults])
  const [hasProcessedHealthCheck, setHasProcessedHealthCheck] = useState(false)

  // Single effect to handle all data loading consistently
  useEffect(() => {
    if (user) {
      // Load base data first
      loadAllData()
    }
  }, [user])
  
  // Separate effect for loading saved health check results
  useEffect(() => {
    if (user && dataLoaded && !hasProcessedHealthCheck) {
      loadSavedResults()
    }
  }, [user, dataLoaded, hasProcessedHealthCheck])

  // Process health check results whenever they change
  useEffect(() => {
    if (dataLoaded && healthCheckResults.length > 0) {
      console.log('📊 Dashboard processing', healthCheckResults.length, 'health check results')
      updateDashboardWithHealthCheckResults()
      setHasProcessedHealthCheck(true)
    }
  }, [healthCheckResults, dataLoaded])

  const loadAllData = async () => {
    try {
      setIsLoading(true)

      // Get or create user's project
      let { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user?.id)
        .limit(1)

      let project = projects?.[0]

      // Get latest generated data regardless of project status
      const { data: latestGenerated } = await supabase
        .from('generated_prompts')
        .select('website_url, company_data')
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Create default project if none exists
      if (!project && user) {
        const websiteUrl = latestGenerated?.website_url || 'https://example.com'
        
        const { data: newProject, error } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            name: 'My Website Project',
            site_url: websiteUrl,
            cms_provider: 'manual',
            site_script_status: 'missing',
            autopilot_enabled: false,
            autopilot_scopes: []
          })
          .select()
          .single()

        if (error) throw error
        project = newProject
      }

      if (!project) {
        throw new Error('Could not create or load project')
      }

      // Load wins and actions in parallel using Supabase edge functions
      const [winsResult] = await Promise.all([
        supabase.functions.invoke('get-wins', {
          body: { projectId: project.id, limit: 8 }
        })
      ])

      const wins = winsResult.data?.wins || []
      
      // Don't generate any default actions - only show after health check
      const actions = []

      const finalData = {
        project,
        wins: Array.isArray(wins) ? wins : (wins.wins || []),
        actions: [], // Will be populated by health check results
        improvements: [] // Will be populated by health check results
      }
      
      setData(finalData)
      setDataLoaded(true)
    } catch (error) {
      console.error('Error loading dashboard:', error)
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
      // Don't process here - let the health check effect handle it
    }
  }


  const updateDashboardWithHealthCheckResults = async () => {
    if (!dataLoaded) return // Don't update until initial data is loaded
    
    try {
      // Convert health check results to dashboard format
      const wins: any[] = []
      const improvements: any[] = []
      
      // Get company data for URLs from generated_prompts (URL-only workflow) or companies (legacy)
      const { data: companies } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user?.id)
        .limit(1)
      
      const { data: latestGenerated } = await supabase
        .from('generated_prompts')
        .select('website_url, company_data')
        .eq('user_id', user?.id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      const companyData = companies?.[0]
      const websiteUrl = latestGenerated?.website_url || companyData?.website_url || 'example.com'

      healthCheckResults.forEach((result, i) => {
        // If mentioned, add to wins
        if (result.company_mentioned && result.mention_position) {
          wins.push({
            id: `win-${i}`,
            prompt: result.prompt_text,
            rank: result.mention_position,
            url: websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`,
            lastSeen: result.test_date
          })
        } else if (!result.company_mentioned) {
          // If not mentioned, add to improvements
          improvements.push({
            id: `improve-${i}`,
            prompt: result.prompt_text,
            reason: result.mention_context || 'Company not mentioned in AI response',
            priority: i < 5 ? 'High' : i < 10 ? 'Medium' : 'Low',
            lastChecked: result.test_date
          })
        }
      })

      // Generate smart actions from failed prompts
      const failedResults = healthCheckResults.filter(r => !r.company_mentioned)
      const actions: any[] = []

      if (failedResults.length > 0) {
        // Analyze failed prompts to identify patterns
        const promptCategories = {
          comparison: [] as any[],
          features: [] as any[],
          pricing: [] as any[],
          useCases: [] as any[],
          alternatives: [] as any[],
          reviews: [] as any[],
          general: [] as any[]
        }

        // Categorize failed prompts
        failedResults.forEach(result => {
          const prompt = result.prompt_text.toLowerCase()
          if (prompt.includes('compare') || prompt.includes('vs') || prompt.includes('versus') || prompt.includes('better than')) {
            promptCategories.comparison.push(result)
          } else if (prompt.includes('feature') || prompt.includes('capability') || prompt.includes('can it')) {
            promptCategories.features.push(result)
          } else if (prompt.includes('price') || prompt.includes('cost') || prompt.includes('pricing') || prompt.includes('expensive')) {
            promptCategories.pricing.push(result)
          } else if (prompt.includes('use case') || prompt.includes('example') || prompt.includes('how to')) {
            promptCategories.useCases.push(result)
          } else if (prompt.includes('alternative') || prompt.includes('similar') || prompt.includes('like')) {
            promptCategories.alternatives.push(result)
          } else if (prompt.includes('review') || prompt.includes('experience') || prompt.includes('feedback')) {
            promptCategories.reviews.push(result)
          } else {
            promptCategories.general.push(result)
          }
        })

        // Get company info for personalized recommendations
        const companyName = latestGenerated?.company_data?.name || companyData?.name || 'your company'
        const industry = latestGenerated?.company_data?.industry || companyData?.industry || 'your industry'
        const websiteDomain = websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')

        // Generate targeted actions based on analysis
        const smartActions = []

        // Priority 1: Comparison content if any comparison queries failed
        if (promptCategories.comparison.length > 0) {
          const competitorMentions = promptCategories.comparison
            .map(r => {
              const match = r.prompt_text.match(/(?:vs|versus|compare.*to|compared to|better than|alternative to)\s+([\w\s]+?)(?:\?|\.|,|$|\s+for|\s+in)/i)
              return match?.[1]?.trim()
            })
            .filter(Boolean)
          
          const uniqueCompetitors = [...new Set(competitorMentions)]
          const topCompetitors = uniqueCompetitors.slice(0, 3)
          
          if (topCompetitors.length > 0) {
            smartActions.push({
              id: 'action-comp-pages',
              title: `Create individual comparison pages for: ${topCompetitors.map(c => `"${companyName} vs ${c}"`).join(', ')}`,
              rationale: `${promptCategories.comparison.length} queries directly asked about these competitors. Each page needs: feature-by-feature comparison table, pricing breakdown, use case recommendations, migration guides, and honest pros/cons.`,
              impact: 'High',
              effort: 'Medium',
              suggestedOwner: 'Content',
              actionType: 'content-creation'
            })
          }
          
          smartActions.push({
            id: 'action-comp-hub',
            title: `Build "Compare ${companyName}" interactive tool with side-by-side comparisons`,
            rationale: `Create an interactive comparison tool where users can select 2-3 competitors and see real-time comparisons. Include filters for company size, use case, and budget. This becomes the go-to resource AI references.`,
            impact: 'High',
            effort: 'High',
            suggestedOwner: 'Dev',
            actionType: 'interactive-content'
          })
        }

        // Priority 2: Pricing transparency if pricing queries failed
        if (promptCategories.pricing.length > 0) {
          smartActions.push({
            id: 'action-pricing',
            title: `Publish transparent pricing page with calculator and ROI examples`,
            rationale: `${promptCategories.pricing.length} pricing-related queries failed. AI models need clear pricing data. Include pricing tiers, feature breakdowns, ROI calculator, and case studies showing value at each price point.`,
            impact: 'High',
            effort: 'Low',
            suggestedOwner: 'Content',
            actionType: 'content-creation'
          })
        }

        // Priority 3: Use case content if how-to queries failed
        if (promptCategories.useCases.length > 0) {
          const specificUseCases = promptCategories.useCases
            .map(r => {
              const match = r.prompt_text.match(/(?:how to|how do I|how can I|example of|use.*for|using.*to)\s+(.+?)(?:\?|\.|with|$)/i)
              return match?.[1]?.trim()
            })
            .filter(Boolean)
          
          const uniqueUseCases = [...new Set(specificUseCases)]
          
          if (uniqueUseCases.length > 0) {
            uniqueUseCases.slice(0, 3).forEach((useCase, idx) => {
              smartActions.push({
                id: `action-usecase-${idx}`,
                title: `Create step-by-step guide: "How to ${useCase} with ${companyName}"`,
                rationale: `This specific use case appeared in failed queries. Build a 2000+ word guide with: video walkthrough, screenshots at each step, expected timeline, common pitfalls, and ROI calculator.`,
                impact: 'High',
                effort: 'Low',
                suggestedOwner: 'Content',
                actionType: 'tutorial'
              })
            })
          }
          
          smartActions.push({
            id: 'action-usecase-templates',
            title: `Publish 10 ready-to-use templates for common ${industry} workflows`,
            rationale: `${promptCategories.useCases.length} how-to queries failed. Create downloadable templates, automation recipes, and pre-built configurations. Each template should save users 2+ hours of setup time.`,
            impact: 'Medium',
            effort: 'Medium',
            suggestedOwner: 'Content',
            actionType: 'resources'
          })
        }

        // Priority 4: Feature documentation if capability queries failed
        if (promptCategories.features.length > 1) {
          smartActions.push({
            id: 'action-features',
            title: `Create comprehensive feature documentation with API references and integrations`,
            rationale: `${promptCategories.features.length} feature/capability queries failed. Build detailed feature pages, API documentation, integration guides, and capability matrices that AI can easily parse and reference.`,
            impact: 'Medium',
            effort: 'Medium',
            suggestedOwner: 'Dev',
            actionType: 'documentation'
          })
        }

        // Priority 5: Review and social proof campaign
        if (promptCategories.reviews.length > 0 || failedResults.length > 5) {
          smartActions.push({
            id: 'action-reviews-campaign',
            title: `Email top 50 customers with personalized review requests for G2/Capterra`,
            rationale: `${promptCategories.reviews.length || 'Multiple'} review-related queries failed. Draft personal emails to power users highlighting their specific success metrics. Offer to help write the review with their actual data points.`,
            impact: 'High',
            effort: 'Low',
            suggestedOwner: 'PR',
            actionType: 'social-proof'
          })
          
          smartActions.push({
            id: 'action-video-testimonials',
            title: `Record 5 customer success story videos focusing on specific outcomes`,
            rationale: `AI models value video content with specific metrics. Target customers who achieved 50%+ improvements. Each video should focus on problem, solution, and measurable results.`,
            impact: 'High',
            effort: 'Medium',
            suggestedOwner: 'PR',
            actionType: 'social-proof'
          })
        }

        // Priority 6: Community presence
        if (failedResults.length > 5) {
          const relevantForums = industry.toLowerCase().includes('saas') ? 'r/SaaS, Indie Hackers' : 
                                industry.toLowerCase().includes('ecommerce') ? 'r/ecommerce, Shopify Community' :
                                'relevant industry forums'
          
          smartActions.push({
            id: 'action-community',
            title: `Establish thought leadership in ${relevantForums} and Stack Overflow`,
            rationale: `Low community presence detected. AI models learn from community discussions. Share insights, answer questions, and build reputation as ${industry} expert. Target 2-3 high-quality posts/answers per week.`,
            impact: 'Medium',
            effort: 'High',
            suggestedOwner: 'PR',
            actionType: 'community-engagement'
          })
        }

        // Priority 7: SEO and content gaps
        if (promptCategories.general.length > 3) {
          const topKeywords = promptCategories.general
            .map(r => r.prompt_text.match(/(?:what is|how does|explain)\s+([\w\s]+)/i)?.[1])
            .filter(Boolean)
            .slice(0, 3)
            
          smartActions.push({
            id: 'action-seo',
            title: `Create pillar content for "${topKeywords.join('", "') || 'key industry terms'}"`,
            rationale: `${promptCategories.general.length} general queries failed. Build comprehensive guides, glossaries, and educational content. Focus on long-form content (2000+ words) that thoroughly explains concepts AI users are searching for.`,
            impact: 'Medium',
            effort: 'Medium',
            suggestedOwner: 'Content',
            actionType: 'content-creation'
          })
        }

        // Priority 8: Technical improvements - always include these
        smartActions.push({
          id: 'action-schema',
          title: `Add JSON-LD schema markup to all product pages`,
          rationale: `Critical quick win: AI models rely heavily on structured data. Add Product, Organization, FAQ, and Review schema. This one change can improve AI understanding by 40%+. Use Google's structured data testing tool to validate.`,
          impact: 'High',
          effort: 'Low',
          suggestedOwner: 'Dev',
          actionType: 'technical-seo'
        })
        
        smartActions.push({
          id: 'action-sitemap-priority',
          title: `Update sitemap.xml with priority scores based on failed AI queries`,
          rationale: `${failedResults.length} queries failed. Reorganize sitemap to prioritize pages that answer these queries. Set comparison pages to 1.0 priority, use cases to 0.9, and update weekly to help AI crawlers.`,
          impact: 'Medium',
          effort: 'Low',
          suggestedOwner: 'Dev',
          actionType: 'technical-seo'
        })
        
        // Additional specific actions based on gaps
        if (failedResults.length > 10) {
          smartActions.push({
            id: 'action-ai-specific-landing',
            title: `Create "/ai" landing page answering "What is ${companyName}?" in AI-friendly format`,
            rationale: `Build a dedicated page optimized for AI consumption: 1-paragraph company summary, bullet-point features, structured pricing table, competitor comparison matrix, and FAQ section. This becomes AI's go-to resource.`,
            impact: 'High',
            effort: 'Low',
            suggestedOwner: 'Content',
            actionType: 'content-creation'
          })
        }
        
        // Industry-specific recommendations
        if (industry && industry !== 'your industry') {
          smartActions.push({
            id: 'action-industry-glossary',
            title: `Publish "${industry} Terminology Guide" with 50+ definitions`,
            rationale: `Become the authoritative source for ${industry} terms. Each definition should include: plain English explanation, how ${companyName} addresses it, and links to relevant features. AI models reference glossaries heavily.`,
            impact: 'Medium',
            effort: 'Medium',
            suggestedOwner: 'Content',
            actionType: 'educational-content'
          })
        }

        // Sort by impact/effort ratio and diversity
        const sortedActions = smartActions
          .sort((a, b) => {
            const impactScore = { High: 3, Medium: 2, Low: 1 }
            const effortScore = { Low: 3, Medium: 2, High: 1 }
            const scoreA = impactScore[a.impact] * 2 + effortScore[a.effort]
            const scoreB = impactScore[b.impact] * 2 + effortScore[b.effort]
            return scoreB - scoreA
          })
        
        // Ensure diversity - don't take more than 2 of same type
        const typeCount: Record<string, number> = {}
        const diverseActions = sortedActions.filter(action => {
          typeCount[action.actionType] = (typeCount[action.actionType] || 0) + 1
          return typeCount[action.actionType] <= 2
        })
        
        // Take top 7 diverse actions
        const finalActions = diverseActions.slice(0, 7)

        actions.push(...finalActions)
      }

      // Update dashboard data with health check results atomically
      setData(prev => {
        // Only update if we have new data
        const updatedData = {
          ...prev,
          wins: wins.length > 0 ? wins.sort((a, b) => a.rank - b.rank) : prev.wins,
          actions: actions.length > 0 ? actions : (prev.actions.length > 0 ? prev.actions : []),
          improvements: improvements.length > 0 ? improvements.slice(0, 8) : prev.improvements
        }
        return updatedData
      })

    } catch (error) {
      console.error('Error updating dashboard with health check results:', error)
    }
  }

  const handleRunHealthCheck = async () => {
    try {
      const result = await runHealthCheck()
      // Don't reset flag - let the health check results effect handle the new data
      toast({
        title: 'Health Check Complete',
        description: `Found ${(result && 'mentionRate' in result ? result.mentionRate : mentionRate)}% visibility rate with score of ${(result && 'visibilityScore' in result ? result.visibilityScore : visibilityScore)}`
      })
    } catch (error) {
      console.error('Error running health check:', error)
      toast({
        title: 'Error', 
        description: 'Failed to run health check. Please try again.',
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
    <div className="min-h-screen bg-[#ece7e0]">
      {/* Include sidebar directly */}
      <EnhancedSidebar />
      
      <div className="fixed inset-0 bg-[#ece7e0] lg:pl-[12.5rem]">
        <div className="h-full flex flex-col">
          {/* Header - Fixed height */}
          <div className="flex-shrink-0 px-6 pt-6 pb-4">
            <h1 className="font-corben text-[#282823] text-3xl mb-1">
              <TypewriterText 
                text="Dashboard" 
                typingSpeed={50}
                startDelay={200}
                onComplete={() => setShowContent(true)}
              />
            </h1>
            <p className={`text-[12px] text-[#3d3d38] ${showContent ? 'animate-fadeIn' : 'opacity-0'}`}>
              Your AI visibility at a glance
            </p>
          </div>

          {/* Health Check Loading State - Fixed height when active */}
          {isRunningHealthCheck && (
            <div className="flex-shrink-0 px-6 pb-4">
              <Card className="bg-white border-[#e7e5df] shadow-sm">
                <CardContent className="py-8">
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-[#ddff89] border-t-[#282823] rounded-full animate-spin mx-auto"></div>
                    <div>
                      <h3 className="font-corben text-[#282823] text-xl mb-1" style={{fontWeight: 400}}>
                        Running Health Check...
                      </h3>
                      <p className="text-sm text-[#3d3d38]">
                        Testing prompt {healthCheckProgress.current} of {healthCheckProgress.total}
                      </p>
                    </div>
                    
                    {currentTestPrompt && (
                      <div className="bg-[#f5f5f2] rounded-lg px-4 py-3 max-w-2xl mx-auto">
                        <p className="text-xs text-[#3d3d38] truncate">
                          "{currentTestPrompt}"
                        </p>
                      </div>
                    )}
                    
                    <div className="w-full max-w-md mx-auto">
                      <div className="w-full bg-[#e7e5df] rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-[#ddff89] h-full rounded-full transition-all duration-500 ease-out" 
                          style={{ width: `${(healthCheckProgress.current / healthCheckProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main dashboard grid - Fill remaining space, aligned with sidebar bottom */}
          <div className="flex-1 px-6 pb-6 min-h-0">
            <div className="h-full flex flex-row gap-4">
              {/* Wins Card - Expanded takes 2/3 width */}
              <Card 
                className={`border-[#e7e5df] shadow-sm overflow-hidden cursor-pointer h-full transition-all duration-700 ease-in-out ${
                  expandedCard === 'wins' ? 'bg-[#DDFB78]' : 'bg-white'
                }`}
                style={{
                  width: expandedCard === 'wins' ? 'calc(100% - 32rem)' : '16rem',
                  minWidth: '16rem',
                  transition: 'width 700ms cubic-bezier(0.4, 0, 0.2, 1), background-color 700ms ease-in-out'
                }}
                onClick={() => setExpandedCard(expandedCard === 'wins' ? 'actions' : 'wins')}
              >
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="flex-shrink-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-corben text-[#282823] text-2xl flex-1 pr-2" style={{fontWeight: 400}}>Where you're winning</h3>
                      <div className="w-6 h-6 rounded-full border border-[#3d3d38]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-[14px] text-[#3d3d38] leading-none">
                          {expandedCard === 'wins' ? '−' : '+'}
                        </span>
                      </div>
                    </div>
                    {expandedCard === 'wins' && (
                      <p className="text-[13px] text-[#3d3d38] mb-3">Install the site script to enable automatic fixes</p>
                    )}
                  </div>
                  {expandedCard === 'wins' && (
                    <>
                      <div className="flex-1 min-h-0 overflow-y-auto flex items-start justify-center pt-4">
                        {(data.wins && data.wins.length > 0) ? (
                          <div className="w-full">
                            <WinsCard
                              wins={data.wins}
                              isLoading={isRunningHealthCheck}
                              onRefresh={handleRunHealthCheck}
                              embedded
                            />
                          </div>
                        ) : (
                          <p className="text-[14px] text-[#3d3d38] text-center">
                            No results yet. Run a report to get started.
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 mt-3">
                        <span 
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate('/analytics?tab=results')
                          }}
                          className="text-[14px] text-[#3d3d38] hover:underline cursor-pointer"
                        >
                          View Details
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Actions Card - Collapsed by default */}
              <Card 
                className={`border-[#e7e5df] shadow-sm overflow-hidden cursor-pointer h-full transition-all duration-700 ease-in-out ${
                  expandedCard === 'actions' ? 'bg-[#DDFB78]' : 'bg-white'
                }`}
                style={{
                  width: expandedCard === 'actions' ? 'calc(100% - 32rem)' : '16rem',
                  minWidth: '16rem',
                  transition: 'width 700ms cubic-bezier(0.4, 0, 0.2, 1), background-color 700ms ease-in-out'
                }}
                onClick={() => setExpandedCard(expandedCard === 'actions' ? 'improvements' : 'actions')}
              >
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="flex-shrink-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-corben text-[#282823] text-2xl flex-1 pr-2" style={{fontWeight: 400}}>Next 30 days</h3>
                      <div className="w-6 h-6 rounded-full border border-[#3d3d38]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-[14px] text-[#3d3d38] leading-none">
                          {expandedCard === 'actions' ? '−' : '+'}
                        </span>
                      </div>
                    </div>
                    {expandedCard === 'actions' && (
                      <p className="text-[13px] text-[#3d3d38] mb-3">Non-automatable, high-leverage actions</p>
                    )}
                  </div>
                  {expandedCard === 'actions' && (
                    <>
                      <div className="flex-1 min-h-0 overflow-y-auto flex items-start justify-center pt-4">
                        {(data.actions && data.actions.length > 0) ? (
                          <div className="w-full">
                            <TopActionsCard
                              actions={data.actions}
                              isLoading={isRunningHealthCheck}
                              onActionClick={handleActionClick}
                              embedded
                            />
                          </div>
                        ) : (
                          <p className="text-[14px] text-[#3d3d38] text-center">
                            No results yet. Run a report to get started.
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 mt-3">
                        <span 
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate('/analytics?tab=results')
                          }}
                          className="text-[14px] text-[#3d3d38] hover:underline cursor-pointer"
                        >
                          View Details
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Improvements Card - Collapsed by default */}
              <Card 
                className={`border-[#e7e5df] shadow-sm overflow-hidden cursor-pointer h-full transition-all duration-700 ease-in-out ${
                  expandedCard === 'improvements' ? 'bg-[#DDFB78]' : 'bg-white'
                }`}
                style={{
                  width: expandedCard === 'improvements' ? 'calc(100% - 32rem)' : '16rem',
                  minWidth: '16rem',
                  transition: 'width 700ms cubic-bezier(0.4, 0, 0.2, 1), background-color 700ms ease-in-out'
                }}
                onClick={() => setExpandedCard(expandedCard === 'improvements' ? 'wins' : 'improvements')}
              >
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="flex-shrink-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-corben text-[#282823] text-2xl flex-1 pr-2" style={{fontWeight: 400}}>Areas to improve</h3>
                      <div className="w-6 h-6 rounded-full border border-[#3d3d38]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-[14px] text-[#3d3d38] leading-none">
                          {expandedCard === 'improvements' ? '−' : '+'}
                        </span>
                      </div>
                    </div>
                    {expandedCard === 'improvements' && (
                      <p className="text-[13px] text-[#3d3d38] mb-3">Non-automatable, high-leverage actions</p>
                    )}
                  </div>
                  {expandedCard === 'improvements' && (
                    <>
                      <div className="flex-1 min-h-0 overflow-y-auto flex items-start justify-center pt-4">
                        {(data.improvements && data.improvements.length > 0) ? (
                          <div className="w-full">
                            <ImprovementsCard
                              improvements={data.improvements}
                              isLoading={isRunningHealthCheck}
                              onRefresh={handleRunHealthCheck}
                              embedded
                            />
                          </div>
                        ) : (
                          <p className="text-[14px] text-[#3d3d38] text-center">
                            No results yet. Run a report to get started.
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 mt-3">
                        <span 
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate('/analytics?tab=results')
                          }}
                          className="text-[14px] text-[#3d3d38] hover:underline cursor-pointer"
                        >
                          View Details
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}