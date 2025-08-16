import React from 'react';
import { Target, TrendingUp, BarChart3, CheckCircle } from 'lucide-react';

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
}

const ResultsSection: React.FC<ResultsSectionProps> = ({
  isVisible,
  results,
  healthScore,
  onNewTest
}) => {
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <Target className="w-8 h-8 text-blue-500" />
            <div>
              <div className="text-2xl font-bold text-foreground">{mentionRate}%</div>
              <div className="text-sm text-muted-foreground">Mention Rate</div>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-500" />
            <div>
              <div className="text-2xl font-bold text-foreground">#{avgPosition || 'N/A'}</div>
              <div className="text-sm text-muted-foreground">Avg Position</div>
            </div>
          </div>
        </div>

        <div className="glass-card p-4">
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
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">Detailed Test Results</h3>
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
    </div>
  );
};

export default ResultsSection;