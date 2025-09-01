import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, BarChart3, CheckCircle, FileText, Lightbulb, Download, Printer, Copy, Plus, Minus, Globe, Code, Eye, Wrench, Award, Users, Clock, ArrowUp, ArrowDown, Minus as MinusIcon, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ResultDetailsModal from './result-details-modal';

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


interface CompetitorProfile {
  name: string;
  estimatedMentionRate: number;
  avgPosition: number;
  strengths: string[];
  weaknesses: string[];
  keyDifferentiators: string[];
}

interface IndustryBenchmark {
  industry: string;
  averageMentionRate: number;
  topPercentileMentionRate: number;
  medianPosition: number;
  commonStrengths: string[];
  commonWeaknesses: string[];
  industrySpecificOpportunities: string[];
  competitiveLandscape: {
    leaders: CompetitorProfile[];
    emerging: CompetitorProfile[];
    challenges: string[];
  };
  performanceAnalysis: {
    relativePosition: 'leader' | 'above average' | 'average' | 'below average' | 'needs improvement';
    percentileRank: number;
    gapToLeaders: number;
    gapToAverage: number;
    improvementPotential: number;
  };
  actionableInsights: {
    priority: 'high' | 'medium' | 'low';
    insight: string;
    rationale: string;
    expectedImpact: string;
  }[];
  benchmarkingRecommendations: string[];
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
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
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
  trendingOpportunities = [],
  activeTab: externalActiveTab,
  onTabChange: externalOnTabChange
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState('results');
  
  // Use external activeTab if provided, otherwise use internal
  const activeTab = externalActiveTab || internalActiveTab;
  const setActiveTab = externalOnTabChange || setInternalActiveTab;
  const [showAllResults, setShowAllResults] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const [cmsDetection, setCmsDetection] = useState<CMSDetection | null>(null);
  const [smartFixes, setSmartFixes] = useState<{ [key: string]: SmartFix }>({});
  const [generatingFix, setGeneratingFix] = useState<string | null>(null);
  const [authorityAnalysis, setAuthorityAnalysis] = useState<CompetitiveAuthorityAnalysis | null>(null);
  const [authorityLoading, setAuthorityLoading] = useState(false);
  const [industryBenchmark, setIndustryBenchmark] = useState<IndustryBenchmark | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Persist active tab in localStorage (only when using internal state)
  useEffect(() => {
    if (!externalActiveTab) {
      const savedTab = localStorage.getItem('activeResultsTab');
      if (savedTab && (savedTab === 'results' || savedTab === 'website' || savedTab === 'benchmark' || savedTab === 'authority' || savedTab === 'trending')) {
        setInternalActiveTab(savedTab);
      }
    }
  }, [externalActiveTab]);


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

  // Auto-load all analyses when results change (new health check)
  useEffect(() => {
    if (results.length > 0 && company) {
      // Load authority analysis if not already loaded or if results changed
      if (!authorityAnalysis && !authorityLoading) {
        loadAuthorityAnalysis();
      }
      
      // Load industry benchmark if not already loaded or if results changed
      if (!industryBenchmark && !benchmarkLoading) {
        loadIndustryBenchmark();
      }
    }
  }, [results.length, company]);

  // Reset analyses when results change (new test run)
  useEffect(() => {
    setAuthorityAnalysis(null);
    setIndustryBenchmark(null);
  }, [results]);

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


  const loadIndustryBenchmark = async () => {
    if (!company || benchmarkLoading || !results.length) return;
    
    setBenchmarkLoading(true);
    try {
      const mentionRate = results.length > 0 ? Math.round((results.filter(r => r.mentioned).length / results.length) * 100) : 0;
      const avgPosition = results.filter(r => r.mentioned).length > 0 
        ? Math.round(results.filter(r => r.mentioned).reduce((sum, r) => sum + r.position, 0) / results.filter(r => r.mentioned).length)
        : 0;

      const { data, error } = await supabase.functions.invoke('industry-benchmarking', {
        body: {
          industry: company.industry,
          companyName: company.company_name,
          currentMentionRate: mentionRate,
          currentAvgPosition: avgPosition
        }
      });

      if (!error && data?.benchmark) {
        setIndustryBenchmark(data.benchmark);
        console.log('Industry benchmarking completed:', data.benchmark);
      }
    } catch (error) {
      console.error('Error loading industry benchmark:', error);
    } finally {
      setBenchmarkLoading(false);
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
    if (!externalOnTabChange) {
      localStorage.setItem('activeResultsTab', tabId);
    }
  };

  const handleOpenModal = (result: TestResult) => {
    setSelectedResult(result);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedResult(null);
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
      {/* Tab Content */}
      <div className="w-full">
        {activeTab === 'results' && (
          <div>

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-serif font-semibold tracking-tight">Results</h3>
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


            {/* Simplified Results List */}
            <div className="space-y-2">
              {results.map((result, index) => {
                const displaySummary = result.context || 
                  (result.response && result.response.length > 100 ? result.response.slice(0, 100) + '...' : result.response) ||
                  'No summary available';
                
                const getSentimentIcon = () => {
                  switch (result.sentiment) {
                    case 'positive':
                      return <CheckCircle className="w-4 h-4 text-green-600" />;
                    case 'negative':
                      return <MinusIcon className="w-4 h-4 text-red-600" />;
                    default:
                      return <Minus className="w-4 h-4 text-yellow-600" />;
                  }
                };

                return (
                  <div key={index} className="p-4 glass rounded-lg hover:bg-white/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <div className="font-serif font-medium text-foreground mb-1">
                          {result.prompt}
                        </div>
                        <div className="body-copy text-sm text-muted-foreground leading-relaxed">
                          {displaySummary}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {/* Status Dot */}
                        <div className={`w-3 h-3 rounded-full ${
                          result.mentioned ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        
                        {/* Position */}
                        {result.mentioned && result.position && (
                          <span className="font-serif text-sm font-medium text-foreground">
                            #{result.position}
                          </span>
                        )}
                        
                        {/* Sentiment Icon */}
                        <div className="flex items-center">
                          {getSentimentIcon()}
                        </div>
                        
                        {/* Plus Button */}
                        <button
                          onClick={() => handleOpenModal(result)}
                          className="flex items-center justify-center w-8 h-8 rounded-full bg-transparent hover:bg-[#E7E2F9] hover:text-white transition-colors"
                          title="View details"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                      <span className="px-3 py-1 text-xs bg-[#111E63] text-white rounded">
                        {opportunity.difficulty} to implement
                      </span>
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
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Authority Intelligence</h3>
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


        {activeTab === 'benchmark' && (
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Industry Benchmark</h3>
            </div>
            
            {industryBenchmark ? (
              <div className="space-y-6">
                {/* Performance Analysis Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="glass p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                        industryBenchmark.performanceAnalysis.relativePosition === 'leader' ? 'bg-green-100' :
                        industryBenchmark.performanceAnalysis.relativePosition === 'above average' ? 'bg-blue-100' :
                        industryBenchmark.performanceAnalysis.relativePosition === 'average' ? 'bg-yellow-100' :
                        'bg-red-100'
                      }`}>
                        <Activity className={`w-4 h-4 ${
                          industryBenchmark.performanceAnalysis.relativePosition === 'leader' ? 'text-green-600' :
                          industryBenchmark.performanceAnalysis.relativePosition === 'above average' ? 'text-blue-600' :
                          industryBenchmark.performanceAnalysis.relativePosition === 'average' ? 'text-yellow-600' :
                          'text-red-600'
                        }`} />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground capitalize">
                          {industryBenchmark.performanceAnalysis.relativePosition.replace(' ', '-')}
                        </div>
                        <div className="text-sm text-muted-foreground">Relative Position</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="glass p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Target className="w-8 h-8 text-purple-500" />
                      <div>
                        <div className="text-2xl font-bold text-foreground">
                          {industryBenchmark.performanceAnalysis.percentileRank}th
                        </div>
                        <div className="text-sm text-muted-foreground">Percentile Rank</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="glass p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-8 h-8 text-green-500" />
                      <div>
                        <div className="text-2xl font-bold text-foreground">
                          +{industryBenchmark.performanceAnalysis.improvementPotential}%
                        </div>
                        <div className="text-sm text-muted-foreground">Improvement Potential</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Industry Comparison */}
                <div className="glass p-4 rounded-lg">
                  <h4 className="text-sm font-semibold mb-3 text-foreground">Industry Performance Comparison</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-muted-foreground">Industry Average</div>
                      <div className="text-lg font-semibold">{industryBenchmark.averageMentionRate}%</div>
                      <div className="text-xs text-muted-foreground">mention rate</div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-xs text-muted-foreground">Top Performers (90th percentile)</div>
                      <div className="text-lg font-semibold">{industryBenchmark.topPercentileMentionRate}%</div>
                      <div className="text-xs text-muted-foreground">mention rate</div>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="text-xs text-muted-foreground">Median Position</div>
                      <div className="text-lg font-semibold">#{industryBenchmark.medianPosition}</div>
                      <div className="text-xs text-muted-foreground">when mentioned</div>
                    </div>
                  </div>
                </div>

                {/* Gap Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="glass p-4 rounded-lg">
                    <h4 className="text-sm font-semibold mb-3 text-foreground">Performance Gaps</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                        <span className="text-sm text-red-800">Gap to Leaders</span>
                        <span className="text-sm font-semibold text-red-600">-{industryBenchmark.performanceAnalysis.gapToLeaders}%</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                        <span className="text-sm text-yellow-800">Gap to Average</span>
                        <span className="text-sm font-semibold text-yellow-600">
                          {industryBenchmark.performanceAnalysis.gapToAverage > 0 ? '+' : ''}{industryBenchmark.performanceAnalysis.gapToAverage}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="glass p-4 rounded-lg">
                    <h4 className="text-sm font-semibold mb-3 text-foreground">Industry Challenges</h4>
                    <ul className="space-y-2">
                      {industryBenchmark.competitiveLandscape.challenges.map((challenge, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start">
                          <span className="w-2 h-2 bg-orange-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          {challenge}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Competitive Landscape */}
                {(industryBenchmark.competitiveLandscape.leaders.length > 0 || industryBenchmark.competitiveLandscape.emerging.length > 0) && (
                  <div className="glass p-4 rounded-lg">
                    <h4 className="text-sm font-semibold mb-3 text-foreground">Competitive Landscape</h4>
                    
                    {industryBenchmark.competitiveLandscape.leaders.length > 0 && (
                      <div className="mb-4">
                        <div className="text-xs font-medium text-muted-foreground mb-2">Industry Leaders</div>
                        <div className="space-y-2">
                          {industryBenchmark.competitiveLandscape.leaders.map((leader, index) => (
                            <div key={index} className="p-3 bg-green-50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-medium text-green-800">{leader.name}</div>
                                <div className="text-xs text-green-600">
                                  {leader.estimatedMentionRate}% • #{leader.avgPosition} avg
                                </div>
                              </div>
                              <div className="text-xs text-green-700 space-y-1">
                                <div><strong>Strengths:</strong> {leader.strengths.join(', ')}</div>
                                <div><strong>Key differentiators:</strong> {leader.keyDifferentiators.join(', ')}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {industryBenchmark.competitiveLandscape.emerging.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2">Emerging Competitors</div>
                        <div className="space-y-2">
                          {industryBenchmark.competitiveLandscape.emerging.map((competitor, index) => (
                            <div key={index} className="p-3 bg-blue-50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-medium text-blue-800">{competitor.name}</div>
                                <div className="text-xs text-blue-600">
                                  {competitor.estimatedMentionRate}% • #{competitor.avgPosition} avg
                                </div>
                              </div>
                              <div className="text-xs text-blue-700 space-y-1">
                                <div><strong>Strengths:</strong> {competitor.strengths.join(', ')}</div>
                                <div><strong>Key differentiators:</strong> {competitor.keyDifferentiators.join(', ')}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Actionable Insights */}
                {industryBenchmark.actionableInsights.length > 0 && (
                  <div className="glass p-4 rounded-lg">
                    <h4 className="text-sm font-semibold mb-3 text-foreground">Strategic Insights</h4>
                    <div className="space-y-3">
                      {industryBenchmark.actionableInsights.map((insight, index) => (
                        <div key={index} className="p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <span className={`px-2 py-1 rounded-full text-xs flex-shrink-0 ${
                              insight.priority === 'high' ? 'bg-red-100 text-red-700' :
                              insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {insight.priority} priority
                            </span>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-foreground mb-1">
                                {insight.insight}
                              </div>
                              <div className="text-xs text-muted-foreground mb-1">
                                <strong>Why it matters:</strong> {insight.rationale}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                <strong>Expected impact:</strong> {insight.expectedImpact}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Benchmarking Recommendations */}
                {industryBenchmark.benchmarkingRecommendations.length > 0 && (
                  <div className="glass p-4 rounded-lg">
                    <h4 className="text-sm font-semibold mb-3 text-foreground">Next Steps</h4>
                    <ul className="space-y-2">
                      {industryBenchmark.benchmarkingRecommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start">
                          <span className="w-6 h-6 bg-[#111E63] text-white rounded-full text-xs flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                            {index + 1}
                          </span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : benchmarkLoading ? (
              <div className="glass p-6 rounded-lg text-center">
                <div className="animate-spin w-8 h-8 border-2 border-[#111E63] border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Analyzing industry benchmarks and competitive landscape...</p>
                <p className="text-xs text-muted-foreground mt-1">This may take up to 30 seconds</p>
              </div>
            ) : (
              <div className="glass p-6 rounded-lg text-center">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-medium text-foreground mb-2">Industry Benchmarking Analysis</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Compare your AI visibility performance against industry leaders and identify strategic opportunities to outperform competitors.
                </p>
                <button
                  onClick={loadIndustryBenchmark}
                  disabled={!company || results.length === 0}
                  className="px-4 py-2 bg-[#111E63] text-white rounded hover:opacity-90 transition-none disabled:opacity-50"
                >
                  {results.length === 0 ? 'Run Health Check First' : 'Analyze Benchmarks'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Result Details Modal */}
      <ResultDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        result={selectedResult}
      />
    </div>
  );
};

export default ResultsSection;