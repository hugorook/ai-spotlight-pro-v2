import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PenTool,
  FileText,
  MessageSquare,
  TrendingUp,
  Zap,
  Lightbulb,
  CheckCircle,
  Clock,
  Target,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/types/supabase";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";

type Company = Pick<Tables<'companies'>, 'id' | 'company_name' | 'industry' | 'description' | 'target_customers' | 'key_differentiators'>;

interface ContentTemplate {
  id: string;
  type: string;
  title: string;
  description: string;
  icon: React.ElementType;
  aiOptimized: boolean;
}

const ContentPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedContentType, setSelectedContentType] = useState("blog");
  const [contentTitle, setContentTitle] = useState("");
  const [contentTopic, setContentTopic] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const contentTemplates: ContentTemplate[] = [
    {
      id: "blog",
      type: "Blog Post",
      title: "Thought Leadership Blog",
      description: "Generate AI-optimized blog posts that position you as an industry expert",
      icon: PenTool,
      aiOptimized: true
    },
    {
      id: "faq",
      type: "FAQ Page",
      title: "Comprehensive FAQ",
      description: "Create detailed FAQ pages that answer common customer questions",
      icon: MessageSquare,
      aiOptimized: true
    },
    {
      id: "case-study",
      type: "Case Study",
      title: "Customer Success Story",
      description: "Showcase customer wins and demonstrate your value proposition",
      icon: TrendingUp,
      aiOptimized: true
    },
    {
      id: "press-release",
      type: "Press Release",
      title: "Company Announcement",
      description: "Professional press releases for company news and achievements",
      icon: FileText,
      aiOptimized: false
    }
  ];

  useEffect(() => {
    if (user) {
      loadCompanyData();
    }
  }, [user, loadCompanyData]);

  const loadCompanyData = useCallback(async () => {
    try {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error loading company:', error);
        return;
      }

      const company = companies && companies.length > 0 ? companies[0] : null;
      if (company) {
        setCompany(company);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const generateContent = async () => {
    if (!contentTopic.trim() || !company) return;

    try {
      setIsGenerating(true);
      
      // Call the edge function to generate AI-optimized content
      const { data: result, error } = await supabase.functions.invoke('generate-content', {
        body: {
          company_id: company.id,
          content_type: selectedContentType,
          topic: contentTopic,
          title: contentTitle,
          company_info: {
            name: company.company_name,
            industry: company.industry,
            description: company.description,
            target_customers: company.target_customers,
            key_differentiators: company.key_differentiators
          }
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast({
          title: "Generation Failed",
          description: "Failed to generate content. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (result?.content) {
        setGeneratedContent(result.content);
        toast({
          title: "Content Generated",
          description: "Your AI-optimized content is ready for review and publishing.",
        });
      } else {
        throw new Error('No content returned from AI');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
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
            <Target className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">No Company Profile Found</h2>
            <p className="text-muted-foreground mb-6">
              You need to set up your company profile first to access AI content generation.
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Content Assistant</h1>
          <p className="text-muted-foreground">
            Generate AI-optimized content that improves your visibility in AI responses
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Content Templates */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Content Templates
                </CardTitle>
                <CardDescription>
                  Choose a content type optimized for AI visibility
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {contentTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedContentType === template.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedContentType(template.id)}
                  >
                    <div className="flex items-start gap-3">
                      <template.icon className="w-5 h-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{template.title}</h4>
                          {template.aiOptimized && (
                            <Badge variant="secondary" className="text-xs">
                              AI Optimized
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Content Generation */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="generate" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="generate">Generate Content</TabsTrigger>
                <TabsTrigger value="library">Content Library</TabsTrigger>
              </TabsList>

              <TabsContent value="generate" className="space-y-6">
                {/* Content Form */}
                <Card>
                  <CardHeader>
                    <CardTitle>AI Content Generator</CardTitle>
                    <CardDescription>
                      Generate content optimized for AI training data inclusion
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="title">Content Title (Optional)</Label>
                        <Input
                          id="title"
                          value={contentTitle}
                          onChange={(e) => setContentTitle(e.target.value)}
                          placeholder="Enter a custom title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="type">Content Type</Label>
                        <Select value={selectedContentType} onValueChange={setSelectedContentType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {contentTemplates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="topic">Topic/Subject</Label>
                      <Input
                        id="topic"
                        value={contentTopic}
                        onChange={(e) => setContentTopic(e.target.value)}
                        placeholder="What topic should the content focus on?"
                      />
                    </div>

                    <Button 
                      onClick={generateContent}
                      disabled={!contentTopic.trim() || isGenerating}
                      className="w-full"
                    >
                      {isGenerating ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Generating Content...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Generate AI-Optimized Content
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Generated Content */}
                {generatedContent && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Generated Content</CardTitle>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="bg-success/10 text-success border-success">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            AI Optimized
                          </Badge>
                        </div>
                      </div>
                      <CardDescription>
                        Content optimized for AI training data inclusion and improved visibility
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={generatedContent}
                        onChange={(e) => setGeneratedContent(e.target.value)}
                        className="min-h-64 font-mono text-sm"
                      />
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline">
                          Copy to Clipboard
                        </Button>
                        <Button variant="outline">
                          Export as Markdown
                        </Button>
                        <Button>
                          Save to Library
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="library" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Content Library</CardTitle>
                    <CardDescription>
                      Your previously generated and saved content pieces
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No saved content yet</p>
                      <p className="text-sm">Generated content will appear here</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentPage;