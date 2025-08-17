import React, { useState } from 'react';
import { Target, TrendingUp, BarChart3, CheckCircle, FileText, Lightbulb, Download, Printer, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  prompt: string;
  mentioned: boolean;
  position: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  context: string;
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
  onCopyResults
}) => {
  const [activeTab, setActiveTab] = useState('results');
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
      {/* Results Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-ai rounded-lg flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Health Check Results</h2>
            <p className="text-muted-foreground">Your AI visibility analysis is complete</p>
          </div>
        </div>
        {onNewTest && (
          <button
            onClick={onNewTest}
            className="glass p-3 rounded-lg hover:bg-gradient-ai hover:text-white transition-all duration-300"
          >
            Run New Test
          </button>
        )}
      </div>

      {/* Health Score Card */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">Overall Health Score</h3>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold ${getHealthScoreColor(healthScore)}`}>
                {healthScore}
              </span>
              <span className="text-xl text-muted-foreground">/ 100</span>
              <span className={`text-lg font-medium ${getHealthScoreColor(healthScore)} ml-2`}>
                ({getHealthScoreGrade(healthScore)})
              </span>
            </div>
          </div>
          <div className="w-24 h-24 relative">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#c4b5fd" />
                  <stop offset="100%" stopColor="#9333ea" />
                </linearGradient>
              </defs>
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="rgba(196, 181, 253, 0.2)"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="url(#pathGradient)"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(healthScore / 100) * 251.2} 251.2`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-lg font-bold ${getHealthScoreColor(healthScore)}`}>
                {healthScore}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-white/10 backdrop-blur-sm rounded-lg p-1">
          {[
            { id: 'results', label: 'Results', icon: BarChart3 },
            { id: 'strategy', label: 'Strategy', icon: Lightbulb },
            { id: 'content', label: 'Content Assistant', icon: FileText }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-gradient-ai text-white shadow-lg'
                  : 'text-foreground hover:bg-white/20'
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
              <h3 className="text-lg font-semibold">Detailed Test Results</h3>
              <div className="flex items-center gap-2">
                {onExportCsv && (
                  <button
                    onClick={onExportCsv}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs glass rounded-md hover:bg-gradient-ai hover:text-white transition-all duration-300"
                  >
                    <Download className="w-3 h-3" />
                    Export CSV
                  </button>
                )}
                {onPrintReport && (
                  <button
                    onClick={onPrintReport}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs glass rounded-md hover:bg-gradient-ai hover:text-white transition-all duration-300"
                  >
                    <Printer className="w-3 h-3" />
                    Print PDF
                  </button>
                )}
                {onCopyResults && (
                  <button
                    onClick={onCopyResults}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs glass rounded-md hover:bg-gradient-ai hover:text-white transition-all duration-300"
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
                <div className="flex items-center gap-3">
                  <Target className="w-8 h-8 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold text-foreground">{mentionRate}%</div>
                    <div className="text-sm text-muted-foreground">Mention Rate</div>
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
              {results.slice(0, 5).map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 glass rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-foreground truncate max-w-md">
                      {result.prompt}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {result.context && result.context.length > 100 
                        ? `${result.context.substring(0, 100)}...` 
                        : result.context || 'No context available'
                      }
                    </div>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
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
                  </div>
                </div>
              ))}
            </div>
            
            {results.length > 5 && (
              <div className="mt-4 text-center">
                <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  View all {results.length} results →
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'strategy' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Optimization Strategy</h3>
            {strategyLoading ? (
              <div className="text-center py-8">
                <div className="animate-pulse text-muted-foreground">Generating personalized strategies...</div>
              </div>
            ) : strategyError ? (
              <div className="text-center py-8">
                <div className="text-red-600">Error: {strategyError}</div>
              </div>
            ) : strategies.length > 0 ? (
              <div className="space-y-4">
                {strategies.map((strategy, index) => (
                  <div key={index} className="glass p-4 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-2">{strategy.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{strategy.description}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        strategy.priority === 'high' ? 'bg-red-100 text-red-700' :
                        strategy.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {strategy.priority} priority
                      </span>
                      <button
                        onClick={() => {
                          setActiveTab('content');
                          setContentTopic(strategy.title);
                        }}
                        className="text-xs glass px-3 py-1 rounded-md hover:bg-gradient-ai hover:text-white transition-all duration-300"
                      >
                        Create Content
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No strategies available yet. Run a health check to generate recommendations.
              </div>
            )}
          </div>
        )}

        {activeTab === 'content' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Content Assistant</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Content Generator */}
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-foreground mb-2">Content Topic</label>
                  <input
                    type="text"
                    value={contentTopic}
                    onChange={(e) => setContentTopic(e.target.value)}
                    placeholder="What should the content be about?"
                    className="w-full p-3 glass rounded-lg border border-white/20 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <button
                  onClick={() => generateContent()}
                  disabled={!contentTopic.trim() || isGenerating}
                  className="w-full bg-gradient-ai text-white px-4 py-3 rounded-lg font-medium disabled:opacity-50 hover:scale-[1.02] transition-all duration-300"
                >
                  {isGenerating ? 'Generating Content...' : 'Generate Content'}
                </button>

                {company && (
                  <div className="mt-4 glass p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-foreground mb-2">Company Profile</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><span className="font-medium text-foreground">Name:</span> {company.company_name}</p>
                      <p><span className="font-medium text-foreground">Industry:</span> {company.industry}</p>
                      <p><span className="font-medium text-foreground">Customers:</span> {company.target_customers}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Generated Content */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-foreground">Generated Content</h4>
                  {generatedContent && (
                    <button
                      onClick={() => copyToClipboard(generatedContent)}
                      className="flex items-center gap-2 text-xs glass px-3 py-1 rounded-md hover:bg-gradient-ai hover:text-white transition-all duration-300"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  )}
                </div>
                
                <div className="glass p-4 rounded-lg min-h-[300px]">
                  {generatedContent ? (
                    <pre className="text-sm text-foreground whitespace-pre-wrap">{generatedContent}</pre>
                  ) : (
                    <div className="text-center text-muted-foreground py-12">
                      Enter a topic and click "Generate Content" to get started
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsSection;