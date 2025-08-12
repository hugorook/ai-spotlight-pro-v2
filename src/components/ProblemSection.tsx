import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, TrendingDown, AlertTriangle } from "lucide-react";

const ProblemSection = () => {
  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            The Hidden Problem:{" "}
            <span className="text-destructive">Invisible to AI</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Millions of people ask AI for business recommendations daily. 
            If your company isn't mentioned, you're losing potential customers.
          </p>
        </div>

        {/* AI Conversation Example */}
        <div className="max-w-4xl mx-auto mb-16">
          <Card className="p-8 bg-card/50 backdrop-blur border-destructive/20">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="bg-secondary p-4 rounded-lg">
                    <p className="text-foreground">
                      "What are the best CRM software options for a growing tech startup?"
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gradient-ai rounded-full flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-foreground mb-4">
                      "Here are some popular CRM options for tech startups:"
                    </p>
                    <ul className="space-y-2 text-foreground">
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-success rounded-full" />
                        <strong>Salesforce</strong> - Comprehensive enterprise solution
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-success rounded-full" />
                        <strong>HubSpot</strong> - Great for inbound marketing
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-success rounded-full" />
                        <strong>Pipedrive</strong> - Simple sales pipeline management
                      </li>
                    </ul>
                    <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-destructive font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Your company is nowhere to be found
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Problem Stats */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <Card className="p-6 text-center bg-card/50 backdrop-blur border-warning/20">
            <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingDown className="w-8 h-8 text-warning" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">73%</h3>
            <p className="text-muted-foreground">
              of B2B buyers now start their research with AI before traditional search
            </p>
          </Card>

          <Card className="p-6 text-center bg-card/50 backdrop-blur border-destructive/20">
            <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">89%</h3>
            <p className="text-muted-foreground">
              of companies have ZERO visibility in AI model recommendations
            </p>
          </Card>

          <Card className="p-6 text-center bg-card/50 backdrop-blur border-info/20">
            <div className="w-16 h-16 bg-info/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-info" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">2.1B</h3>
            <p className="text-muted-foreground">
              AI conversations happen monthly - and your competitors are getting mentioned
            </p>
          </Card>
        </div>

        <div className="text-center">
          <Button variant="hero" size="lg">
            Check Your AI Visibility Now
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;