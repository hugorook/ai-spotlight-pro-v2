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
}

interface AnswerModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: TestResult | null;
}

const AnswerModal: React.FC<AnswerModalProps> = ({ isOpen, onClose, result }) => {
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
      <div className="fixed inset-0 modal-container flex items-center justify-center p-6">
        <div className="modal-content bg-[#E7F0F6]/90 backdrop-blur-xl border border-black/20 w-full rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-black/10">
            <div className="flex items-center gap-4">
              {getStatusIcon(result.mentioned)}
              <div>
                <h2 className="h3">
                  Full AI Response
                </h2>
                <div className="flex items-center gap-2 body-copy text-sm">
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
              className="modal-close-button rounded-lg hover:bg-[#5F209B] hover:text-white transition-colors"
            >
              <X className="w-5 h-5 text-black" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
            {/* Prompt */}
            <div className="mb-6">
              <h4 className="h4 mb-3">
                Test Prompt
              </h4>
              <div className="bg-white/70 backdrop-blur-sm border border-black/20 p-4 rounded-lg">
                <p className="prompt-text">{result.prompt}</p>
              </div>
            </div>

            {/* Full Response */}
            <div>
              <h4 className="h4 mb-3">
                AI Response
              </h4>
              <div className="bg-white/70 backdrop-blur-sm border border-black/20 p-4 rounded-lg">
                {result.response ? (
                  <div className="body-copy modal-text leading-relaxed">
                    {result.response.split('\n').map((paragraph, index) => (
                      <p key={index} className="mb-3 last:mb-0">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                ) : result.context ? (
                  <div className="body-copy modal-text leading-relaxed">
                    <p className="mb-3"><strong>Context where mentioned:</strong></p>
                    <p>{result.context}</p>
                  </div>
                ) : (
                  <p className="body-copy">
                    No detailed response available
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AnswerModal;