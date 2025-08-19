import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  TrendingUp, 
  Shield, 
  ArrowRight, 
  Search,
  TestTube,
  FileText,
  BarChart3,
  Zap,
  Target,
  Bot,
  Check,
  Users,
  Globe,
  Star
} from "lucide-react";
import heroImage from "@/assets/hero-ai-visibility.jpg";
import GhostAnimation from "@/components/GhostAnimation";
import FlashlightEffect from "@/components/FlashlightEffect";

const LandingPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [flashlightActive, setFlashlightActive] = useState(true);

  const handleGetStarted = () => {
    window.location.href = '/auth';
  };

  const handleLogin = () => {
    window.location.href = '/auth';
  };

  const features = [
    {
      icon: Search,
      title: "AI Prompt Discovery",
      description: "Identify exactly what your customers ask AI about your industry",
      benefits: ["500+ relevant prompts discovered", "Intent analysis", "Difficulty scoring"]
    },
    {
      icon: TestTube,
      title: "Multi-Model Testing",
      description: "Test your visibility across ChatGPT, Claude, Gemini, and more",
      benefits: ["Real-time AI testing", "Competitor comparison", "Position tracking"]
    },
    {
      icon: FileText,
      title: "AI Content Creator",
      description: "Generate content optimized for AI training data inclusion",
      benefits: ["Press releases", "Case studies", "Expert commentary"]
    },
    {
      icon: BarChart3,
      title: "Visibility Analytics",
      description: "Track your AI mention frequency and ranking improvements",
      benefits: ["Weekly reports", "Trend analysis", "ROI tracking"]
    }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "$29",
      period: "per month",
      description: "Perfect for small businesses getting started with AI visibility",
      features: [
        "Up to 50 AI tests per month",
        "Basic visibility tracking",
        "Email support",
        "Standard AI models (GPT-3.5, Claude)",
        "Monthly reports"
      ],
      highlighted: false,
      buttonText: "Start Free Trial"
    },
    {
      name: "Professional",
      price: "$99",
      period: "per month",
      description: "Advanced features for growing companies",
      features: [
        "Up to 500 AI tests per month",
        "Advanced analytics & insights",
        "Competitor tracking",
        "All AI models (GPT-4, Claude-3, Gemini)",
        "Priority support",
        "Custom content recommendations",
        "API access"
      ],
      highlighted: true,
      buttonText: "Get Started"
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "pricing",
      description: "Custom solutions for large organizations",
      features: [
        "Unlimited AI tests",
        "White-label dashboard",
        "Dedicated account manager",
        "Custom integrations",
        "Advanced reporting",
        "SLA guarantee",
        "Training & onboarding"
      ],
      highlighted: false,
      buttonText: "Contact Sales"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Marketing Director",
      company: "TechFlow Solutions",
      avatar: "SC",
      content: "Our AI mentions increased by 300% in just 2 months. This platform is a game-changer for our digital strategy."
    },
    {
      name: "Michael Torres",
      role: "CEO",
      company: "InnovateLab",
      avatar: "MT",
      content: "Finally, we can track how AI models recommend us to customers. The insights are invaluable for our positioning."
    },
    {
      name: "Emily Rodriguez",
      role: "Head of Growth",
      company: "DataVantage",
      avatar: "ER",
      content: "The competitor analysis feature helped us identify gaps and opportunities we never knew existed."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Flashlight Effect */}
      <FlashlightEffect 
        isActive={flashlightActive} 
        onToggle={setFlashlightActive} 
      />
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg 
                  className="w-6 h-6 text-[#111E63]" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                >
                  <path d="M12 2C7.037 2 3 6.037 3 11c0 2.05.68 3.936 1.827 5.451L12 22l7.173-5.549C20.32 14.936 21 13.05 21 11c0-4.963-4.037-9-9-9zm-3 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                  <circle fill="white" cx="9" cy="9.5" r="0.5"/>
                  <circle fill="white" cx="15" cy="9.5" r="0.5"/>
                </svg>
              </div>
              <span className="text-xl font-bold text-foreground">Ghost AI</span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:bg-[#E7E2F9] hover:text-[#111E63] px-3 py-2 rounded-md transition-none">
                Features
              </a>
              <a href="#pricing" className="text-muted-foreground hover:bg-[#E7E2F9] hover:text-[#111E63] px-3 py-2 rounded-md transition-none">
                Pricing
              </a>
              <a href="#testimonials" className="text-muted-foreground hover:bg-[#E7E2F9] hover:text-[#111E63] px-3 py-2 rounded-md transition-none">
                Testimonials
              </a>
            </nav>

            {/* CTA Buttons */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={handleLogin}>
                Login
              </Button>
              <Button 
                className="bg-[#E7E2F9] text-foreground hover:bg-[#111E63] hover:text-white transition-none"
                onClick={handleGetStarted}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-48 pb-20 px-4 relative overflow-hidden">
        {/* Ghost Animation Overlay - Hero section only */}
        <div className="absolute inset-0 pointer-events-none z-50">
          <GhostAnimation />
        </div>
        
        <div className="container mx-auto relative z-10">
          {/* Centered Hero Content */}
          <div className="text-center max-w-4xl mx-auto">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-3xl md:text-5xl font-bold leading-tight">
                  Your Audience is searching{" "}
                  <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                    Can they Find You?
                  </span>
                </h1>
                
                <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                  Optimize your company's presence in ChatGPT, Claude, and other AI models. 
                  Get recommended when your customers ask AI for solutions.
                </p>
              </div>

              {/* Value Props */}
              <div className="space-y-3 max-w-2xl mx-auto">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-2 h-2 bg-[#111E63] rounded-full" />
                  <span className="text-foreground">Monitor mentions across all major AI models</span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <div className="w-2 h-2 bg-[#111E63] rounded-full" />
                  <span className="text-foreground">Identify gaps in your current digital presence</span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <div className="w-2 h-2 bg-[#111E63] rounded-full" />
                  <span className="text-foreground">Automate content to Increase AI recommendations</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="group bg-[#E7E2F9] text-foreground hover:bg-[#111E63] hover:text-white transition-none" 
                  onClick={handleGetStarted}
                >
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="bg-[#E7E2F9] text-foreground hover:bg-[#111E63] hover:text-white transition-none"
                >
                  Watch Demo (3 min)
                </Button>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
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
                <Card key={index} className="p-8 bg-[#E7E2F9] border-border/50 hover:border-primary/30 transition-all duration-300 group shadow-soft">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-primary/20 text-primary group-hover:scale-110 transition-transform duration-300">
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
                  <div key={index} className="text-left group">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-[#E7E2F9] rounded-lg flex items-center justify-center group-hover:bg-[#111E63] group-hover:text-white transition-none">
                          <IconComponent className="w-6 h-6" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-[#111E63] mb-1">STEP {step.step}</div>
                        <h4 className="text-lg font-semibold text-foreground mb-2">
                          {step.title}
                        </h4>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm ml-16">
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-muted/5">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Choose Your{" "}
              <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                Plan
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Start free and scale as you grow. All plans include our core AI visibility features.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`relative p-8 flex flex-col ${plan.highlighted ? 'border-primary shadow-glow bg-primary/5' : ''}`}>
                {plan.highlighted && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-ai text-white">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="p-0 mb-6">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                  <CardDescription className="text-sm">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-0 flex flex-col flex-1">
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className="w-full bg-[#E7E2F9] text-foreground hover:bg-[#111E63] hover:text-white transition-none mt-auto"
                    onClick={handleGetStarted}
                  >
                    {plan.buttonText}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Trusted by{" "}
              <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                Industry Leaders
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              See how companies are using AI Visibility Hub to dominate their markets.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6 bg-card/50 backdrop-blur">
                <CardContent className="p-0">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#E7E2F9] text-[#E7E2F9]" />
                    ))}
                  </div>
                  
                  <p className="text-muted-foreground mb-6">
                    "{testimonial.content}"
                  </p>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-ai rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role} at {testimonial.company}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-ai">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to Dominate AI Recommendations?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-3xl mx-auto">
            Join thousands of companies already optimizing their AI visibility. 
            Start your free trial today and see results in 24 hours.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-[#E7E2F9] text-foreground hover:bg-[#111E63] hover:text-white transition-none"
              onClick={handleGetStarted}
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button 
              size="lg" 
              className="bg-[#E7E2F9] text-foreground hover:bg-[#111E63] hover:text-white transition-none"
            >
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-muted/10 border-t border-border">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg 
                  className="w-6 h-6 text-[#111E63]" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                >
                  <path d="M12 2C7.037 2 3 6.037 3 11c0 2.05.68 3.936 1.827 5.451L12 22l7.173-5.549C20.32 14.936 21 13.05 21 11c0-4.963-4.037-9-9-9zm-3 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                  <circle fill="white" cx="9" cy="9.5" r="0.5"/>
                  <circle fill="white" cx="15" cy="9.5" r="0.5"/>
                </svg>
              </div>
              <span className="text-xl font-bold text-foreground">Ghost AI</span>
            </div>
            
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            © 2024 Ghost AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;