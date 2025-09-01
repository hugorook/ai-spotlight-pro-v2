import React from 'react';
import { X, AlertCircle, CheckCircle, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestResult {
  prompt: string;
  mentioned: boolean;
  position: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  context: string;
  response?: string;
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

interface RecommendationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: TestResult | null;
}

const RecommendationsModal: React.FC<RecommendationsModalProps> = ({ isOpen, onClose, result }) => {
  if (!isOpen || !result) return null;

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'negative':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusIcon = (mentioned: boolean) => {
    return mentioned ? 
      <div className="w-3 h-3 bg-green-500 rounded-full"></div> : 
      <div className="w-3 h-3 bg-red-500 rounded-full"></div>;
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="bg-[#E7F0F6]/90 backdrop-blur-xl border border-black/20 w-full max-w-3xl max-h-[90vh] rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-black/10">
            <div className="flex items-center gap-4">
              {getStatusIcon(result.mentioned)}
              <div>
                <h2 className="modal-title text-xl font-semibold tracking-tight">
                  Recommendations
                </h2>
                <div className="flex items-center gap-2 text-sm text-black">
                  {getSentimentIcon(result.sentiment)}
                  <span className="capitalize">{result.sentiment}</span>
                  {result.mentioned && result.position && (
                    <span>• Position #{result.position}</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#5F209B] hover:text-white transition-colors"
            >
              <X className="w-5 h-5 text-black" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* Prompt Context */}
            <div className="mb-6">
              <h3 className="modal-title text-lg font-medium mb-3 tracking-tight">
                Query Context
              </h3>
              <div className="bg-white/70 backdrop-blur-sm border border-black/20 p-4 rounded-lg">
                <p className="prompt-text text-sm">{result.prompt}</p>
              </div>
            </div>

            {/* Recommendations */}
            {result.failureAnalysis ? (
              <div className="space-y-4">
                {/* Why you didn't rank */}
                <div className="bg-white/70 backdrop-blur-sm border border-black/20 p-4 rounded-lg">
                  <h4 className="modal-title font-medium mb-2">
                    Why you didn't rank:
                  </h4>
                  <p className="body-copy text-sm leading-relaxed">
                    {result.failureAnalysis.primaryReason}
                  </p>
                </div>

                {/* Quick Fix */}
                <div className="bg-white/70 backdrop-blur-sm border border-black/20 p-4 rounded-lg">
                  <h4 className="modal-title font-medium mb-2">
                    Quick Fix ({result.failureAnalysis.timeToFix}):
                  </h4>
                  <p className="body-copy text-sm leading-relaxed">
                    {result.failureAnalysis.quickFix}
                  </p>
                </div>

                {/* Expected Impact */}
                <div className="bg-white/70 backdrop-blur-sm border border-black/20 p-4 rounded-lg">
                  <h4 className="modal-title font-medium mb-2">
                    Expected Impact:
                  </h4>
                  <p className="body-copy text-sm leading-relaxed">
                    {result.failureAnalysis.expectedImpact}
                  </p>
                </div>

                {/* Competitor Insight */}
                {result.failureAnalysis.competitorInsight && (
                  <div className="bg-white/70 backdrop-blur-sm border border-black/20 p-4 rounded-lg">
                    <h4 className="modal-title font-medium mb-2">
                      Competitor Insight:
                    </h4>
                    <p className="body-copy text-sm leading-relaxed">
                      {result.failureAnalysis.competitorInsight}
                    </p>
                  </div>
                )}

                {/* Difficulty & Category */}
                <div className="flex gap-2">
                  <div className="bg-white/70 backdrop-blur-sm border border-black/20 p-3 rounded-lg flex-1 text-center">
                    <div className="font-serif text-sm text-black">Difficulty</div>
                    <div className="text-xs text-black capitalize">
                      {result.failureAnalysis.difficulty}
                    </div>
                  </div>
                  <div className="bg-white/70 backdrop-blur-sm border border-black/20 p-3 rounded-lg flex-1 text-center">
                    <div className="font-serif text-sm text-black">Category</div>
                    <div className="text-xs text-black capitalize">
                      {result.failureAnalysis.category}
                    </div>
                  </div>
                </div>
              </div>
            ) : result.mentioned ? (
              <div className="bg-white/70 backdrop-blur-sm border border-black/20 p-6 rounded-lg text-center">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-3" />
                <h4 className="modal-title font-medium mb-2">
                  Great Success!
                </h4>
                <p className="body-copy text-sm">
                  Your company was mentioned at position #{result.position} with {result.sentiment} sentiment.
                </p>
              </div>
            ) : (
              <div className="bg-white/70 backdrop-blur-sm border border-black/20 p-6 rounded-lg text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                <h4 className="modal-title font-medium mb-2">
                  Not Mentioned
                </h4>
                <p className="body-copy text-sm">
                  Your company was not mentioned in the AI response. Consider optimizing your content for this query.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default RecommendationsModal;