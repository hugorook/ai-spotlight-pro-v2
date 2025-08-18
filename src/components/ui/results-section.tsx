import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, BarChart3, CheckCircle, FileText, Lightbulb, Download, Printer, Copy, Plus, Minus, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  prompt: string;
  mentioned: boolean;
  position: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  context: string;
  response?: string; // Full AI response
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
  websiteAnalysis
}) => {
  const [activeTab, setActiveTab] = useState('results');
  const [showAllResults, setShowAllResults] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  
  // Persist active tab in localStorage
  useEffect(() => {
    const savedTab = localStorage.getItem('activeResultsTab');
    if (savedTab && (savedTab === 'results' || savedTab === 'strategy' || savedTab === 'website')) {
      setActiveTab(savedTab);
    }
  }, []);

  // Reset show all results when results change
  useEffect(() => {
    setShowAllResults(false);
    setExpandedResults(new Set());
  }, [results.length]);

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
    return 'D';
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

  return (
    <div className="w-full animate-fade-in">
      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-white/10 backdrop-blur-sm rounded-lg p-1">
          {[
            { id: 'results', label: 'Results', icon: BarChart3 },
            { id: 'strategy', label: 'Strategy', icon: Lightbulb },
            { id: 'website', label: 'Website Analysis', icon: Globe }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-lg font-medium transition-none ${
                activeTab === tab.id
                  ? 'bg-[#111E63] text-white'
                  : 'text-foreground hover:bg-[#111E63] hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="glass-card p-6">
        {activeTab === 'results' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Test Results</h3>
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
      </div>
    </div>
  );
};

export default ResultsSection;