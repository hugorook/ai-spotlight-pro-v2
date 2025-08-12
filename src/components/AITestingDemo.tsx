import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  MessageSquare, 
  Play, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Brain,
  Loader2,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AITestingDemo = () => {
  const [selectedPrompt, setSelectedPrompt] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [testResults, setTestResults] = useState<{
    results?: Array<{
      model: string;
      mentioned: boolean;
      position?: number;
      sentiment?: string;
      response: string;
    }>;
  } | null>(null);
  const { toast } = useToast();

  const samplePrompts = [
    "What are the best CRM software options for small businesses?",
    "Recommend project management tools for remote teams",
    "What marketing automation platforms should I consider?",
    "Best accounting software for freelancers and consultants"
  ];

  const mockResults = {
    chatgpt: {
      mentioned: true,
      position: 2,
      sentiment: "positive",
      context: "HubSpot CRM is particularly well-suited for small businesses looking to scale..."
    },
    claude: {
      mentioned: false,
      position: null,
      sentiment: null,
      context: "Not mentioned in the response"
    },
    gemini: {
      mentioned: true,
      position: 4,
      sentiment: "neutral",
      context: "Other options include HubSpot CRM, which offers a free tier..."
    },
    perplexity: {
      mentioned: true,
      position: 1,
      sentiment: "positive",
      context: "HubSpot CRM stands out as the top choice for small businesses..."
    }
  };

  const handleTest = async () => {
    if (!selectedPrompt.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter or select a prompt to test.",
      });
      return;
    }

    setIsTesting(true);
    setShowResults(false);
    setTestResults(null);

    try {
      // Call the test-ai-models edge function
      const { data, error } = await supabase.functions.invoke('test-ai-models', {
        body: {
          prompt: selectedPrompt,
          models: ['gpt-4', 'claude-3-sonnet', 'gemini-pro']
        }
      });

      if (error) {
        console.error('Error testing AI models:', error);
        toast({
          variant: "destructive",
          title: "Test Failed",
          description: "Failed to run AI test. Please try again.",
        });
        return;
      }

      setTestResults(data);
      setShowResults(true);
      
      toast({
        title: "Test Complete!",
        description: "AI model testing completed successfully.",
      });

    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred during testing.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getMentionBadge = (mentioned: boolean, position: number | null) => {
    if (!mentioned) {
      return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Not Mentioned</Badge>;
    }
    if (position === 1) {
      return <Badge variant="default" className="bg-success gap-1"><CheckCircle className="w-3 h-3" />Position #{position}</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><CheckCircle className="w-3 h-3" />Position #{position}</Badge>;
  };

  return (
    <section className="py-20 px-4 bg-muted/20">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            See Your AI Visibility in Real-Time
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Test any prompt across multiple AI models and see exactly how your company is mentioned
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Testing Interface */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4">AI Prompt Tester</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Test a prompt or choose from examples:
                </label>
                <Input
                  value={selectedPrompt}
                  onChange={(e) => setSelectedPrompt(e.target.value)}
                  placeholder="Type your prompt here..."
                  className="mb-3"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Sample prompts:</p>
                {samplePrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedPrompt(prompt)}
                    className="w-full text-left p-3 bg-secondary/50 hover:bg-secondary rounded-lg text-sm transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <Button
                variant="ai"
                className="w-full"
                onClick={handleTest}
                disabled={!selectedPrompt || isTesting}
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Testing Across AI Models...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Test Across AI Models
                  </>
                )}
              </Button>
            </div>

            {isTesting && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Testing in progress...</span>
                  <span className="text-sm text-muted-foreground">67%</span>
                </div>
                <Progress value={67} className="w-full" />
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-success" />
                    <span>ChatGPT ✓</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-success" />
                    <span>Claude ✓</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <span>Gemini...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <span>Perplexity...</span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Results */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4">AI Model Results</h3>
            
            {!showResults && !isTesting && (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a prompt and click "Test" to see results</p>
              </div>
            )}

            {showResults && testResults && (
              <div className="space-y-4">
                {testResults.results?.map((result, index: number) => (
                  <div key={index} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                          <Brain className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-semibold text-foreground capitalize">
                          {result.ai_model || `Model ${index + 1}`}
                        </span>
                      </div>
                      {result.company_mentioned ? (
                        <Badge variant="default" className="bg-success gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Position #{result.mention_position || 'N/A'}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="w-3 h-3" />
                          Not Mentioned
                        </Badge>
                      )}
                    </div>
                    
                    {result.company_mentioned && result.mention_context ? (
                      <div className="bg-muted/50 p-3 rounded text-sm text-muted-foreground">
                        "{result.mention_context}"
                      </div>
                    ) : (
                      <div className="bg-destructive/10 p-3 rounded text-sm text-muted-foreground">
                        Your company was not mentioned in this response
                      </div>
                    )}

                    {result.sentiment && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Sentiment:</span>
                        <Badge variant={
                          result.sentiment === 'positive' ? 'default' : 
                          result.sentiment === 'negative' ? 'destructive' : 'secondary'
                        } className="text-xs">
                          {result.sentiment}
                        </Badge>
                      </div>
                    )}

                    {result.competitors_mentioned && result.competitors_mentioned.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs text-muted-foreground">Competitors mentioned:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {result.competitors_mentioned.map((competitor: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {competitor}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {testResults.visibility_score && (
                  <div className="mt-6 p-4 bg-gradient-ai/10 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <span className="font-semibold text-foreground">AI Visibility Score</span>
                    </div>
                    <div className="text-2xl font-bold text-primary mb-1">
                      {testResults.visibility_score}/100
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {testResults.summary || "Analysis complete. Check individual results above for details."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
};

export default AITestingDemo;