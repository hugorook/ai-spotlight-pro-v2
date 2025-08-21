import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, BarChart3, CheckCircle, FileText, Lightbulb, Download, Printer, Copy, Plus, Minus, Globe, Code, Eye, Wrench, Award, Users, Clock, ArrowUp, ArrowDown, Minus as MinusIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  prompt: string;
  mentioned: boolean;
  position: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  context: string;
  response?: string; // Full AI response
  failureAnalysis?: FailureAnalysis;
}

interface FailureAnalysis {
  primaryReason: string;
  category: 'content' | 'authority' | 'technical' | 'competition';
  severity: 'critical' | 'moderate' | 'minor';
  quickFix: string;
  detailedFix: string;
  timeToFix: string;
  difficulty: 'easy' | 'moderate' | 'needs-dev';
  expectedImpact: string;
  competitorInsight?: string;
}

interface TrendingOpportunity {
  query: string;
  trendScore: number;
  timeWindow: string;
  reasoning: string;
  suggestedContent: string;
  difficulty: 'easy' | 'moderate' | 'advanced';
}

interface SmartFix {
  title: string;
  description: string;
  code?: string;
  content?: string;
  instructions: {
    platform: string;
    steps: string[];
  };
  preview: string;
  timeToImplement: string;
  difficulty: 'easy' | 'moderate' | 'needs-dev';
}

interface CMSDetection {
  cms: string;
  confidence: number;
  detectedBy: string[];
  instructions: any;
}

interface AuthorityOpportunity {
  source: string;
  type: 'directory' | 'review_platform' | 'industry_publication' | 'podcast' | 'award' | 'certification';
  description: string;
  actionRequired: string;
  estimatedEffort: 'low' | 'medium' | 'high';
  potentialImpact: 'low' | 'medium' | 'high';
  url?: string;
  contactInfo?: string;
}

interface CompetitorMention {
  competitor: string;
  source: string;
  type: string;
  reasoning: string;
  opportunityForYou: string;
}

interface CompetitiveAuthorityAnalysis {
  industryAuthorities: string[];
  keyDirectories: string[];
  reviewPlatforms: string[];
  authorityOpportunities: AuthorityOpportunity[];
  competitorMentions: CompetitorMention[];
  actionPlan: {
    immediate: AuthorityOpportunity[];
    shortTerm: AuthorityOpportunity[];
    longTerm: AuthorityOpportunity[];
  };
}

interface ImplementedFix {
  fixType: 'faq' | 'content' | 'schema' | 'authority';
  description: string;
  implementedDate: string;
  targetPrompts: string[];
  platform: string;
}

interface ProgressMetrics {
  overallImprovement: {
    mentionRateChange: number;
    positionImprovement: number;
    sentimentImprovement: number;
    trend: 'improving' | 'declining' | 'stable';
  };
  specificImprovements: {
    prompt: string;
    beforeMentioned: boolean;
    afterMentioned: boolean;
    positionChange: number;
    sentimentChange: string;
    likelyReason: string;
  }[];
  fixAttribution: {
    fixType: string;
    description: string;
    estimatedImpact: 'high' | 'medium' | 'low';
    promptsImproved: string[];
    confidence: number;
  }[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    reasoning: string;
    expectedTimeframe: string;
  }[];
  nextSteps: string[];
}

interface ResultsSectionProps {
  isVisible: boolean;
  results: TestResult[];
  healthScore: number;
  onNewTest?: () => void;
  strategies?: any[];
  strategyLoading?: boolean;
  strategyError?: string | null;
  company?: any;
  onExportCsv?: () => void;
  onPrintReport?: () => void;
  onCopyResults?: () => void;
  websiteAnalysis?: any;
  trendingOpportunities?: TrendingOpportunity[];
}

const ResultsSection: React.FC<ResultsSectionProps> = ({
  isVisible,
  results,
  healthScore,
  onNewTest,
  strategies = [],
  strategyLoading = false,
  strategyError = null,
  company,
  onExportCsv,
  onPrintReport,
  onCopyResults,
  websiteAnalysis,
  trendingOpportunities = []
}) => {
  const [activeTab, setActiveTab] = useState('results');
  const [showAllResults, setShowAllResults] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const [cmsDetection, setCmsDetection] = useState<CMSDetection | null>(null);
  const [smartFixes, setSmartFixes] = useState<{ [key: string]: SmartFix }>({});
  const [generatingFix, setGeneratingFix] = useState<string | null>(null);
  const [authorityAnalysis, setAuthorityAnalysis] = useState<CompetitiveAuthorityAnalysis | null>(null);
  const [authorityLoading, setAuthorityLoading] = useState(false);
  const [progressMetrics, setProgressMetrics] = useState<ProgressMetrics | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [previousResults, setPreviousResults] = useState<TestResult[] | null>(null);
  
  // Persist active tab in localStorage
  useEffect(() => {
    const savedTab = localStorage.getItem('activeResultsTab');
    if (savedTab && (savedTab === 'results' || savedTab === 'strategy' || savedTab === 'website' || savedTab === 'trending' || savedTab === 'authority' || savedTab === 'progress')) {
      setActiveTab(savedTab);
    }
  }, []);

  // Load previous results for progress comparison
  useEffect(() => {
    const savedPreviousResults = localStorage.getItem('previousTestResults');
    if (savedPreviousResults) {
      try {
        setPreviousResults(JSON.parse(savedPreviousResults));
      } catch (error) {
        console.error('Error parsing previous results:', error);
      }
    }

    // Save current results as previous when new results arrive
    if (results.length > 0) {
      const currentResultsKey = `testResults_${company?.company_name || 'unknown'}_${Date.now()}`;
      localStorage.setItem('previousTestResults', JSON.stringify(results));
    }
  }, [results, company?.company_name]);

  // Reset show all results when results change
  useEffect(() => {
    setShowAllResults(false);
    setExpandedResults(new Set());
  }, [results.length]);

  // Detect CMS when component mounts
  useEffect(() => {
    if (company?.website_url && !cmsDetection) {
      detectWebsiteCMS(company.website_url);
    }
  }, [company?.website_url]);

  const detectWebsiteCMS = async (url: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('detect-cms', {
        body: { url }
      });

      if (!error && data?.detection) {
        setCmsDetection(data.detection);
        console.log('CMS detected:', data.detection.cms);
      }
    } catch (error) {
      console.error('Error detecting CMS:', error);
    }
  };

  const loadAuthorityAnalysis = async () => {
    if (!company || authorityLoading || authorityAnalysis) return;
    
    setAuthorityLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-competitive-authority', {
        body: {
          companyName: company.company_name,
          industry: company.industry,
          keyDifferentiators: company.key_differentiators
        }
      });

      if (!error && data?.analysis) {
        setAuthorityAnalysis(data.analysis);
        console.log('Authority analysis completed:', data.analysis);
      }
    } catch (error) {
      console.error('Error loading authority analysis:', error);
    } finally {
      setAuthorityLoading(false);
    }
  };

  const loadProgressTracking = async () => {
    if (!company || progressLoading || !results.length) return;
    
    setProgressLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('track-progress', {
        body: {
          companyName: company.company_name,
          currentResults: results,
          previousResults: previousResults,
          timeframe: '30 days'
        }
      });

      if (!error && data?.progressMetrics) {
        setProgressMetrics(data.progressMetrics);
        console.log('Progress tracking completed:', data.progressMetrics);
      }
    } catch (error) {
      console.error('Error loading progress tracking:', error);
    } finally {
      setProgressLoading(false);
    }
  };

  const toggleResultExpansion = (index: number) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedResults(newExpanded);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    localStorage.setItem('activeResultsTab', tabId);
  };

  const handleGenerateFix = async (result: TestResult, fixType: 'faq' | 'content' | 'schema' | 'authority') => {
    if (!result.failureAnalysis || !company) return;

    const fixKey = `${result.prompt}-${fixType}`;
    setGeneratingFix(fixKey);

    try {
      const { data, error } = await supabase.functions.invoke('generate-smart-fixes', {
        body: {
          failureReason: result.failureAnalysis.primaryReason,
          prompt: result.prompt,
          companyName: company.company_name,
          industry: company.industry,
          cms: cmsDetection?.cms || 'custom',
          fixType
        }
      });

      if (!error && data?.smartFix) {
        setSmartFixes(prev => ({
          ...prev,
          [fixKey]: data.smartFix
        }));
      }
    } catch (error) {
      console.error('Error generating smart fix:', error);
    } finally {
      setGeneratingFix(null);
    }
  };
  const [contentTopic, setContentTopic] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  if (!isVisible) return null;

  const mentionRate = results.length > 0 ? Math.round((results.filter(r => r.mentioned).length / results.length) * 100) : 0;
  const avgPosition = results.filter(r => r.mentioned).length > 0 
    ? Math.round(results.filter(r => r.mentioned).reduce((sum, r) => sum + r.position, 0) / results.filter(r => r.mentioned).length)
    : 0;

  const getHealthScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthScoreGrade = (score: number) => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  };

  const getGradeDescription = (grade: string) => {
    switch (grade) {
      case 'A+': return 'Excellent AI visibility - you appear consistently';
      case 'A': return 'Strong AI visibility - appearing in most relevant queries';
      case 'B': return 'Good AI visibility - room for improvement';
      case 'C': return 'Moderate AI visibility - several gaps to address';
      case 'D': return 'Poor AI visibility - significant improvements needed';
      case 'F': return 'Minimal AI visibility - urgent action required';
      default: return 'AI visibility assessment';
    }
  };

  const getIndustryBenchmark = (industry: string) => {
    // Industry benchmarks based on typical AI mention rates
    const benchmarks = {
      'Technology/Software': 45,
      'Professional Services': 38,
      'Marketing/Advertising': 42,
      'Finance/Banking': 35,
      'Healthcare': 32,
      'Manufacturing': 28,
      'E-commerce/Retail': 40,
      'Education': 36,
      'Real Estate': 30,
      'Other': 35
    };
    return benchmarks[industry as keyof typeof benchmarks] || 35;
  };

  const generateContent = async (topicOverride?: string) => {
    const topic = (topicOverride ?? contentTopic).trim();
    if (!topic || !company) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          companyName: company.company_name,
          industry: company.industry,
          targetCustomers: company.target_customers,
          differentiators: company.key_differentiators,
          topic,
        },
      });
      if (error) throw error;
      if (data && (data as any).error) throw new Error((data as any).error);
      const content = (data as any)?.content ?? '';
      setGeneratedContent(content);
    } catch (error) {
      console.error('Content generation error:', error);
      // Fallback to mock content if the function fails
      const content = `# ${topic}\n\nThis is generated content for ${company.company_name} about ${topic}.\n\n## Key Benefits\n- Improved AI visibility\n- Better search rankings\n- Enhanced brand recognition\n\n## Call to Action\nContact ${company.company_name} today to learn more about our ${company.industry} solutions.`;
      setGeneratedContent(content);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  // FailureAnalysisCard component
  const FailureAnalysisCard = ({ result, company, onGenerateFix }: { 
    result: TestResult; 
    company: any; 
    onGenerateFix: (fixType: 'faq' | 'content' | 'schema' | 'authority') => void; 
  }) => {
    const [showSmartFix, setShowSmartFix] = useState(false);
    const fixKey = `${result.prompt}-${result.failureAnalysis?.category}`;
    const smartFix = smartFixes[fixKey];
    const isGenerating = generatingFix === fixKey;

    return (
      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start gap-3">
          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
            result.failureAnalysis?.severity === 'critical' ? 'bg-red-500' :
            result.failureAnalysis?.severity === 'moderate' ? 'bg-yellow-500' :
            'bg-blue-500'
          }`}></div>
          <div className="flex-1">
            <div className="text-sm font-medium text-red-800 mb-2">
              Why you didn't rank: {result.failureAnalysis?.primaryReason}
            </div>
            <div className="text-xs text-red-700 space-y-1">
              <div><strong>Quick Fix ({result.failureAnalysis?.timeToFix}):</strong> {result.failureAnalysis?.quickFix}</div>
              <div><strong>Expected Impact:</strong> {result.failureAnalysis?.expectedImpact}</div>
              {result.failureAnalysis?.competitorInsight && (
                <div><strong>Competitor Insight:</strong> {result.failureAnalysis.competitorInsight}</div>
              )}
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  result.failureAnalysis?.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                  result.failureAnalysis?.difficulty === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {result.failureAnalysis?.difficulty}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  result.failureAnalysis?.category === 'content' ? 'bg-blue-100 text-blue-700' :
                  result.failureAnalysis?.category === 'authority' ? 'bg-purple-100 text-purple-700' :
                  result.failureAnalysis?.category === 'technical' ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {result.failureAnalysis?.category}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (!smartFix) {
                      onGenerateFix(result.failureAnalysis?.category as any);
                    }
                    setShowSmartFix(!showSmartFix);
                  }}
                  disabled={isGenerating}
                  className="px-3 py-1 text-xs bg-[#111E63] text-white rounded hover:opacity-90 transition-none flex items-center gap-1"
                >
                  <Wrench className="w-3 h-3" />
                  {isGenerating ? 'Generating...' : smartFix ? 'Show Fix' : 'Get Fix'}
                </button>
              </div>
            </div>

            {/* Smart Fix Display */}
            {showSmartFix && smartFix && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                <div className="text-sm font-medium text-green-800 mb-2">{smartFix.title}</div>
                <div className="text-xs text-green-700 mb-3">{smartFix.description}</div>
                
                {smartFix.code && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-green-800 mb-1">Code to Copy:</div>
                    <div className="bg-gray-800 text-green-400 p-2 rounded text-xs font-mono overflow-x-auto">
                      {smartFix.code}
                    </div>
                    <button
                      onClick={() => copyToClipboard(smartFix.code!)}
                      className="mt-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:opacity-90 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy Code
                    </button>
                  </div>
                )}

                {smartFix.content && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-green-800 mb-1">Content to Add:</div>
                    <div className="bg-white p-2 rounded border text-xs">
                      {smartFix.content}
                    </div>
                    <button
                      onClick={() => copyToClipboard(smartFix.content!)}
                      className="mt-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:opacity-90 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy Content
                    </button>
                  </div>
                )}

                <div className="text-xs text-green-700">
                  <div className="font-medium">Implementation ({smartFix.timeToImplement}):</div>
                  <ol className="list-decimal list-inside ml-2 space-y-1">
                    {smartFix.instructions.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full animate-fade-in">
      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-white/10 backdrop-blur-sm rounded-lg p-1">
          {[
            { id: 'results', label: 'Results', icon: BarChart3 },
            { id: 'strategy', label: 'Strategy', icon: Lightbulb },
            { id: 'trending', label: 'Trending', icon: TrendingUp },
            { id: 'website', label: 'Website Analysis', icon: Globe },
            { id: 'authority', label: 'Authority', icon: Award },
            { id: 'progress', label: 'Progress', icon: Clock }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-lg font-medium transition-none ${
                activeTab === tab.id
                  ? 'bg-[#111E63] text-white'
                  : 'bg-[#E7E2F9] text-foreground hover:bg-[#111E63] hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'results' && (
          <div>
            {/* Dashboard Header */}
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Main Grade Card */}
                <div className="md:col-span-2 glass p-6 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-3">
                        <div className={`text-6xl font-bold ${getHealthScoreColor(mentionRate)}`}>
                          {getHealthScoreGrade(mentionRate)}
                        </div>
                        <div className="text-2xl text-muted-foreground">
                          {mentionRate}%
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {getGradeDescription(getHealthScoreGrade(mentionRate))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground mb-1">Industry Benchmark</div>
                      <div className="text-lg font-semibold">
                        {getIndustryBenchmark(company?.industry || 'Other')}%
                      </div>
                      <div className={`text-xs ${mentionRate > getIndustryBenchmark(company?.industry || 'Other') ? 'text-green-600' : 'text-red-600'}`}>
                        {mentionRate > getIndustryBenchmark(company?.industry || 'Other') 
                          ? `+${mentionRate - getIndustryBenchmark(company?.industry || 'Other')}% above average`
                          : `${getIndustryBenchmark(company?.industry || 'Other') - mentionRate}% below average`
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="glass p-6 rounded-lg">
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Tests Run</div>
                      <div className="text-xl font-semibold">{results.length}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Avg Position</div>
                      <div className="text-xl font-semibold">#{avgPosition || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Top Issues</div>
                      <div className="text-sm">
                        {results.filter(r => r.failureAnalysis?.severity === 'critical').length > 0 
                          ? `${results.filter(r => r.failureAnalysis?.severity === 'critical').length} Critical`
                          : 'None Critical'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Wins Summary */}
              <div className="glass p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Your Top 3 Quick Wins</h4>
                    <div className="text-xs text-muted-foreground">
                      Fix these first for maximum impact
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Est. {results.filter(r => r.failureAnalysis?.difficulty === 'easy').length} easy fixes available
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Detailed Results</h3>
              <div className="flex items-center gap-2">
                {onExportCsv && (
                  <button
                    onClick={onExportCsv}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs glass rounded-md hover:bg-[#111E63] hover:text-white transition-none"
                  >
                    <Download className="w-3 h-3" />
                    Export CSV
                  </button>
                )}
                {onPrintReport && (
                  <button
                    onClick={onPrintReport}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs glass rounded-md hover:bg-[#111E63] hover:text-white transition-none"
                  >
                    <Printer className="w-3 h-3" />
                    Print PDF
                  </button>
                )}
                {onCopyResults && (
                  <button
                    onClick={onCopyResults}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs glass rounded-md hover:bg-[#111E63] hover:text-white transition-none"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                )}
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="glass p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-foreground mb-1">{mentionRate}%</div>
                    <div className="text-sm text-muted-foreground">Mention Rate</div>
                  </div>
                  <div className="w-16 h-16 relative">
                    <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                      <defs>
                        <linearGradient id="mentionRateGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#111E63" />
                          <stop offset="100%" stopColor="#111E63" />
                        </linearGradient>
                      </defs>
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="rgba(17, 30, 99, 0.2)"
                        strokeWidth="8"
                        fill="none"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="url(#mentionRateGradient)"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${(mentionRate / 100) * 251.2} 251.2`}
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-foreground">
                        {mentionRate}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold text-foreground">#{avgPosition || 'N/A'}</div>
                    <div className="text-sm text-muted-foreground">Avg Position</div>
                  </div>
                </div>
              </div>

              <div className="glass p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-8 h-8 text-purple-500" />
                  <div>
                    <div className="text-2xl font-bold text-foreground">{results.length}</div>
                    <div className="text-sm text-muted-foreground">Tests Run</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="space-y-3">
              {results.slice(0, showAllResults ? results.length : 5).map((result, index) => {
                const isExpanded = expandedResults.has(index);
                
                // Determine what content we have available
                const fullResponse = result.response || result.context || '';
                const contextSummary = result.context || '';
                
                // If we have a full response but no separate context, create a summary
                const displayContext = contextSummary || 
                  (fullResponse.length > 150 ? fullResponse.slice(0, 150) + '...' : fullResponse) ||
                  'No context available';
                
                // Show plus button if we have any content at all (for testing purposes)
                const hasExpandableContent = fullResponse.length > 0;
                
                return (
                  <div key={index} className="p-3 glass rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 mr-4">
                        <div className="font-bold text-foreground">
                          {result.prompt}
                          <div className="text-sm text-muted-foreground break-words font-normal leading-tight">
                            <strong>Summary:</strong> {displayContext}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className={`w-3 h-3 rounded-full ${
                          result.mentioned ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        {result.mentioned && (
                          <span className="text-sm font-medium text-foreground">
                            #{result.position}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          result.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                          result.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {result.sentiment}
                        </span>
                        {hasExpandableContent && (
                          <button
                            onClick={() => toggleResultExpansion(index)}
                            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#111E63] hover:text-white transition-none"
                            title={isExpanded ? 'Hide full AI response' : 'View full AI response'}
                          >
                            {isExpanded ? (
                              <Minus className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Plus className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Show full AI response when expanded */}
                    {isExpanded && hasExpandableContent && (
                      <div className="text-sm text-foreground break-words bg-white/10 p-3 rounded border-l-4 border-[#111E63]">
                        <strong className="text-[#111E63]">Full AI Response:</strong>
                        <div className="mt-2 whitespace-pre-wrap">{fullResponse}</div>
                      </div>
                    )}

                    {/* Show failure analysis for non-mentioned or low-ranking results */}
                    {result.failureAnalysis && (
                      <FailureAnalysisCard 
                        result={result}
                        company={company}
                        onGenerateFix={(fixType) => handleGenerateFix(result, fixType)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            
            {results.length > 5 && (
              <div className="mt-4 text-center">
                <button 
                  onClick={() => setShowAllResults(!showAllResults)}
                  className="text-sm text-muted-foreground hover:bg-[#111E63] hover:text-white px-2 py-1 rounded transition-none"
                >
                  {showAllResults ? 'Show less ↑' : `View all ${results.length} results →`}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'strategy' && (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Strategy Recommendations */}
              <div className="glass p-4 rounded-lg min-h-[400px] h-fit">
                <h4 className="text-sm font-semibold mb-2">Strategy Recommendations</h4>
                {strategyLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-pulse text-muted-foreground text-xs">Generating personalized strategies...</div>
                  </div>
                ) : strategyError ? (
                  <div className="text-center py-4">
                    <div className="text-red-600 text-xs">Error: {strategyError}</div>
                  </div>
                ) : strategies.length > 0 ? (
                  <div className="flex flex-col gap-3 h-full">
                    {strategies.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const title = item.title || String(item);
                          setContentTopic(title);
                          generateContent(title);
                        }}
                        className="text-left rounded-md border border-input bg-background px-3 py-2 hover:bg-[#111E63] hover:text-white transition-none group"
                      >
                        <div className="font-semibold text-sm leading-tight break-words group-hover:text-white">{item.title || String(item)}</div>
                        {item.reason && (
                          <div className="text-xs text-muted-foreground mt-1 leading-relaxed break-words group-hover:text-white">{item.reason}</div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-muted-foreground text-center">No items yet. Run a health check to generate recommendations.</p>
                  </div>
                )}
              </div>

              {/* Content Generator */}
              <div className="glass p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-foreground mb-4">Generate Content</h3>
                
                <div className="mb-5">
                  <label className="block text-sm font-medium text-foreground mb-1">Content Topic</label>
                  <input
                    type="text"
                    value={contentTopic}
                    onChange={(e) => setContentTopic(e.target.value)}
                    placeholder="What should the content be about?"
                    className="flex h-10 w-full rounded-md border border-transparent bg-white text-black px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm placeholder:text-black/60"
                  />
                </div>

                <button
                  onClick={() => generateContent()}
                  disabled={!contentTopic.trim() || isGenerating}
                  className="inline-flex w-full items-center justify-center rounded-md bg-[#111E63] text-white px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-[#111E63] transition-none mb-6"
                >
                  {isGenerating ? 'Generating…' : 'Generate Content'}
                </button>

                {/* Generated Content - moved inside the same box */}
                <div className="border-t border-white/20 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-semibold text-foreground">Generated Content</h4>
                    {generatedContent && (
                      <button
                        onClick={() => copyToClipboard(generatedContent)}
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-[#111E63] text-white px-3 py-1.5 text-xs font-medium hover:bg-[#111E63] transition-none"
                      >
                        Copy
                      </button>
                    )}
                  </div>

                  {generatedContent ? (
                    <textarea
                      value={generatedContent}
                      onChange={(e) => setGeneratedContent(e.target.value)}
                      className="w-full min-h-[300px] rounded-md border border-transparent bg-white text-black p-4 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  ) : (
                    <div className="min-h-[300px] flex items-center justify-center text-muted-foreground text-center">
                      <div>
                        <p>Generated content will appear here</p>
                        <p className="text-sm">Enter a topic and click generate to start</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trending' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Trending Opportunities</h3>
              <div className="text-xs text-muted-foreground">
                Get ahead of competitors with these emerging trends
              </div>
            </div>
            
            {trendingOpportunities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trendingOpportunities.map((opportunity, index) => (
                  <div key={index} className="glass p-4 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-sm font-semibold text-foreground pr-2">
                        "{opportunity.query}"
                      </h4>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <TrendingUp className="w-3 h-3 text-green-600" />
                        <span className="text-xs font-medium text-green-600">
                          {opportunity.trendScore}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <p><strong>Why it's trending:</strong> {opportunity.reasoning}</p>
                      <p><strong>Action needed:</strong> {opportunity.suggestedContent}</p>
                      <p><strong>Timeline:</strong> {opportunity.timeWindow}</p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        opportunity.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                        opportunity.difficulty === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {opportunity.difficulty}
                      </span>
                      <button
                        onClick={() => {
                          setContentTopic(opportunity.query);
                          generateContent(opportunity.suggestedContent);
                        }}
                        className="px-3 py-1 text-xs bg-[#111E63] text-white rounded hover:opacity-90 transition-none"
                      >
                        Create Content
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass p-6 rounded-lg text-center">
                <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No trending opportunities found yet</p>
                <p className="text-xs text-muted-foreground mt-1">Run a health check to discover trending queries in your industry</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'website' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Website Analysis</h3>
            
            {websiteAnalysis ? (
              <div className="space-y-6">
                {/* Content Summary */}
                <div className="glass p-4 rounded-lg">
                  <h4 className="text-sm font-semibold mb-2 text-foreground">Content Summary</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {websiteAnalysis.analysis?.contentSummary || 'No summary available'}
                  </p>
                </div>

                {/* Key Topics */}
                {websiteAnalysis.analysis?.keyTopics?.length > 0 && (
                  <div className="glass p-4 rounded-lg">
                    <h4 className="text-sm font-semibold mb-2 text-foreground">Key Topics</h4>
                    <div className="flex flex-wrap gap-2">
                      {websiteAnalysis.analysis.keyTopics.map((topic: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-[#111E63] text-white rounded-full text-xs">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Optimization Opportunities */}
                {websiteAnalysis.analysis?.aiOptimizationOpportunities?.length > 0 && (
                  <div className="glass p-4 rounded-lg">
                    <h4 className="text-sm font-semibold mb-2 text-foreground">AI Optimization Opportunities</h4>
                    <ul className="space-y-2">
                      {websiteAnalysis.analysis.aiOptimizationOpportunities.map((opportunity: string, index: number) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start">
                          <span className="w-2 h-2 bg-[#111E63] rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          {opportunity}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Content Gaps */}
                {websiteAnalysis.analysis?.contentGaps?.length > 0 && (
                  <div className="glass p-4 rounded-lg">
                    <h4 className="text-sm font-semibold mb-2 text-foreground">Content Gaps</h4>
                    <ul className="space-y-2">
                      {websiteAnalysis.analysis.contentGaps.map((gap: string, index: number) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start">
                          <span className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {websiteAnalysis.analysis?.recommendations?.length > 0 && (
                  <div className="glass p-4 rounded-lg">
                    <h4 className="text-sm font-semibold mb-2 text-foreground">Recommendations</h4>
                    <ul className="space-y-2">
                      {websiteAnalysis.analysis.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start">
                          <span className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Analysis Timestamp */}
                <div className="text-xs text-muted-foreground text-center">
                  Analysis completed: {new Date(websiteAnalysis.fetchedAt).toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="glass p-6 rounded-lg text-center">
                <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-medium text-foreground mb-2">No Website Analysis Available</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Website analysis will be performed when you run a health check with a company website URL configured.
                </p>
                {!company?.website_url && (
                  <p className="text-xs text-muted-foreground">
                    Please add a website URL to your company profile to enable website analysis.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'authority' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Authority Intelligence</h3>
              {!authorityAnalysis && (
                <button
                  onClick={loadAuthorityAnalysis}
                  disabled={authorityLoading || !company}
                  className="px-3 py-1.5 text-xs bg-[#111E63] text-white rounded hover:opacity-90 transition-none disabled:opacity-50"
                >
                  {authorityLoading ? 'Analyzing...' : 'Analyze Authority'}
                </button>
              )}
            </div>
            
            {authorityAnalysis ? (
              <div className="space-y-6">
                {/* Authority Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="glass p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Users className="w-8 h-8 text-blue-500" />
                      <div>
                        <div className="text-2xl font-bold text-foreground">{authorityAnalysis.authorityOpportunities.length}</div>
                        <div className="text-sm text-muted-foreground">Opportunities</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="glass p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Award className="w-8 h-8 text-green-500" />
                      <div>
                        <div className="text-2xl font-bold text-foreground">{authorityAnalysis.actionPlan.immediate.length}</div>
                        <div className="text-sm text-muted-foreground">Quick Wins</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="glass p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Target className="w-8 h-8 text-purple-500" />
                      <div>
                        <div className="text-2xl font-bold text-foreground">{authorityAnalysis.competitorMentions.length}</div>
                        <div className="text-sm text-muted-foreground">Competitor Insights</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Action Plan */}
                <div className="glass p-4 rounded-lg">
                  <h4 className="text-sm font-semibold mb-3 text-foreground">30-Day Action Plan</h4>
                  <div className="space-y-3">
                    {authorityAnalysis.actionPlan.immediate.map((opportunity, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-green-800 mb-1">
                            {opportunity.source}
                          </div>
                          <div className="text-xs text-green-700 mb-2">
                            {opportunity.description}
                          </div>
                          <div className="text-xs text-green-600">
                            <strong>Action:</strong> {opportunity.actionRequired}
                          </div>
                          {opportunity.url && (
                            <a
                              href={opportunity.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block mt-2 px-2 py-1 text-xs bg-green-600 text-white rounded hover:opacity-90"
                            >
                              Visit Source
                            </a>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            opportunity.estimatedEffort === 'low' ? 'bg-green-100 text-green-700' :
                            opportunity.estimatedEffort === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {opportunity.estimatedEffort} effort
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            opportunity.potentialImpact === 'high' ? 'bg-purple-100 text-purple-700' :
                            opportunity.potentialImpact === 'medium' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {opportunity.potentialImpact} impact
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Industry Authority Sources */}
                {authorityAnalysis.industryAuthorities.length > 0 && (
                  <div className="glass p-4 rounded-lg">
                    <h4 className="text-sm font-semibold mb-2 text-foreground">Key Industry Authorities</h4>
                    <div className="flex flex-wrap gap-2">
                      {authorityAnalysis.industryAuthorities.map((authority, index) => (
                        <span key={index} className="px-2 py-1 bg-[#111E63] text-white rounded-full text-xs">
                          {authority}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Competitive Mentions */}
                {authorityAnalysis.competitorMentions.length > 0 && (
                  <div className="glass p-4 rounded-lg">
                    <h4 className="text-sm font-semibold mb-2 text-foreground">How Competitors Get Mentioned</h4>
                    <div className="space-y-3">
                      {authorityAnalysis.competitorMentions.map((mention, index) => (
                        <div key={index} className="p-3 bg-blue-50 rounded-lg">
                          <div className="text-sm font-medium text-blue-800 mb-1">
                            {mention.competitor} → {mention.source}
                          </div>
                          <div className="text-xs text-blue-700 mb-2">
                            <strong>Why:</strong> {mention.reasoning}
                          </div>
                          <div className="text-xs text-blue-600">
                            <strong>Your Opportunity:</strong> {mention.opportunityForYou}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Authority Opportunities */}
                <div className="glass p-4 rounded-lg">
                  <h4 className="text-sm font-semibold mb-2 text-foreground">All Authority Building Opportunities</h4>
                  <div className="space-y-3">
                    {authorityAnalysis.authorityOpportunities.map((opportunity, index) => (
                      <div key={index} className="p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-foreground mb-1">
                              {opportunity.source}
                            </div>
                            <div className="text-xs text-muted-foreground mb-2">
                              {opportunity.description}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <strong>Action:</strong> {opportunity.actionRequired}
                            </div>
                            {opportunity.contactInfo && (
                              <div className="text-xs text-muted-foreground mt-1">
                                <strong>Contact:</strong> {opportunity.contactInfo}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 ml-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              opportunity.type === 'directory' ? 'bg-blue-100 text-blue-700' :
                              opportunity.type === 'review_platform' ? 'bg-green-100 text-green-700' :
                              opportunity.type === 'industry_publication' ? 'bg-purple-100 text-purple-700' :
                              opportunity.type === 'podcast' ? 'bg-orange-100 text-orange-700' :
                              opportunity.type === 'award' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-pink-100 text-pink-700'
                            }`}>
                              {opportunity.type.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : authorityLoading ? (
              <div className="glass p-6 rounded-lg text-center">
                <div className="animate-spin w-8 h-8 border-2 border-[#111E63] border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Analyzing competitive authority landscape...</p>
                <p className="text-xs text-muted-foreground mt-1">This may take up to 30 seconds</p>
              </div>
            ) : (
              <div className="glass p-6 rounded-lg text-center">
                <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-medium text-foreground mb-2">Authority Intelligence Analysis</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Discover where your competitors get mentioned and find specific opportunities to build authority in your industry.
                </p>
                <button
                  onClick={loadAuthorityAnalysis}
                  disabled={!company}
                  className="px-4 py-2 bg-[#111E63] text-white rounded hover:opacity-90 transition-none disabled:opacity-50"
                >
                  Start Authority Analysis
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'progress' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Progress Tracking</h3>
              {!progressMetrics && (
                <button
                  onClick={loadProgressTracking}
                  disabled={progressLoading || !company || results.length === 0}
                  className="px-3 py-1.5 text-xs bg-[#111E63] text-white rounded hover:opacity-90 transition-none disabled:opacity-50"
                >
                  {progressLoading ? 'Analyzing...' : 'Track Progress'}
                </button>
              )}
            </div>
            
            {progressMetrics ? (
              <div className="space-y-6">
                {/* Overall Progress Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="glass p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                        progressMetrics.overallImprovement.mentionRateChange > 0 ? 'bg-green-100' :
                        progressMetrics.overallImprovement.mentionRateChange < 0 ? 'bg-red-100' : 'bg-gray-100'
                      }`}>
                        {progressMetrics.overallImprovement.mentionRateChange > 0 ? (
                          <ArrowUp className="w-4 h-4 text-green-600" />
                        ) : progressMetrics.overallImprovement.mentionRateChange < 0 ? (
                          <ArrowDown className="w-4 h-4 text-red-600" />
                        ) : (
                          <MinusIcon className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground">
                          {progressMetrics.overallImprovement.mentionRateChange > 0 ? '+' : ''}
                          {progressMetrics.overallImprovement.mentionRateChange.toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Mention Rate Change</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="glass p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                        progressMetrics.overallImprovement.positionImprovement > 0 ? 'bg-green-100' :
                        progressMetrics.overallImprovement.positionImprovement < 0 ? 'bg-red-100' : 'bg-gray-100'
                      }`}>
                        {progressMetrics.overallImprovement.positionImprovement > 0 ? (
                          <ArrowUp className="w-4 h-4 text-green-600" />
                        ) : progressMetrics.overallImprovement.positionImprovement < 0 ? (
                          <ArrowDown className="w-4 h-4 text-red-600" />
                        ) : (
                          <MinusIcon className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground">
                          {progressMetrics.overallImprovement.positionImprovement > 0 ? '+' : ''}
                          {progressMetrics.overallImprovement.positionImprovement.toFixed(1)}
                        </div>
                        <div className="text-sm text-muted-foreground">Position Change</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="glass p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                        progressMetrics.overallImprovement.trend === 'improving' ? 'bg-green-100' :
                        progressMetrics.overallImprovement.trend === 'declining' ? 'bg-red-100' : 'bg-gray-100'
                      }`}>
                        {progressMetrics.overallImprovement.trend === 'improving' ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : progressMetrics.overallImprovement.trend === 'declining' ? (
                          <ArrowDown className="w-4 h-4 text-red-600" />
                        ) : (
                          <MinusIcon className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground capitalize">
                          {progressMetrics.overallImprovement.trend}
                        </div>
                        <div className="text-sm text-muted-foreground">Overall Trend</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Specific Improvements */}
                {progressMetrics.specificImprovements.length > 0 && (
                  <div className="glass p-4 rounded-lg">
                    <h4 className="text-sm font-semibold mb-3 text-foreground">Specific Improvements</h4>
                    <div className="space-y-3">
                      {progressMetrics.specificImprovements.map((improvement, index) => (
                        <div key={index} className="p-3 bg-green-50 rounded-lg">
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-green-800 mb-1">
                                "{improvement.prompt.length > 80 ? improvement.prompt.substring(0, 80) + '...' : improvement.prompt}"
                              </div>
                              <div className="text-xs text-green-700 space-y-1">
                                <div>
                                  <strong>Status:</strong> {improvement.beforeMentioned ? 'Mentioned' : 'Not mentioned'} → {improvement.afterMentioned ? 'Mentioned' : 'Not mentioned'}
                                  {improvement.positionChange !== 0 && ` (Position change: ${improvement.positionChange > 0 ? '+' : ''}${improvement.positionChange})`}
                                </div>
                                {improvement.sentimentChange !== 'no change' && (
                                  <div><strong>Sentiment:</strong> {improvement.sentimentChange}</div>
                                )}
                                <div><strong>Likely reason:</strong> {improvement.likelyReason}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fix Attribution */}
                {progressMetrics.fixAttribution.length > 0 && (
                  <div className="glass p-4 rounded-lg">
                    <h4 className="text-sm font-semibold mb-3 text-foreground">Fix Attribution Analysis</h4>
                    <div className="space-y-3">
                      {progressMetrics.fixAttribution.map((fix, index) => (
                        <div key={index} className="p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-blue-800 mb-1">
                                {fix.fixType}: {fix.description}
                              </div>
                              <div className="text-xs text-blue-700 mb-2">
                                <strong>Prompts improved:</strong> {fix.promptsImproved.join(', ')}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  fix.estimatedImpact === 'high' ? 'bg-green-100 text-green-700' :
                                  fix.estimatedImpact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {fix.estimatedImpact} impact
                                </span>
                                <span className="text-xs text-blue-600">
                                  {fix.confidence}% confidence
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {progressMetrics.recommendations.length > 0 && (
                  <div className="glass p-4 rounded-lg">
                    <h4 className="text-sm font-semibold mb-3 text-foreground">Strategic Recommendations</h4>
                    <div className="space-y-3">
                      {progressMetrics.recommendations.map((rec, index) => (
                        <div key={index} className="p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <span className={`px-2 py-1 rounded-full text-xs flex-shrink-0 ${
                              rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                              rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {rec.priority} priority
                            </span>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-foreground mb-1">
                                {rec.action}
                              </div>
                              <div className="text-xs text-muted-foreground mb-1">
                                <strong>Reasoning:</strong> {rec.reasoning}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                <strong>Expected timeframe:</strong> {rec.expectedTimeframe}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                {progressMetrics.nextSteps.length > 0 && (
                  <div className="glass p-4 rounded-lg">
                    <h4 className="text-sm font-semibold mb-3 text-foreground">Next Steps</h4>
                    <ul className="space-y-2">
                      {progressMetrics.nextSteps.map((step, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start">
                          <span className="w-6 h-6 bg-[#111E63] text-white rounded-full text-xs flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                            {index + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : progressLoading ? (
              <div className="glass p-6 rounded-lg text-center">
                <div className="animate-spin w-8 h-8 border-2 border-[#111E63] border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Analyzing progress and attributing improvements...</p>
                <p className="text-xs text-muted-foreground mt-1">This may take up to 30 seconds</p>
              </div>
            ) : (
              <div className="glass p-6 rounded-lg text-center">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-medium text-foreground mb-2">Progress Tracking & Attribution</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Track your improvements over time and see which fixes are making the biggest impact on your AI visibility.
                </p>
                {!previousResults ? (
                  <div className="text-xs text-muted-foreground mb-4">
                    Run multiple health checks over time to track your progress and improvement attribution.
                  </div>
                ) : null}
                <button
                  onClick={loadProgressTracking}
                  disabled={!company || results.length === 0}
                  className="px-4 py-2 bg-[#111E63] text-white rounded hover:opacity-90 transition-none disabled:opacity-50"
                >
                  {results.length === 0 ? 'Run Health Check First' : 'Analyze Progress'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsSection;