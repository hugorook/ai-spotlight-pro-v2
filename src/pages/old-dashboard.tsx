import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Building, 
  Globe, 
  TrendingUp, 
  Calendar, 
  TestTube,
  BarChart3,
  Settings,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/types/supabase";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";

type Company = Tables<'companies'>;
type TestResult = Tables<'ai_tests'>;

const Dashboard = () => {
  console.log("Dashboard: Component starting to render");
  
  const { user } = useAuth();
  const { toast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  console.log("Dashboard: State initialized", { 
    hasUser: !!user, 
    userEmail: user?.email, 
    loading, 
    companyName: company?.company_name 
  });

  useEffect(() => {
    console.log("Dashboard: useEffect triggered", { hasUser: !!user });
    if (user) {
      console.log("Dashboard: User exists, calling loadDashboardData");
      loadDashboardData();
    } else {
      console.log("Dashboard: No user, setting loading to false");
      setLoading(false);
    }
  }, [user, loadDashboardData]);

  const loadDashboardData = useCallback(async () => {
    console.log("Dashboard: loadDashboardData starting");
    try {
      // Load real company data
      console.log("Dashboard: Fetching companies for user", user?.id);
      const { data: companies, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user?.id);

      console.log("Dashboard: Company query result", { 
        companiesCount: companies?.length || 0, 
        error: companyError?.message || 'none' 
      });

      if (companyError) {
        console.error('Dashboard: Error loading company:', companyError);
        return;
      }

      // Take the first company if multiple exist
      const company = companies && companies.length > 0 ? companies[0] : null;
      console.log("Dashboard: Company selected", { 
        companyName: company?.company_name, 
        companyId: company?.id 
      });
      
      if (company) {
        setCompany(company);

        // Load real test results
        console.log("Dashboard: Fetching tests for company", company.id);
        const { data: tests, error: testsError } = await supabase
          .from('ai_tests')
          .select('*')
          .eq('company_id', company.id)
          .order('test_date', { ascending: false })
          .limit(10);

        console.log("Dashboard: Tests query result", { 
          testsCount: tests?.length || 0, 
          error: testsError?.message || 'none' 
        });

        if (!testsError && tests) {
          setTestResults(tests);
        }
      } else {
        console.log("Dashboard: No company found");
      }
    } catch (error) {
      console.error('Dashboard: Caught error in loadDashboardData:', error);
    } finally {
      console.log("Dashboard: Setting loading to false");
      setLoading(false);
    }
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast({
      title: "Dashboard Refreshed",
      description: "Latest data has been loaded.",
    });
  };

  const calculateVisibilityScore = () => {
    if (testResults.length === 0) return 0;
    const mentionedTests = testResults.filter(test => test.company_mentioned);
    return Math.round((mentionedTests.length / testResults.length) * 100);
  };

  const getRecentPerformance = () => {
    const recent = testResults.slice(0, 5);
    const mentioned = recent.filter(test => test.company_mentioned).length;
    return recent.length > 0 ? Math.round((mentioned / recent.length) * 100) : 0;
  };

  console.log("Dashboard: About to render, current state:", { 
    loading, 
    hasCompany: !!company, 
    companyName: company?.company_name,
    testsCount: testResults.length 
  });

  if (loading) {
    console.log("Dashboard: Rendering loading state");
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container mx-auto max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-64"></div>
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    console.log("Dashboard: Rendering no company state");
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center py-20">
            <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">No Company Profile Found</h2>
            <p className="text-muted-foreground mb-6">
              You need to set up your company profile to access the dashboard.
            </p>
            <Button onClick={() => window.location.href = '/geo'}>
              Set Up Company Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const visibilityScore = calculateVisibilityScore();
  const recentPerformance = getRecentPerformance();

  console.log("Dashboard: Rendering main dashboard", { 
    visibilityScore, 
    recentPerformance,
    companyName: company.company_name 
  });

  try {
    return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto max-w-7xl p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">AI Visibility Dashboard</h1>
            <p className="text-muted-foreground">Monitor your company's AI mentions and performance</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Visibility Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{visibilityScore}%</div>
              <p className="text-xs text-muted-foreground">
                Based on {testResults.length} tests
              </p>
              <Progress value={visibilityScore} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Performance</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recentPerformance}%</div>
              <p className="text-xs text-muted-foreground">
                Last 5 tests
              </p>
              <Badge variant={recentPerformance >= 50 ? "default" : "destructive"} className="mt-2">
                {recentPerformance >= 50 ? "Good" : "Needs Improvement"}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
              <TestTube className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{testResults.length}</div>
              <p className="text-xs text-muted-foreground">
                {testResults.filter(t => t.company_mentioned).length} mentions found
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Company Profile & Recent Tests */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Company Profile */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Company Profile
                </CardTitle>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground">{company.company_name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Globe className="w-4 h-4" />
                  {company.website_url}
                </div>
              </div>
              
              <div>
                <Badge variant="secondary">{company.industry}</Badge>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">{company.description}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-foreground mb-1">Target Customers</h4>
                <p className="text-sm text-muted-foreground">{company.target_customers}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-foreground mb-1">Key Differentiators</h4>
                <p className="text-sm text-muted-foreground">{company.key_differentiators}</p>
              </div>
              
              {company.geographic_focus && company.geographic_focus.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-1">Geographic Focus</h4>
                  <div className="flex flex-wrap gap-1">
                    {company.geographic_focus.map((location, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {location}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Test Results */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="w-5 h-5" />
                  Recent Test Results
                </CardTitle>
                <Button variant="outline" size="sm">
                  View All <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TestTube className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No test results yet</p>
                  <p className="text-sm">Run your first AI visibility test to see results here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {testResults.slice(0, 5).map((test) => (
                    <div key={test.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded">
                          {test.company_mentioned ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground capitalize">
                            {test.ai_model}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(test.test_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {test.company_mentioned ? (
                          <Badge variant="default" className="bg-success">
                            Position #{test.mention_position}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            Not Mentioned
                          </Badge>
                        )}
                        {test.sentiment && (
                          <p className="text-xs text-muted-foreground mt-1 capitalize">
                            {test.sentiment}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    );
  } catch (renderError) {
    console.error("Dashboard: Error during render:", renderError);
    return (
      <div style={{ minHeight: '100vh', background: '#ff0000', color: '#fff', padding: '20px' }}>
        <h1>Dashboard Render Error</h1>
        <p>Error: {(renderError as Error).message}</p>
        <pre style={{ fontSize: '10px', overflow: 'auto' }}>{(renderError as Error).stack}</pre>
      </div>
    );
  }
};

export default Dashboard;