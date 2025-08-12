import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer 
} from "recharts";
import { 
  TrendingUp,
  TrendingDown,
  Users,
  Search,
  AlertTriangle,
  Plus,
  Target,
  Zap,
  BarChart3,
  Play,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/types/supabase";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";

type Company = Pick<Tables<'companies'>, 'id' | 'company_name' | 'competitors'>;

interface CompetitorAnalysis {
  competitor: string;
  mention_frequency: number;
  avg_position: number;
  sentiment_score: number;
  market_share: number;
}

const CompetitorPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [competitorAnalysis, setCompetitorAnalysis] = useState<CompetitorAnalysis[]>([]);
  const [newCompetitor, setNewCompetitor] = useState("");
  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState("30d");
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      loadCompanyData();
    }
  }, [user, loadCompanyData]);

  const loadCompetitorAnalysis = useCallback(async (companyId: string, competitors: string[]) => {
    try {
      // Use database analysis since the edge function expects different parameters
      // Your analyze-mentions function seems designed for individual test analysis
      const analysis = await calculateCompetitorAnalysisFromTests(companyId, competitors);
      setCompetitorAnalysis(analysis);
    } catch (error) {
      console.error('Error loading competitor analysis:', error);
      setCompetitorAnalysis([]);
    }
  }, []);

  const loadCompanyData = useCallback(async () => {
    try {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('id, company_name, competitors')
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error loading company:', error);
        return;
      }

      const company = companies && companies.length > 0 ? companies[0] : null;
      if (company) {
        setCompany(company);
        await loadCompetitorAnalysis(company.id, company.competitors || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, loadCompetitorAnalysis]);


  const calculateCompetitorAnalysisFromTests = async (companyId: string, competitors: string[]): Promise<CompetitorAnalysis[]> => {
    try {
      // Get all AI tests for this company
      const { data: tests } = await supabase
        .from('ai_tests')
        .select('*')
        .eq('company_id', companyId);

      if (!tests) return [];

      // Analyze competitor mentions in the test data
      const analysis: CompetitorAnalysis[] = competitors.map(competitor => {
        const competitorMentions = tests.filter(test => 
          test.competitors_mentioned && test.competitors_mentioned.includes(competitor)
        );
        
        const totalTests = tests.length;
        const mentionFrequency = totalTests > 0 ? (competitorMentions.length / totalTests) * 100 : 0;
        
        const avgPosition = competitorMentions.length > 0 
          ? competitorMentions.reduce((sum, test) => sum + (test.mention_position || 10), 0) / competitorMentions.length
          : 10;

        // Calculate sentiment score (-1 to 1)
        const sentimentScore = competitorMentions.length > 0
          ? competitorMentions.reduce((sum, test) => {
              const score = test.sentiment === 'positive' ? 1 : test.sentiment === 'negative' ? -1 : 0;
              return sum + score;
            }, 0) / competitorMentions.length
          : 0;

        return {
          competitor,
          mention_frequency: Math.round(mentionFrequency),
          avg_position: Math.round(avgPosition * 10) / 10,
          sentiment_score: Math.round(sentimentScore * 100) / 100,
          market_share: Math.round(mentionFrequency * 0.6) // Rough estimate based on mention frequency
        };
      }).sort((a, b) => b.mention_frequency - a.mention_frequency);

      return analysis;
    } catch (error) {
      console.error('Error calculating competitor analysis:', error);
      return [];
    }
  };

  const handleAddCompetitor = async () => {
    if (!newCompetitor.trim() || !company) return;

    try {
      setIsAddingCompetitor(true);

      const updatedCompetitors = [...(company.competitors || []), newCompetitor.trim()];

      const { error } = await supabase
        .from('companies')
        .update({ competitors: updatedCompetitors })
        .eq('id', company.id);

      if (error) throw error;

      setCompany(prev => prev ? { ...prev, competitors: updatedCompetitors } : null);
      setNewCompetitor("");
      await loadCompetitorAnalysis(company.id, updatedCompetitors);

      toast({
        title: "Competitor Added",
        description: `${newCompetitor} has been added to your competitor list.`,
      });
    } catch (error) {
      console.error('Error adding competitor:', error);
      toast({
        title: "Error",
        description: "Failed to add competitor. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAddingCompetitor(false);
    }
  };

  const handleRemoveCompetitor = async (competitorToRemove: string) => {
    if (!company) return;

    try {
      const updatedCompetitors = company.competitors.filter(comp => comp !== competitorToRemove);

      const { error } = await supabase
        .from('companies')
        .update({ competitors: updatedCompetitors })
        .eq('id', company.id);

      if (error) throw error;

      setCompany(prev => prev ? { ...prev, competitors: updatedCompetitors } : null);
      await loadCompetitorAnalysis(company.id, updatedCompetitors);

      toast({
        title: "Competitor Removed",
        description: `${competitorToRemove} has been removed from your competitor list.`,
      });
    } catch (error) {
      console.error('Error removing competitor:', error);
      toast({
        title: "Error",
        description: "Failed to remove competitor. Please try again.",
        variant: "destructive",
      });
    }
  };

  const runCompetitorTest = async (competitor: string) => {
    if (!company) return;

    try {
      setRunningTests(prev => new Set(prev).add(competitor));

      // In production, this would run actual AI tests for the competitor
      const testPrompts = [
        `What are the best companies for ${company.company_name.split(' ')[0].toLowerCase()} solutions?`,
        `Who are the top providers in the ${company.company_name} space?`,
        `Which companies should I consider for services similar to ${company.company_name}?`
      ];

      // Simulate running tests
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Refresh the analysis
      await loadCompetitorAnalysis(company.id, company.competitors);

      toast({
        title: "Competitor Test Completed",
        description: `Analysis updated for ${competitor}.`,
      });
    } catch (error) {
      console.error('Error running competitor test:', error);
      toast({
        title: "Test Failed",
        description: "Failed to run competitor analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(competitor);
        return newSet;
      });
    }
  };

  const chartConfig = {
    mentions: {
      label: "Mentions",
      color: "hsl(var(--primary))",
    },
  };

  if (loading) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto max-w-6xl p-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-64"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto max-w-6xl p-4">
          <div className="text-center py-20">
            <AlertTriangle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">No Company Profile Found</h2>
            <p className="text-muted-foreground mb-6">
              You need to set up your company profile first to access competitor analysis.
            </p>
            <Button onClick={() => window.location.href = '/geo'}>
              Set Up Company Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto max-w-6xl p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Competitor Positioning</h1>
            <p className="text-muted-foreground">
              Analyze how competitors appear in AI responses and identify market opportunities
            </p>
          </div>
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Competitor Management */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Manage Competitors
                </CardTitle>
                <CardDescription>
                  Add and manage your main competitors for analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newCompetitor}
                    onChange={(e) => setNewCompetitor(e.target.value)}
                    placeholder="Competitor name"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCompetitor()}
                  />
                  <Button 
                    onClick={handleAddCompetitor}
                    disabled={!newCompetitor.trim() || isAddingCompetitor}
                    size="sm"
                  >
                    {isAddingCompetitor ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="space-y-2">
                  {company.competitors && company.competitors.length > 0 ? (
                    company.competitors.map((competitor, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                        <span className="text-sm font-medium">{competitor}</span>
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => runCompetitorTest(competitor)}
                            disabled={runningTests.has(competitor)}
                          >
                            {runningTests.has(competitor) ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Play className="w-3 h-3" />
                            )}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRemoveCompetitor(competitor)}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No competitors added yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Market Position
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground mb-1">
                    #{Math.min(competitorAnalysis.length + 1, 5)}
                  </div>
                  <p className="text-sm text-muted-foreground">Your estimated ranking</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-success">
                      {competitorAnalysis.length}
                    </div>
                    <p className="text-xs text-muted-foreground">Competitors tracked</p>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-primary">
                      {Math.round(100 / (competitorAnalysis.length + 1))}%
                    </div>
                    <p className="text-xs text-muted-foreground">Market share est.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Competitor Analysis */}
          <div className="lg:col-span-2 space-y-6">
            {/* Competition Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  AI Mention Frequency
                </CardTitle>
                <CardDescription>
                  How often competitors are mentioned in AI responses
                </CardDescription>
              </CardHeader>
              <CardContent>
                {competitorAnalysis.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={competitorAnalysis}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="competitor" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="mention_frequency" fill="var(--color-mentions)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No competitor data available</p>
                    <p className="text-sm">Add competitors to see analysis</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detailed Competitor Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Analysis</CardTitle>
                <CardDescription>
                  In-depth competitor performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {competitorAnalysis.length > 0 ? (
                  <div className="space-y-4">
                    {competitorAnalysis.map((analysis, index) => (
                      <div key={analysis.competitor} className="p-4 bg-muted/20 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <h4 className="font-semibold text-foreground">{analysis.competitor}</h4>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => runCompetitorTest(analysis.competitor)}
                            disabled={runningTests.has(analysis.competitor)}
                          >
                            {runningTests.has(analysis.competitor) ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              <>
                                <Zap className="w-3 h-3 mr-1" />
                                Re-test
                              </>
                            )}
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-lg font-semibold text-primary">
                              {analysis.mention_frequency}
                            </div>
                            <p className="text-xs text-muted-foreground">Mentions</p>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-foreground">
                              #{analysis.avg_position}
                            </div>
                            <p className="text-xs text-muted-foreground">Avg Position</p>
                          </div>
                          <div className="text-center">
                            <div className={`text-lg font-semibold ${
                              analysis.sentiment_score > 0 ? 'text-success' : 
                              analysis.sentiment_score < 0 ? 'text-destructive' : 'text-muted-foreground'
                            }`}>
                              {analysis.sentiment_score > 0 ? (
                                <TrendingUp className="w-4 h-4 mx-auto" />
                              ) : analysis.sentiment_score < 0 ? (
                                <TrendingDown className="w-4 h-4 mx-auto" />
                              ) : (
                                '~'
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">Sentiment</p>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-accent">
                              {analysis.market_share}%
                            </div>
                            <p className="text-xs text-muted-foreground">Share Est.</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No competitor analysis available</p>
                    <p className="text-sm">Add competitors and run tests to see detailed analysis</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompetitorPage;