import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, BarChart3, CheckCircle, FileText, Lightbulb, Download, Printer, Copy, Plus, Minus, Globe, Code, Eye, Wrench, Award, Users, Clock, ArrowUp, ArrowDown, Minus as MinusIcon, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import AnswerModal from './answer-modal';
import RecommendationsModal from './recommendations-modal';
import ExportButtons from './export-buttons';

// ... (keeping all the interfaces exactly the same)

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
  authorityAnalysis?: any;
  industryBenchmark?: any;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

const ResultsSection: React.FC<ResultsSectionProps> = ({
  isVisible,
  results = [],
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
  authorityAnalysis,
  industryBenchmark,
  activeTab: externalActiveTab,
  onTabChange: externalOnTabChange
}) => {
  const [activeTab, setActiveTab] = useState(externalActiveTab || 'results');
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const [showSmartFix, setShowSmartFix] = useState<{[key: number]: boolean}>({});
  const [smartFixes, setSmartFixes] = useState<{[key: number]: SmartFix}>({});
  const [isGenerating, setIsGenerating] = useState<{[key: number]: boolean}>({});
  const [cmsDetection, setCmsDetection] = useState<CMSDetection | null>(null);
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [isAnswerModalOpen, setIsAnswerModalOpen] = useState(false);
  const [isRecommendationsModalOpen, setIsRecommendationsModalOpen] = useState(false);

  useEffect(() => {
    if (externalActiveTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);

  useEffect(() => {
    if (externalOnTabChange && activeTab !== externalActiveTab) {
      externalOnTabChange(activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    // Reset expanded results when results change
    setExpandedResults(new Set());
  }, [results.length]);

  // Detect CMS when component mounts
  useEffect(() => {
    if (company?.website_url && !cmsDetection) {
      detectWebsiteCMS(company.website_url);
    }
  }, [company?.website_url]);

  // Note: Authority and benchmark analyses are now loaded during health check
  // and passed as props from CleanGeoPage

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

  const handleOpenAnswerModal = (result: TestResult) => {
    setSelectedResult(result);
    setIsAnswerModalOpen(true);
  };

  const handleOpenRecommendationsModal = (result: TestResult) => {
    setSelectedResult(result);
    setIsRecommendationsModalOpen(true);
  };

  const generateSmartFix = async (result: TestResult, category: string) => {
    if (!company || !result.failureAnalysis) return;
    
    const key = results.indexOf(result);
    setIsGenerating(prev => ({ ...prev, [key]: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-smart-fix', {
        body: {
          companyInfo: {
            name: company.company_name,
            industry: company.industry,
            description: company.description,
            website: company.website_url,
            differentiators: company.key_differentiators
          },
          prompt: result.prompt,
          failureAnalysis: result.failureAnalysis,
          cmsDetection: cmsDetection
        }
      });

      if (!error && data?.fix) {
        setSmartFixes(prev => ({ ...prev, [key]: data.fix }));
        console.log('Smart fix generated:', data.fix);
      }
    } catch (error) {
      console.error('Error generating smart fix:', error);
    } finally {
      setIsGenerating(prev => ({ ...prev, [key]: false }));
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'content': return 'bg-blue-100 text-blue-700';
      case 'authority': return 'bg-purple-100 text-purple-700';
      case 'technical': return 'bg-orange-100 text-orange-700';
      case 'competition': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700';
      case 'moderate': return 'bg-yellow-100 text-yellow-700';
      case 'needs-dev': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (!isVisible) return null;

  // Create export functions for each tab
  const exportWebsiteAnalysis = () => {
    if (!websiteAnalysis) return;
    const data = JSON.stringify(websiteAnalysis, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'website-analysis.json';
    a.click();
  };

  const exportAuthorityAnalysis = () => {
    if (!authorityAnalysis) return;
    const data = JSON.stringify(authorityAnalysis, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'authority-analysis.json';
    a.click();
  };

  const exportBenchmarkData = () => {
    if (!industryBenchmark) return;
    const data = JSON.stringify(industryBenchmark, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'benchmark-data.json';
    a.click();
  };

  // Animation classes for tab transitions
  const tabContentClass = "animate-fade-in";

  return (
    <div className="relative">
      <div className="w-full">
        {activeTab === 'results' && (
          <div className={tabContentClass}>
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
                  <div key={index} className="glass rounded-lg p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="prompt-text text-xs font-medium mb-1 truncate">
                          {result.prompt}
                        </h4>
                        <div className="body-copy text-xs text-muted-foreground leading-tight">
                          {displaySummary}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Status Dot */}
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          result.mentioned ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        
                        {/* Position */}
                        {result.mentioned && result.position && (
                          <span className="page-title text-xs font-medium">
                            #{result.position}
                          </span>
                        )}
                        
                        {/* Sentiment Icon */}
                        <div className="flex items-center">
                          {getSentimentIcon()}
                        </div>
                        
                        {/* Two Action Buttons */}
                        <button
                          onClick={() => handleOpenAnswerModal(result)}
                          className="px-2 py-1 text-xs button-text bg-transparent hover:bg-[#5F209B] hover:text-white transition-colors rounded border border-gray-300"
                          title="See full answer"
                        >
                          See full answer
                        </button>
                        
                        <button
                          onClick={() => handleOpenRecommendationsModal(result)}
                          className="px-2 py-1 text-xs button-text bg-transparent hover:bg-[#5F209B] hover:text-white transition-colors rounded border border-gray-300"
                          title="View recommendations"
                        >
                          Recommendations
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Export buttons at bottom */}
            <ExportButtons
              onExportCsv={onExportCsv}
              onPrintReport={onPrintReport}
              onCopyResults={onCopyResults}
              className="mt-6"
            />
          </div>
        )}


        {activeTab === 'trending' && (
          <div className={tabContentClass}>
            {trendingOpportunities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trendingOpportunities.map((opportunity, index) => (
                  <div key={index} className="glass p-4 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="h4 pr-2">
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
                      <span className="px-3 py-1 text-xs bg-[#5F209B] text-white rounded">
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
          <div className={tabContentClass}>
            {(() => {
              console.log('🌐 WEBSITE TAB DEBUG: Rendering website tab', {
                hasWebsiteAnalysis: !!websiteAnalysis,
                websiteAnalysisKeys: websiteAnalysis ? Object.keys(websiteAnalysis) : [],
                hasAnalysisObject: !!websiteAnalysis?.analysis,
                analysisKeys: websiteAnalysis?.analysis ? Object.keys(websiteAnalysis.analysis) : [],
                hasError: !!websiteAnalysis?.error,
                error: websiteAnalysis?.error
              });
              return null;
            })()}
            {websiteAnalysis ? (
              <div className="space-y-6">
                {/* Content Summary */}
                <div className="section-container">
                  <div className="section-title">
                    <h4 className="h4">Content Summary</h4>
                  </div>
                  <div className="content-box">
                    <div className="glass p-4 rounded-lg">
                      <p className="body-copy text-xs leading-relaxed">
                        {websiteAnalysis.analysis?.contentSummary || 'No summary available'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Key Topics */}
                {websiteAnalysis.analysis?.keyTopics?.length > 0 && (
                  <div className="section-container">
                    <div className="section-title">
                      <h4 className="h4">Key Topics</h4>
                    </div>
                    <div className="content-box">
                      <div className="glass p-4 rounded-lg">
                        <div className="flex flex-wrap gap-2">
                          {websiteAnalysis.analysis.keyTopics.map((topic: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-[#5F209B] text-white rounded-full text-xs">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Optimization Opportunities */}
                {websiteAnalysis.analysis?.aiOptimizationOpportunities?.length > 0 && (
                  <div className="section-container">
                    <div className="section-title">
                      <h4 className="h4">AI Optimization Opportunities</h4>
                    </div>
                    <div className="content-box">
                      <div className="glass p-4 rounded-lg">
                        <ul className="space-y-2">
                          {websiteAnalysis.analysis.aiOptimizationOpportunities.map((opportunity: string, index: number) => (
                            <li key={index} className="body-copy text-xs flex items-start">
                              <span className="w-2 h-2 bg-[#5F209B] rounded-full mt-2 mr-2 flex-shrink-0"></span>
                              {opportunity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Content Gaps */}
                {websiteAnalysis.analysis?.contentGaps?.length > 0 && (
                  <div className="section-container">
                    <div className="section-title">
                      <h4 className="h4">Content Gaps</h4>
                    </div>
                    <div className="content-box">
                      <div className="glass p-4 rounded-lg">
                        <ul className="space-y-2">
                          {websiteAnalysis.analysis.contentGaps.map((gap: string, index: number) => (
                            <li key={index} className="body-copy text-xs flex items-start">
                              <span className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                              {gap}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {websiteAnalysis.analysis?.recommendations?.length > 0 && (
                  <div className="section-container">
                    <div className="section-title">
                      <h4 className="h4">Recommendations</h4>
                    </div>
                    <div className="content-box">
                      <div className="glass p-4 rounded-lg">
                        <ul className="space-y-2">
                          {websiteAnalysis.analysis.recommendations.map((rec: string, index: number) => (
                            <li key={index} className="body-copy text-xs flex items-start">
                              <span className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Analysis Timestamp */}
                <div className="text-xs text-muted-foreground text-center">
                  Analysis completed: {new Date(websiteAnalysis.fetchedAt).toLocaleString()}
                </div>
                
                {/* Export buttons at bottom */}
                <ExportButtons
                  onExportCsv={() => exportWebsiteAnalysis()}
                  onPrintReport={onPrintReport}
                  className="mt-6"
                />
              </div>
            ) : (
              <div className="glass p-6 rounded-lg text-center">
                <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="h4 mb-2">No Website Analysis Available</h4>
                <p className="body-copy text-xs mb-4">
                  Website analysis will be performed when you run a health check with a company website URL configured.
                </p>
                {!company?.website_url && (
                  <p className="body-copy text-xs">
                    Please add a website URL to your company profile to enable website analysis.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'authority' && (
          <div className={tabContentClass}>
            {authorityAnalysis ? (
              <div className="space-y-6">
                {/* Authority Overview */}
                <div className="section-container">
                  <div className="section-title">
                    <h4 className="h4">Authority Overview</h4>
                  </div>
                  <div className="content-box">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="glass p-4 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Users className="w-8 h-8 text-muted-foreground" />
                          <div>
                            <div className="text-2xl font-bold text-foreground">{authorityAnalysis.authorityOpportunities.length}</div>
                            <div className="text-sm text-muted-foreground">Opportunities</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="glass p-4 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Award className="w-8 h-8 text-muted-foreground" />
                          <div>
                            <div className="text-2xl font-bold text-foreground">{authorityAnalysis.actionPlan.immediate.length}</div>
                            <div className="text-sm text-muted-foreground">Quick Wins</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="glass p-4 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Target className="w-8 h-8 text-muted-foreground" />
                          <div>
                            <div className="text-2xl font-bold text-foreground">{authorityAnalysis.competitorMentions.length}</div>
                            <div className="text-sm text-muted-foreground">Competitor Insights</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Action Plan */}
                <div className="section-container">
                  <div className="section-title">
                    <h4 className="h4">30-Day Action Plan</h4>
                  </div>
                  <div className="content-box">
                    <div className="glass p-4 rounded-lg">
                      <div className="space-y-3">
                        {authorityAnalysis.actionPlan.immediate.map((opportunity: any, index: number) => (
                          <div key={index} className="p-3 authority-card rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="page-title text-sm font-medium mb-1">
                                  {opportunity.source}
                                </div>
                                <div className="body-copy text-xs mb-2">
                                  {opportunity.description}
                                </div>
                                <div className="body-copy text-xs">
                                  <strong>Action:</strong> {opportunity.actionRequired}
                                </div>
                              </div>
                              {opportunity.url && (
                                <a
                                  href={opportunity.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block mt-2 px-2 py-1 text-xs button-text bg-[#5F209B] text-white rounded hover:opacity-90"
                                >
                                  Visit Source
                                </a>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="info-badge px-2 py-1 rounded-full text-xs">
                                {opportunity.estimatedEffort} effort
                              </span>
                              <span className="info-badge px-2 py-1 rounded-full text-xs">
                                {opportunity.potentialImpact} impact
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Industry Authority Sources */}
                {authorityAnalysis.industryAuthorities.length > 0 && (
                  <div className="section-container">
                    <div className="section-title">
                      <h4 className="h4">Key Industry Authorities</h4>
                    </div>
                    <div className="content-box">
                      <div className="glass p-4 rounded-lg">
                        <div className="flex flex-wrap gap-2">
                          {authorityAnalysis.industryAuthorities.map((authority: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-[#5F209B] text-white rounded-full text-xs">
                              {authority}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Competitive Mentions */}
                {authorityAnalysis.competitorMentions.length > 0 && (
                  <div className="section-container">
                    <div className="section-title">
                      <h4 className="h4">How Competitors Get Mentioned</h4>
                    </div>
                    <div className="content-box">
                      <div className="glass p-4 rounded-lg">
                        <div className="space-y-3">
                          {authorityAnalysis.competitorMentions.map((mention: any, index: number) => (
                            <div key={index} className="authority-card p-3 rounded-lg">
                              <div className="page-title text-sm font-medium mb-1">
                                {mention.competitor} → {mention.source}
                              </div>
                              <div className="body-copy text-xs mb-2">
                                <strong>Why:</strong> {mention.reasoning}
                              </div>
                              <div className="body-copy text-xs">
                                <strong>Your Opportunity:</strong> {mention.opportunityForYou}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* All Authority Opportunities */}
                <div className="section-container">
                  <div className="section-title">
                    <h4 className="h4">All Authority Building Opportunities</h4>
                  </div>
                  <div className="content-box">
                    <div className="glass p-4 rounded-lg">
                      <div className="space-y-3">
                        {authorityAnalysis.authorityOpportunities.map((opportunity: any, index: number) => (
                          <div key={index} className="authority-card p-3 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="page-title text-sm font-medium mb-1">
                              {opportunity.source}
                            </div>
                            <div className="body-copy text-xs mb-2">
                              {opportunity.description}
                            </div>
                            <div className="body-copy text-xs">
                              <strong>Action:</strong> {opportunity.actionRequired}
                            </div>
                            {opportunity.contactInfo && (
                              <div className="body-copy text-xs mt-1">
                                <strong>Contact:</strong> {opportunity.contactInfo}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 ml-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              opportunity.estimatedEffort === 'low' ? 'bg-green-100 text-green-700' :
                              opportunity.estimatedEffort === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {opportunity.estimatedEffort} effort
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              opportunity.potentialImpact === 'high' ? 'bg-green-100 text-green-700' :
                              opportunity.potentialImpact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {opportunity.potentialImpact} impact
                            </span>
                          </div>
                        </div>
                      </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Export buttons at bottom */}
                <ExportButtons
                  onExportCsv={() => exportAuthorityAnalysis()}
                  onPrintReport={onPrintReport}
                  className="mt-6"
                />
              </div>
            ) : (
              <div className="glass p-6 rounded-lg text-center">
                <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="h4 mb-2">Authority Intelligence Analysis</h4>
                <p className="body-copy text-xs mb-4">
                  Authority analysis will be performed automatically when you run a health check.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'benchmark' && (
          <div className={tabContentClass}>
            {industryBenchmark ? (
              <div className="space-y-6">
                {/* Performance Analysis Overview */}
                <div className="section-container">
                  <div className="section-title">
                    <h4 className="h4">Performance Analysis Overview</h4>
                  </div>
                  <div className="content-box">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="glass p-4 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white">
                            <Activity className="w-4 h-4 text-muted-foreground" />
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
                          <Target className="w-8 h-8 text-muted-foreground" />
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
                          <TrendingUp className="w-8 h-8 text-muted-foreground" />
                          <div>
                            <div className="text-2xl font-bold text-foreground">
                              +{industryBenchmark.performanceAnalysis.improvementPotential}%
                            </div>
                            <div className="text-sm text-muted-foreground">Improvement Potential</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Industry Comparison */}
                <div className="section-container">
                  <div className="section-title">
                    <h4 className="h4">Industry Comparison</h4>
                  </div>
                  <div className="content-box">
                    <div className="glass p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-3 glass rounded-lg">
                          <div className="text-xs text-muted-foreground">Industry Average</div>
                          <div className="text-lg font-semibold">{industryBenchmark.averageMentionRate}%</div>
                          <div className="text-xs text-muted-foreground">mention rate</div>
                        </div>
                        <div className="p-3 glass rounded-lg">
                          <div className="text-xs text-muted-foreground">Top Performers (90th percentile)</div>
                          <div className="text-lg font-semibold">{industryBenchmark.topPercentileMentionRate}%</div>
                          <div className="text-xs text-muted-foreground">mention rate</div>
                        </div>
                        <div className="p-3 glass rounded-lg">
                          <div className="text-xs text-muted-foreground">Median Position</div>
                          <div className="text-lg font-semibold">#{industryBenchmark.medianPosition}</div>
                          <div className="text-xs text-muted-foreground">when mentioned</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gap Analysis */}
                <div className="section-container">
                  <div className="section-title">
                    <h4 className="h4">Gap Analysis</h4>
                  </div>
                  <div className="content-box">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="glass p-4 rounded-lg">
                        <h4 className="h4 mb-3">Performance Gaps</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-2 glass rounded">
                            <span className="text-sm text-muted-foreground">Gap to Leaders</span>
                            <span className="text-sm font-semibold text-foreground">-{industryBenchmark.performanceAnalysis.gapToLeaders}%</span>
                          </div>
                          <div className="flex items-center justify-between p-2 glass rounded">
                            <span className="text-sm text-muted-foreground">Gap to Average</span>
                            <span className="text-sm font-semibold text-foreground">
                              {industryBenchmark.performanceAnalysis.gapToAverage > 0 ? '+' : ''}{industryBenchmark.performanceAnalysis.gapToAverage}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="glass p-4 rounded-lg">
                        <h4 className="h4 mb-3">Industry Challenges</h4>
                        <ul className="space-y-2">
                          {industryBenchmark.competitiveLandscape.challenges.map((challenge: string, index: number) => (
                            <li key={index} className="body-copy text-xs flex items-start">
                              <span className="w-2 h-2 bg-muted-foreground rounded-full mt-2 mr-2 flex-shrink-0"></span>
                              {challenge}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Industry Leaders */}
                {(industryBenchmark.competitiveLandscape.leaders.length > 0 || industryBenchmark.competitiveLandscape.emerging.length > 0) && (
                  <div className="section-container">
                    <div className="section-title">
                      <h4 className="h4">Industry Leaders</h4>
                    </div>
                    <div className="content-box">
                      <div className="glass p-4 rounded-lg">
                        {industryBenchmark.competitiveLandscape.leaders.length > 0 && (
                          <div className="mb-4">
                            <div className="text-xs font-medium text-muted-foreground mb-2">Industry Leaders</div>
                            <div className="space-y-2">
                              {industryBenchmark.competitiveLandscape.leaders.map((leader: CompetitorProfile, index: number) => (
                                <div key={index} className="p-3 glass rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm font-medium text-foreground">{leader.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {leader.estimatedMentionRate}% • #{leader.avgPosition} avg
                                    </div>
                                  </div>
                                  <div className="text-xs text-muted-foreground space-y-1">
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
                              {industryBenchmark.competitiveLandscape.emerging.map((competitor: CompetitorProfile, index: number) => (
                                <div key={index} className="p-3 glass rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm font-medium text-foreground">{competitor.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {competitor.estimatedMentionRate}% • #{competitor.avgPosition} avg
                                    </div>
                                  </div>
                                  <div className="text-xs text-muted-foreground space-y-1">
                                    <div><strong>Strengths:</strong> {competitor.strengths.join(', ')}</div>
                                    <div><strong>Key differentiators:</strong> {competitor.keyDifferentiators.join(', ')}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Strategic Insights */}
                {industryBenchmark.actionableInsights.length > 0 && (
                  <div className="section-container">
                    <div className="section-title">
                      <h4 className="h4">Strategic Insights</h4>
                    </div>
                    <div className="content-box">
                      <div className="glass p-4 rounded-lg">
                        <div className="space-y-3">
                          {industryBenchmark.actionableInsights.map((insight: any, index: number) => (
                            <div key={index} className={`p-3 rounded-lg ${
                              insight.priority === 'high' ? 'bg-red-50 border border-red-200' :
                              insight.priority === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
                              'bg-green-50 border border-green-200'
                            }`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  insight.priority === 'high' ? 'bg-red-100 text-red-700' :
                                  insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {insight.priority} priority
                                </span>
                              </div>
                              <h5 className="text-sm font-medium mb-1">{insight.insight}</h5>
                              <p className="text-xs text-muted-foreground mb-2">{insight.rationale}</p>
                              <p className="text-xs"><strong>Expected impact:</strong> {insight.expectedImpact}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                {industryBenchmark.benchmarkingRecommendations.length > 0 && (
                  <div className="section-container">
                    <div className="section-title">
                      <h4 className="h4">Next Steps</h4>
                    </div>
                    <div className="content-box">
                      <div className="glass p-4 rounded-lg">
                        <ul className="space-y-2">
                          {industryBenchmark.benchmarkingRecommendations.map((rec: string, index: number) => (
                            <li key={index} className="body-copy text-xs flex items-start">
                              <span className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Export buttons at bottom */}
                <ExportButtons
                  onExportCsv={() => exportBenchmarkData()}
                  onPrintReport={onPrintReport}
                  className="mt-6"
                />
              </div>
            ) : (
              <div className="glass p-6 rounded-lg text-center">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="h4 mb-2">Industry Benchmarking Analysis</h4>
                <p className="body-copy text-xs mb-4">
                  Industry benchmarking will be performed automatically when you run a health check.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnswerModal
        isOpen={isAnswerModalOpen}
        onClose={() => setIsAnswerModalOpen(false)}
        result={selectedResult}
      />

      <RecommendationsModal
        isOpen={isRecommendationsModalOpen}
        onClose={() => setIsRecommendationsModalOpen(false)}
        result={selectedResult}
      />
    </div>
  );
};

export default ResultsSection;