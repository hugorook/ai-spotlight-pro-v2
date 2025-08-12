import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Play, TestTube, TrendingUp, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import AppHeader from '@/components/AppHeader';
import CompanySetupForm from '@/components/CompanySetupForm';

type Company = Tables<'companies'>;

interface TestResult {
  prompt: string;
  mentioned: boolean;
  position: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  context: string;
}

interface ContentOpportunity {
  id: string;
  title: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
  prompts: string[];
  outline: string[];
  optimizationTips: string[];
  expectedImpact: string;
}

export default function GeoPage() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthScore, setHealthScore] = useState<number>(0);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningHealthCheck, setIsRunningHealthCheck] = useState(false);
  const [currentTestPrompt, setCurrentTestPrompt] = useState('');
  const [testProgress, setTestProgress] = useState({ current: 0, total: 0 });
  const [customPrompt, setCustomPrompt] = useState('');
  const [isTestingCustom, setIsTestingCustom] = useState(false);
  const [contentOpportunities, setContentOpportunities] = useState<ContentOpportunity[]>([]);
  const [activeTab, setActiveTab] = useState('health');
  const [showCompanySetup, setShowCompanySetup] = useState(false);

  useEffect(() => {
    if (user) {
      loadCompanyData();
    }
  }, [user, loadCompanyData]);

  const loadCompanyData = useCallback(async () => {
    try {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error loading company:', error);
        return;
      }

      const company = companies && companies.length > 0 ? companies[0] : null;
      if (company) {
        setCompany(company);
        
        // Load AI test results
        const { data: aiTests } = await supabase
          .from('ai_tests')
          .select('*')
          .eq('company_id', company.id)
          .order('test_date', { ascending: false });

        if (aiTests) {
          const results = aiTests.map((test) => ({
            prompt: test.prompt_id || 'Custom prompt',
            mentioned: test.company_mentioned,
            position: test.mention_position || 0,
            sentiment: test.sentiment || 'neutral',
            context: test.mention_context || ''
          }));
          setTestResults(results);
          calculateHealthScore(results);
          generateContentOpportunities(results, company);
        }
      }
    } catch (error) {
      console.error('Error loading company data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const calculateHealthScore = (results: TestResult[]) => {
    if (results.length === 0) {
      setHealthScore(0);
      return;
    }
    
    const mentionRate = results.filter(r => r.mentioned).length / results.length;
    const avgPosition = results
      .filter(r => r.mentioned && r.position > 0)
      .reduce((sum, r) => sum + r.position, 0) / results.filter(r => r.mentioned && r.position > 0).length || 10;
    
    const positionScore = Math.max(0, (10 - avgPosition) / 10);
    const score = Math.round((mentionRate * 0.7 + positionScore * 0.3) * 100);
    setHealthScore(score);
  };

  const generateContentOpportunities = (results: TestResult[], companyData: Company) => {
    const missedPrompts = results.filter(r => !r.mentioned);
    const opportunities: ContentOpportunity[] = [
      {
        id: '1',
        title: `Create FAQ Page About ${companyData.industry} Solutions`,
        type: 'FAQ Page',
        priority: 'high',
        description: 'Comprehensive FAQ addressing common questions in your industry',
        prompts: missedPrompts.slice(0, 3).map(r => r.prompt),
        outline: [
          'What is the best approach to [industry problem]?',
          'How do you choose the right [industry] provider?',
          'What are the key features to look for?',
          'How much should you expect to pay?'
        ],
        optimizationTips: [
          'Use natural question-answer format',
          'Include specific use cases and examples',
          'Structure with clear headings and bullet points'
        ],
        expectedImpact: 'Should improve visibility for 3-5 question-based prompts'
      },
      {
        id: '2',
        title: `Write Blog Post: "Best Practices for ${companyData.industry}"`,
        type: 'Blog Post',
        priority: 'high',
        description: 'Authoritative guide covering industry best practices',
        prompts: missedPrompts.slice(3, 6).map(r => r.prompt),
        outline: [
          'Industry overview and current trends',
          'Common challenges and solutions',
          'Step-by-step implementation guide',
          'Case studies and examples'
        ],
        optimizationTips: [
          'Include data and statistics',
          'Use subheadings for each best practice',
          'Add actionable takeaways'
        ],
        expectedImpact: 'Should improve visibility for recommendation-based prompts'
      },
      {
        id: '3',
        title: `Develop Case Study: Customer Success Story`,
        type: 'Case Study',
        priority: 'medium',
        description: 'Detailed case study showcasing successful implementation',
        prompts: ['Companies like [customer name]', 'Success stories in [industry]'],
        outline: [
          'Customer background and challenges',
          'Solution implementation process',
          'Results and measurable outcomes',
          'Lessons learned and recommendations'
        ],
        optimizationTips: [
          'Include specific metrics and numbers',
          'Use customer quotes and testimonials',
          'Structure with clear problem-solution-results format'
        ],
        expectedImpact: 'Should improve credibility and example-based mentions'
      },
      {
        id: '4',
        title: `Press Release: ${companyData.company_name} Achievement`,
        type: 'Press Release',
        priority: 'medium',
        description: 'Newsworthy announcement to increase brand visibility',
        prompts: ['Latest news in [industry]', 'Recent developments'],
        outline: [
          'Compelling headline and lead',
          'Key achievement details',
          'Industry context and significance',
          'Company background and contact info'
        ],
        optimizationTips: [
          'Follow standard press release format',
          'Include quotes from leadership',
          'Add relevant industry keywords'
        ],
        expectedImpact: 'Should improve news and update-based mentions'
      }
    ];

    setContentOpportunities(opportunities);
  };

  const runHealthCheck = async () => {
    if (!company) {
      toast.error('Please set up your company information first');
      return;
    }

    setIsRunningHealthCheck(true);
    setTestProgress({ current: 0, total: 25 });
    
    try {
      // Generate 25 relevant prompts based on company data
      const prompts = [
        `What are the best ${company.industry} companies?`,
        `Who are the top players in ${company.industry}?`,
        `Recommend ${company.industry} solutions for ${company.target_customers}`,
        `Best ${company.industry} providers`,
        `${company.industry} market leaders`,
        `How to choose ${company.industry} software`,
        `${company.industry} comparison`,
        `Top ${company.industry} vendors`,
        `${company.industry} reviews`,
        `Best practices for ${company.industry}`,
        `${company.industry} implementation guide`,
        `${company.industry} cost comparison`,
        `${company.industry} features to look for`,
        `${company.industry} trends 2024`,
        `${company.industry} case studies`,
        `${company.industry} success stories`,
        `${company.industry} ROI analysis`,
        `${company.industry} integration options`,
        `${company.industry} security considerations`,
        `${company.industry} scalability`,
        `${company.industry} alternatives`,
        `${company.industry} pricing models`,
        `${company.industry} deployment options`,
        `${company.industry} support and training`,
        `${company.industry} future outlook`
      ];

      // Process prompts one by one since your function expects singular 'prompt'
      const results: TestResult[] = [];
      
      for (let i = 0; i < prompts.length; i++) {
        const currentPrompt = prompts[i];
        setCurrentTestPrompt(`Testing: "${currentPrompt}"`);
        setTestProgress({ current: i + 1, total: prompts.length });
        
        try {
          const { data: result, error } = await supabase.functions.invoke('test-ai-models', {
            body: {
              prompt: currentPrompt,
              companyName: company.company_name,
              industry: company.industry,
              description: company.description,
              differentiators: company.key_differentiators
            }
          });

          if (error) {
            console.error('Prompt error:', error);
            // Continue with remaining prompts
            continue;
          }

          // Process single result
          if (result) {
            const testResult: TestResult = {
              prompt: currentPrompt,
              mentioned: result.mentioned || false,
              position: result.position || 0,
              sentiment: (result.sentiment || 'neutral') as 'positive' | 'neutral' | 'negative',
              context: result.context || result.response || ''
            };
            
            results.push(testResult);
            
            // Show intermediate progress
            const currentMentions = results.filter(r => r.mentioned).length;
            setCurrentTestPrompt(`Found ${currentMentions} mentions so far...`);
            
            // Small delay to show progress
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
        } catch (promptError) {
          console.error('Error processing prompt:', promptError);
        }
      }

      if (results.length === 0) {
        toast.error('Health check failed - no results were returned. Please check your edge functions.');
        return;
      }

      setTestResults(results);
      calculateHealthScore(results);
      generateContentOpportunities(results, company);
      
      const mentionCount = results.filter(r => r.mentioned).length;
      const successRate = Math.round((mentionCount / results.length) * 100);
      
      toast.success(`Health check completed! Found ${mentionCount} mentions out of ${results.length} tests (${successRate}% mention rate).`);
      
    } catch (error) {
      console.error('Error running health check:', error);
      toast.error('Failed to run health check. Please try again.');
    } finally {
      setIsRunningHealthCheck(false);
      setCurrentTestPrompt('');
    }
  };

  const testCustomPrompt = async () => {
    if (!customPrompt || !company) return;
    
    setIsTestingCustom(true);
    
    try {
      // Call the edge function to test the custom prompt
      const { data: result, error } = await supabase.functions.invoke('test-ai-models', {
        body: {
          prompt: customPrompt,
          companyName: company.company_name,
          industry: company.industry,
          description: company.description,
          differentiators: company.key_differentiators
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error('Failed to test custom prompt');
        return;
      }

      if (result) {
        const testResult: TestResult = {
          prompt: customPrompt,
          mentioned: result.mentioned || false,
          position: result.position || 0,
          sentiment: (result.sentiment || 'neutral') as 'positive' | 'neutral' | 'negative',
          context: result.context || result.response || ''
        };
        
        setTestResults([testResult, ...testResults]);
        calculateHealthScore([testResult, ...testResults]);
        setCustomPrompt('');
        toast.success(testResult.mentioned ? `Mentioned at position ${testResult.position}!` : 'Not mentioned in response');
      }
      
    } catch (error) {
      console.error('Error testing custom prompt:', error);
      toast.error('Failed to test custom prompt');
    } finally {
      setIsTestingCustom(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto max-w-4xl p-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-64"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto max-w-4xl p-4">
          <div className="text-center py-20">
            <AlertTriangle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Company Profile Required</h2>
            <p className="text-muted-foreground mb-6">
              Set up your company profile to start using AI Visibility testing and analysis.
            </p>
            <Button onClick={() => setShowCompanySetup(true)}>
              Set Up Company Profile
            </Button>
          </div>
          {showCompanySetup && (
            <div className="max-w-2xl mx-auto mt-8">
              <CompanySetupForm onComplete={() => {
                setShowCompanySetup(false);
                loadCompanyData();
              }} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto max-w-4xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Your GEO</h1>
            <p className="text-muted-foreground">AI Visibility Optimization</p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <TrendingUp className="h-4 w-4 mr-2" />
            Health Score: {healthScore}/100
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="health" className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Health Check
            </TabsTrigger>
            <TabsTrigger value="strategy" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Strategy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="health" className="space-y-6">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Play className="h-5 w-5 text-primary" />
                  AI Visibility Health Check
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Test how your company appears across 25+ AI-generated responses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Main Health Check Button */}
                <div className="text-center space-y-4">
                  <Button 
                    onClick={runHealthCheck} 
                    disabled={isRunningHealthCheck || !company}
                    size="lg"
                    className="w-full max-w-md h-12 text-lg bg-primary hover:bg-primary/90"
                  >
                    {isRunningHealthCheck ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Running Health Check...
                      </div>
                    ) : (
                      <>
                        <Play className="h-5 w-5 mr-2" />
                        Run Automated Health Check
                      </>
                    )}
                  </Button>
                  
                  {isRunningHealthCheck && (
                    <div className="space-y-3 max-w-md mx-auto">
                      <Progress 
                        value={(testProgress.current / testProgress.total) * 100} 
                        className="h-2"
                      />
                      <p className="text-sm text-muted-foreground">
                        Testing prompt {testProgress.current} of {testProgress.total}...
                      </p>
                      {currentTestPrompt && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium text-center">
                            "{currentTestPrompt}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Custom Prompt Testing */}
                <div className="border-t border-border pt-6 space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Test Custom Prompt</h3>
                  <div className="flex gap-2 max-w-2xl mx-auto">
                    <Input
                      placeholder="Enter a custom prompt to test..."
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      className="flex-1 bg-background border-border"
                    />
                    <Button 
                      onClick={testCustomPrompt}
                      disabled={!customPrompt || isTestingCustom}
                      variant="outline"
                    >
                      {isTestingCustom ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Test Prompt'
                      )}
                    </Button>
                  </div>
                </div>

                {/* Results Display */}
                {testResults.length > 0 && (
                  <div className="border-t border-border pt-6 space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card className="bg-card/50">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-foreground">{testResults.length}</div>
                          <div className="text-sm text-muted-foreground">Prompts Tested</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-card/50">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-green-500">
                            {Math.round((testResults.filter(r => r.mentioned).length / testResults.length) * 100)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Mention Rate</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-card/50">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-foreground">
                            {testResults
                              .filter(r => r.mentioned && r.position > 0)
                              .reduce((sum, r, _, arr) => sum + r.position / arr.length, 0)
                              .toFixed(1) || '0'}
                          </div>
                          <div className="text-sm text-muted-foreground">Avg Position</div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground">Detailed Results</h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {testResults.map((result, index) => (
                          <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg bg-card/30">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">{result.prompt}</p>
                              {result.context && (
                                <p className="text-sm text-muted-foreground mt-1 truncate">{result.context}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Badge 
                                variant={result.mentioned ? "default" : "secondary"}
                                className={result.mentioned ? "bg-green-600 hover:bg-green-700" : ""}
                              >
                                {result.mentioned ? `Position ${result.position}` : 'Not Mentioned'}
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {result.sentiment}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="strategy" className="space-y-6">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <FileText className="h-5 w-5 text-primary" />
                  Content Strategy Opportunities
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Actionable content recommendations based on your health check results
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contentOpportunities.length > 0 ? (
                  <Accordion type="single" collapsible className="space-y-2">
                    {contentOpportunities.map((opportunity) => (
                      <AccordionItem 
                        key={opportunity.id} 
                        value={opportunity.id}
                        className="border border-border rounded-lg px-4"
                      >
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-3">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-left font-medium text-foreground">{opportunity.title}</span>
                            </div>
                            {opportunity.priority === 'high' && (
                              <Badge className="bg-primary text-primary-foreground">
                                High Priority
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-4">
                          <p className="text-muted-foreground">{opportunity.description}</p>
                          
                          <div className="space-y-3">
                            <div>
                              <h5 className="font-medium text-foreground mb-2">Why this content helps:</h5>
                              <p className="text-sm text-muted-foreground">
                                This content should improve your visibility for prompts like: {opportunity.prompts.join(', ')}
                              </p>
                            </div>
                            
                            <div>
                              <h5 className="font-medium text-foreground mb-2">Content outline:</h5>
                              <ul className="space-y-1">
                                {opportunity.outline.map((item, index) => (
                                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <span className="text-primary mt-1">•</span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div>
                              <h5 className="font-medium text-foreground mb-2">Optimization tips:</h5>
                              <ul className="space-y-1">
                                {opportunity.optimizationTips.map((tip, index) => (
                                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <span className="text-primary mt-1">•</span>
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div className="pt-2 border-t border-border">
                              <p className="text-sm font-medium text-foreground">Expected Impact:</p>
                              <p className="text-sm text-muted-foreground">{opportunity.expectedImpact}</p>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      Run a health check to get personalized content recommendations
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}