import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Brain, CheckCircle2, ArrowRight, Play, BarChart3, Target, Zap } from 'lucide-react';

interface WelcomeFlowProps {
  onComplete: () => void;
}

const WelcomeFlow: React.FC<WelcomeFlowProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompanySetup, setIsCompanySetup] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');

  const industries = [
    'Technology/Software',
    'Marketing/Advertising', 
    'Professional Services',
    'Healthcare',
    'Finance/Banking',
    'E-commerce/Retail',
    'Manufacturing',
    'Education',
    'Real Estate',
    'Other'
  ];

  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to AI Visibility Hub!',
      subtitle: 'Get your company mentioned by AI models like ChatGPT, Claude, and Gemini',
      content: (
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-gradient-accent rounded-2xl flex items-center justify-center mx-auto">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-4">
            <p className="text-lg text-muted-foreground">
              In just 2 minutes, you'll see exactly how visible your company is to AI models and get a personalized strategy to improve it.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>Test 10+ AI prompts instantly</span>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>Get your visibility score</span>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>Receive optimization strategies</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'preview',
      title: 'See How It Works',
      subtitle: 'Here\'s what your AI Visibility Report will look like',
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-center">Sample AI Visibility Report</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-500 mb-1">73%</div>
                <div className="text-sm text-muted-foreground">Mention Rate</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-500 mb-1">2.4</div>
                <div className="text-sm text-muted-foreground">Avg Position</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-purple-500 mb-1">+15%</div>
                <div className="text-sm text-muted-foreground">This Week</div>
              </div>
            </div>
            <div className="text-center">
              <Button variant="outline" size="sm">
                <Play className="w-4 h-4 mr-2" />
                Watch 60s Demo
              </Button>
            </div>
          </div>
          <p className="text-center text-muted-foreground">
            This is just a preview. Your actual report will show real data for your company.
          </p>
        </div>
      )
    },
    {
      id: 'setup',
      title: 'Quick Company Setup',
      subtitle: 'Tell us about your company so we can test the right prompts',
      content: (
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Company Name *
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., Acme Software Solutions"
                className="w-full px-4 py-3 bg-white border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Industry *
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select your industry</option>
                {industries.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Why we need this</h4>
                <p className="text-sm text-blue-700">
                  We'll generate industry-specific prompts to test how AI models respond when people ask about {industry || 'your industry'} solutions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'ready',
      title: 'Ready to Test Your AI Visibility!',
      subtitle: 'We\'ll run 10 targeted prompts to see how often your company gets mentioned',
      content: (
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
            <Zap className="w-10 h-10 text-green-600" />
          </div>
          <div className="space-y-4">
            <p className="text-lg">
              Perfect! We're ready to test <strong>{companyName}</strong> in the {industry} industry.
            </p>
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-6">
              <h4 className="font-semibold mb-3">What happens next:</h4>
              <div className="space-y-2 text-sm text-left">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">1</div>
                  <span>We'll test 10 AI prompts relevant to your industry</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">2</div>
                  <span>Generate your visibility score and detailed report</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">3</div>
                  <span>Provide personalized optimization strategies</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              This usually takes about 30-60 seconds
            </p>
          </div>
        </div>
      )
    }
  ];

  const handleNext = async () => {
    if (currentStep === 2) { // Company setup step
      if (!companyName.trim() || !industry) {
        return; // Validation - could add toast notification here
      }
      
      // Save company info
      try {
        const { error } = await supabase.functions.invoke('save-company', {
          body: {
            company_name: companyName,
            industry: industry,
            description: `${industry} company`,
            target_customers: '',
            key_differentiators: '',
            geographic_focus: ['Global']
          }
        });

        if (error) {
          console.error('Error saving company:', error);
          // Could show error toast here
          return;
        }
      } catch (error) {
        console.error('Error:', error);
        return;
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Mark onboarding as complete and redirect to health check
      await markOnboardingComplete();
      onComplete();
    }
  };

  const markOnboardingComplete = async () => {
    try {
      // Store onboarding completion in user metadata or separate table
      const { error } = await supabase.auth.updateUser({
        data: { onboarding_completed: true }
      });
      if (error) console.error('Error updating user metadata:', error);
    } catch (error) {
      console.error('Error marking onboarding complete:', error);
    }
  };

  const handleSkip = async () => {
    await markOnboardingComplete();
    onComplete();
  };

  const step = steps[currentStep];
  const canProceed = currentStep !== 2 || (companyName.trim() && industry);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        {/* Progress indicator */}
        <div className="flex justify-between items-center mb-8">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`flex-1 h-2 rounded-full mx-1 ${
                index <= currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="text-center space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {step.title}
            </h1>
            <p className="text-lg text-muted-foreground">
              {step.subtitle}
            </p>
          </div>

          <div className="py-8">
            {step.content}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-6">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip for now
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={!canProceed}
              className="flex items-center gap-2"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <BarChart3 className="w-4 h-4" />
                  Start My Health Check
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default WelcomeFlow;