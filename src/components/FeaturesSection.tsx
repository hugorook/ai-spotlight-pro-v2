import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  TestTube, 
  FileText, 
  BarChart3, 
  Bot,
  Shield,
  Zap,
  Target
} from "lucide-react";

const FeaturesSection = () => {
  const features = [
    {
      icon: Search,
      title: "AI Prompt Discovery",
      description: "Identify exactly what your customers ask AI about your industry",
      color: "primary",
      benefits: ["500+ relevant prompts discovered", "Intent analysis", "Difficulty scoring"]
    },
    {
      icon: TestTube,
      title: "Multi-Model Testing",
      description: "Test your visibility across ChatGPT, Claude, Gemini, and more",
      color: "accent",
      benefits: ["Real-time AI testing", "Competitor comparison", "Position tracking"]
    },
    {
      icon: FileText,
      title: "AI Content Creator",
      description: "Generate content optimized for AI training data inclusion",
      color: "info",
      benefits: ["Press releases", "Case studies", "Expert commentary"]
    },
    {
      icon: BarChart3,
      title: "Visibility Analytics",
      description: "Track your AI mention frequency and ranking improvements",
      color: "success",
      benefits: ["Weekly reports", "Trend analysis", "ROI tracking"]
    }
  ];

  return (
    <section id="features" className="py-20 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 mb-4">
            <Zap className="w-3 h-3 mr-1" />
            Comprehensive AI Optimization
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Everything You Need to{" "}
            <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Dominate AI
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our comprehensive platform gives you all the tools to optimize, monitor, 
            and improve your company's visibility in AI model recommendations.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Card key={index} className="p-8 bg-card/50 backdrop-blur border-border/50 hover:border-primary/30 transition-all duration-300 group">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className={`
                      p-3 rounded-xl group-hover:scale-110 transition-transform duration-300
                      ${feature.color === 'primary' ? 'bg-primary/20 text-primary' : ''}
                      ${feature.color === 'accent' ? 'bg-accent/20 text-accent' : ''}
                      ${feature.color === 'info' ? 'bg-info/20 text-info' : ''}
                      ${feature.color === 'success' ? 'bg-success/20 text-success' : ''}
                    `}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {feature.benefits.map((benefit, benefitIndex) => (
                      <div key={benefitIndex} className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-success rounded-full" />
                        <span className="text-sm text-muted-foreground">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Process Flow */}
        <div className="bg-muted/20 rounded-2xl p-8 md:p-12">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              How It Works
            </h3>
            <p className="text-muted-foreground">
              Simple 4-step process to AI visibility dominance
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                icon: Target,
                title: "Setup Profile",
                description: "Tell us about your company, industry, and target customers"
              },
              {
                step: "02", 
                icon: Search,
                title: "Discover Prompts",
                description: "We identify relevant AI prompts for your business"
              },
              {
                step: "03",
                icon: Bot,
                title: "Test Visibility",
                description: "See how often you're mentioned across AI models"
              },
              {
                step: "04",
                icon: FileText,
                title: "Optimize Content",
                description: "Generate and publish AI-optimized content"
              }
            ].map((step, index) => {
              const IconComponent = step.icon;
              return (
                <div key={index} className="text-center group">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 bg-gradient-ai rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                      <IconComponent className="w-7 h-7 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                      {step.step}
                    </div>
                  </div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">
                    {step.title}
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;