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

  // Single effect to handle all data loading consistently
  useEffect(() => {
    if (user) {
      loadAllData()
    }
  }, [user])

  // Only update health check data after initial load, and debounce it
  useEffect(() => {
    if (dataLoaded && healthCheckResults.length > 0) {
      const timeoutId = setTimeout(() => {
        updateDashboardWithHealthCheckResults()
      }, 100) // Small delay to prevent race conditions
      
      return () => clearTimeout(timeoutId)
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

      // Create default project if none exists
      if (!project && user) {
        // Try to get website URL from latest generated prompts
        const { data: latestGenerated } = await supabase
          .from('generated_prompts')
          .select('website_url, company_data')
          .eq('user_id', user.id)
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

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
      
      // Generate intelligent default actions based on website data
      const websiteDomain = latestGenerated?.website_url || project.site_url || 'your website'
      const cleanDomain = websiteDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')
      const companyInfo = latestGenerated?.company_data || {}
      const companyName = companyInfo.name || cleanDomain.split('.')[0]
      const industry = companyInfo.industry || 'your industry'
      
      const actions = [
        {
          id: 'action-1',
          title: `Run comprehensive AI visibility audit for ${companyName}`,
          rationale: `Before taking action, understand where you stand. Run a full health check to identify which AI models know about ${cleanDomain}, what they say, and where the gaps are. This data will prioritize all other actions.`,
          impact: 'High',
          effort: 'Low',
          suggestedOwner: 'Content',
          actionType: 'analysis'
        },
        {
          id: 'action-2',
          title: `Create "${companyName} vs Alternatives" comparison hub`,
          rationale: `AI models frequently get asked comparison questions. Build a dedicated section comparing your solution to top 3-5 alternatives with honest pros/cons, pricing tables, and use case recommendations.`,
          impact: 'High',
          effort: 'Medium',
          suggestedOwner: 'Content',
          actionType: 'content-creation'
        },
        {
          id: 'action-3',
          title: `Launch 30-day review collection sprint on G2 and Capterra`,
          rationale: `AI models heavily weight third-party reviews. Set a goal of 25+ detailed reviews mentioning specific features and outcomes. Reach out to happy customers with templates and incentives.`,
          impact: 'High',
          effort: 'Low',
          suggestedOwner: 'PR',
          actionType: 'social-proof'
        },
        {
          id: 'action-4',
          title: `Build "How to use ${companyName} for [specific use cases]" content series`,
          rationale: `AI tools need concrete examples. Create 5-7 detailed tutorials showing exactly how ${industry} professionals use your product to solve specific problems, with screenshots and outcomes.`,
          impact: 'Medium',
          effort: 'Medium',
          suggestedOwner: 'Content',
          actionType: 'content-creation'
        },
        {
          id: 'action-5',
          title: `Implement technical SEO for AI: structured data and API documentation`,
          rationale: `Make it easy for AI to understand ${cleanDomain}. Add JSON-LD schema markup for your organization, products, pricing, and FAQs. Ensure all key pages have proper meta descriptions focused on capabilities.`,
          impact: 'Medium',
          effort: 'Low',
          suggestedOwner: 'Dev',
          actionType: 'technical-seo'
        }
      ]

      const finalData = {
        project,
        wins: Array.isArray(wins) ? wins : (wins.wins || []),
        actions: Array.isArray(actions) ? actions : [],
        improvements: [] // Initialize as empty array until health check runs
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

        // Priority 1: Comparison content if many comparison queries failed
        if (promptCategories.comparison.length > 2) {
          const topCompetitors = promptCategories.comparison
            .map(r => r.prompt_text.match(/(?:vs|versus|compare.*to|compared to)\s+([\w\s]+)/i)?.[1])
            .filter(Boolean)
            .slice(0, 3)
          
          smartActions.push({
            id: 'action-comp',
            title: `Create detailed comparison pages: ${companyName} vs ${topCompetitors.join(', ') || 'top competitors'}`,
            rationale: `${promptCategories.comparison.length} comparison queries failed. Build dedicated comparison pages with feature matrices, pricing tables, and use case differentiators. Focus on honest, balanced comparisons that AI models will reference.`,
            impact: 'High',
            effort: 'Medium',
            suggestedOwner: 'Content',
            actionType: 'content-creation'
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
        if (promptCategories.useCases.length > 1) {
          const specificUseCases = promptCategories.useCases
            .map(r => r.prompt_text.match(/(?:how to|example of|use.*for)\s+([\w\s]+)/i)?.[1])
            .filter(Boolean)
            .slice(0, 3)
            
          smartActions.push({
            id: 'action-usecases',
            title: `Build use case library: "How ${companyName} helps with ${specificUseCases.join(', ') || 'common scenarios'}"`,
            rationale: `${promptCategories.useCases.length} use case queries failed. Create detailed tutorials, video walkthroughs, and outcome-focused case studies. Include specific metrics and implementation timelines.`,
            impact: 'High',
            effort: 'Medium',
            suggestedOwner: 'Content',
            actionType: 'content-creation'
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
        if (promptCategories.reviews.length > 0 || failedResults.length > 10) {
          smartActions.push({
            id: 'action-reviews',
            title: `Launch review collection campaign on G2, Capterra, and TrustRadius`,
            rationale: `Limited third-party validation found. AI models heavily reference review platforms. Target 50+ reviews in next 90 days. Incentivize detailed reviews that mention specific use cases and outcomes.`,
            impact: 'High',
            effort: 'Low',
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

        // Priority 8: Technical improvements
        smartActions.push({
          id: 'action-schema',
          title: `Implement structured data markup for products, reviews, and FAQs`,
          rationale: `Help AI models better understand ${websiteDomain}. Add JSON-LD schema for organization, products, reviews, FAQs, and how-to content. This directly improves how AI interprets and references your site.`,
          impact: 'High',
          effort: 'Low',
          suggestedOwner: 'Dev',
          actionType: 'technical-seo'
        })

        // Sort by impact and take top 5
        const sortedActions = smartActions
          .sort((a, b) => {
            const impactScore = { High: 3, Medium: 2, Low: 1 }
            const effortScore = { Low: 3, Medium: 2, High: 1 }
            const scoreA = impactScore[a.impact] * 2 + effortScore[a.effort]
            const scoreB = impactScore[b.impact] * 2 + effortScore[b.effort]
            return scoreB - scoreA
          })
          .slice(0, 5)

        actions.push(...sortedActions)
      }

      // Update dashboard data with health check results atomically
      setData(prev => {
        const updatedData = {
          ...prev,
          wins: wins.length > 0 ? wins.sort((a, b) => a.rank - b.rank) : prev.wins,
          actions: actions.length > 0 ? actions : prev.actions,
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
            <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Wins Card */}
              <Card className="bg-[#DDFB78] border-[#e7e5df] shadow-sm hover:shadow-md transition-shadow h-full overflow-hidden">
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-corben text-[#282823] text-sm" style={{fontWeight: 400}}>Where you're winning</h3>
                    </div>
                    <p className="text-[11px] text-[#3d3d38] mb-3">Install the site script to enable automatic fixes</p>
                  </div>
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
                      <p className="text-[11px] text-[#3d3d38] text-center">
                        No results yet. Run a report to get started.
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 mt-3">
                    <span 
                      onClick={() => navigate('/analytics?tab=results')}
                      className="text-[12px] text-[#3d3d38] hover:underline cursor-pointer"
                    >
                      View Details
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Actions Card */}
              <Card className="bg-white border-[#e7e5df] shadow-sm hover:shadow-md transition-shadow h-full overflow-hidden">
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-corben text-[#282823] text-sm" style={{fontWeight: 400}}>Next 30 days</h3>
                    </div>
                    <p className="text-[11px] text-[#3d3d38] mb-3">Non-automatable, high-leverage actions</p>
                  </div>
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
                      <p className="text-[11px] text-[#3d3d38] text-center">
                        No results yet. Run a report to get started.
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 mt-3">
                    <span 
                      onClick={() => navigate('/analytics?tab=results')}
                      className="text-[12px] text-[#3d3d38] hover:underline cursor-pointer"
                    >
                      View Details
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Improvements Card */}
              <Card className="bg-white border-[#e7e5df] shadow-sm hover:shadow-md transition-shadow h-full overflow-hidden">
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-corben text-[#282823] text-sm" style={{fontWeight: 400}}>Areas to improve</h3>
                    </div>
                    <p className="text-[11px] text-[#3d3d38] mb-3">Non-automatable, high-leverage actions</p>
                  </div>
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
                      <p className="text-[11px] text-[#3d3d38] text-center">
                        No results yet. Run a report to get started.
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 mt-3">
                    <span 
                      onClick={() => navigate('/analytics?tab=results')}
                      className="text-[12px] text-[#3d3d38] hover:underline cursor-pointer"
                    >
                      View Details
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}