import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, Shield, ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-ai-visibility.jpg";

const HeroSection = ({ onStartSetup }: { onStartSetup?: () => void }) => {
  return (
    <section className="pt-32 pb-20 px-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-subtle opacity-50" />
      <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
      
      <div className="container mx-auto relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                <Zap className="w-3 h-3 mr-1" />
                AI-Powered Visibility
              </Badge>
              
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                Is Your Company{" "}
                <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  Visible
                </span>{" "}
                When People Ask AI?
              </h1>
              
              <p className="text-xl text-muted-foreground leading-relaxed">
                Optimize your company's presence in ChatGPT, Claude, and other AI models. 
                Get recommended when your customers ask AI for solutions.
              </p>
            </div>

            {/* Value Props */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-success rounded-full" />
                <span className="text-foreground">Increase AI recommendations by 300%</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-success rounded-full" />
                <span className="text-foreground">Monitor mentions across all major AI models</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-success rounded-full" />
                <span className="text-foreground">Generate AI-optimized content automatically</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="lg" className="group" onClick={onStartSetup}>
                Test My AI Visibility
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="lg">
                Watch Demo (3 min)
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex items-center gap-6 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">2,500+</div>
                <div className="text-sm text-muted-foreground">Companies Optimized</div>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">89%</div>
                <div className="text-sm text-muted-foreground">See Increased Mentions</div>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">5X</div>
                <div className="text-sm text-muted-foreground">Average ROI</div>
              </div>
            </div>
          </div>

          {/* Right Content - Hero Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-ai">
              <img 
                src={heroImage} 
                alt="AI Visibility Dashboard" 
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
            </div>
            
            {/* Floating Stats Cards */}
            <Card className="absolute -bottom-4 -left-4 p-4 bg-card/90 backdrop-blur border-primary/20 shadow-glow">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">+247%</div>
                  <div className="text-sm text-muted-foreground">AI Mentions</div>
                </div>
              </div>
            </Card>

            <Card className="absolute -top-4 -right-4 p-4 bg-card/90 backdrop-blur border-accent/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">Top 3</div>
                  <div className="text-sm text-muted-foreground">AI Rankings</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;