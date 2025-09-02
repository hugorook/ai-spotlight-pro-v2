import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Star,
  ChevronDown,
  Lightbulb,
  Award,
  TrendingDownIcon
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

  const aiSearchStats = [
    { metric: "180M+", label: "ChatGPT Monthly Users" },
    { metric: "10x", label: "Higher Intent Traffic" },
    { metric: "67%", label: "Trust AI Recommendations" },
    { metric: "2024", label: "AI Search Gold Rush" }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "$19.99",
      period: "per month", 
      description: "Test the waters. See if AI even knows you exist.",
      features: [
        "Basic AI visibility checks",
        "ChatGPT, Claude, Gemini testing",
        "Monthly reports",
        "Email support",
        "Up to 50 prompts tested"
      ],
      highlighted: false,
      buttonText: "Start Testing"
    },
    {
      name: "Pro",
      price: "$50",
      period: "per month",
      description: "Get serious. Track competitors, publish smarter content, measure results.",
      features: [
        "Everything in Starter",
        "Competitor tracking & analysis", 
        "Content gap analysis",
        "Smart content recommendations",
        "Weekly reports & insights",
        "Up to 500 prompts tested",
        "Priority support",
        "Content creation tools"
      ],
      highlighted: true,
      buttonText: "Get Serious"
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "pricing",
      description: "Need integrations, dashboards, or a dedicated manager? Lex scales with you.",
      features: [
        "Everything in Pro",
        "Unlimited prompts tested",
        "Custom integrations",
        "White-label dashboards",
        "Dedicated account manager",
        "Custom reporting",
        "SLA guarantee",
        "Training & onboarding"
      ],
      highlighted: false,
      buttonText: "Let's Talk"
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
                  className="w-8 h-8 text-[#5F209B]" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="text-2xl font-bold text-foreground">Lex</span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#how" className="text-muted-foreground hover:text-[#5F209B] px-3 py-2 rounded-md transition-none">
                How it Works
              </a>
              <a href="#traffic" className="text-muted-foreground hover:text-[#5F209B] px-3 py-2 rounded-md transition-none">
                Traffic
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-[#5F209B] px-3 py-2 rounded-md transition-none">
                Pricing
              </a>
            </nav>

            {/* CTA Buttons */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={handleLogin}>
                Login
              </Button>
              <Button 
                className="bg-[#5F209B] text-white hover:bg-[#4A1A7D] transition-none"
                onClick={handleGetStarted}
              >
                Cheat the Internet
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Ghost Animation Overlay - Hero section only */}
        <div className="absolute inset-0 pointer-events-none z-50">
          <GhostAnimation />
        </div>
        
        <div className="container mx-auto relative z-10">
          {/* Centered Hero Content */}
          <div className="text-center max-w-5xl mx-auto">
            <div className="space-y-8">
              <div className="space-y-6">
                <h1 className="text-4xl md:text-7xl font-bold leading-tight">
                  Cheat the Internet.
                </h1>
                
                <div className="space-y-4">
                  <h2 className="text-2xl md:text-4xl font-semibold text-[#5F209B]">
                    Meet Lex. The Generative SEO tool.
                  </h2>
                  
                  <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-4xl mx-auto">
                    AI tools are funneling huge volumes of super high intent traffic — and the big brands aren't competing.
                  </p>
                  
                  <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-4xl mx-auto">
                    Lex is your shovel in the AI search gold rush. It helps you teach AI tools to recommend you. 
                    Show up early. Own your category. Become the default choice.
                  </p>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="group bg-[#5F209B] text-white hover:bg-[#4A1A7D] transition-none text-lg px-8 py-4" 
                  onClick={handleGetStarted}
                >
                  Start Cheating
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform ml-2" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-[#5F209B] text-[#5F209B] hover:bg-[#5F209B] hover:text-white transition-none text-lg px-8 py-4"
                >
                  See How (3 min demo)
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What is Generative SEO Section */}
      <section className="py-20 px-4 bg-[#E7F0F6]">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-8 text-center">
              "What the **** is Generative SEO?"
            </h2>
            
            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
              <p>
                People use AI tools to search, ChatGPT alone has over 180M monthly users.
              </p>
              <p>
                People trust AI recommendations, so the traffic is way more valuable. You're not an option, 
                you're a recommendation. Fewer impressions — way higher intent.
              </p>
              <p>
                First movers win, and win big. Companies in SaaS and consumer products have already become 
                the "default" answer to certain prompts. Once a model learns you as the go-to example, it tends to stick.
              </p>
            </div>
            
            {/* AI Search Stats */}
            <div className="grid md:grid-cols-4 gap-6 mt-12">
              {aiSearchStats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-[#5F209B] mb-2">
                    {stat.metric}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How Lex Helps Section */}
      <section id="how" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-8 text-center">
              How does Lex help me win?
            </h2>
            
            <p className="text-lg text-muted-foreground leading-relaxed mb-12 text-center">
              Generative SEO is about teaching AI models to know you, trust you, and recommend you when 
              customers ask. Most marketers find it confusing. Lex makes it simple:
            </p>
            
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="p-8 bg-white border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-[#5F209B]/20 text-[#5F209B]">
                    <Search className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Lex checks whether you're mentioned across ChatGPT, Claude, and Gemini.
                    </h3>
                    <p className="text-muted-foreground">
                      Get real-time visibility into how AI models see your brand across all major platforms.
                    </p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-8 bg-white border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-[#5F209B]/20 text-[#5F209B]">
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Analyses the gaps Where has ChatGPT missed recommending you and why.
                    </h3>
                    <p className="text-muted-foreground">
                      Understand exactly why AI models aren't recommending you and what's missing.
                    </p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-8 bg-white border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-[#5F209B]/20 text-[#5F209B]">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Guides you step by step so models start recommending customers to you.
                    </h3>
                    <p className="text-muted-foreground">
                      Get actionable recommendations and content strategies that actually work.
                    </p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-8 bg-white border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-[#5F209B]/20 text-[#5F209B]">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Tracks your growth as your brand gets recommended more often.
                    </h3>
                    <p className="text-muted-foreground">
                      Monitor your progress and see how your AI visibility improves over time.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Traffic Section */}
      <section id="traffic" className="py-20 px-4 bg-[#E7F0F6]">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-8">
              How Much Traffic Can I actually get?
            </h2>
            
            <div className="bg-white p-8 rounded-2xl border border-gray-200 mb-8">
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-[#5F209B] mb-2">432%</div>
                  <div className="text-sm text-muted-foreground">Growth in AI search queries</div>
                  <div className="text-xs text-muted-foreground mt-1">vs. 2023</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-[#5F209B] mb-2">$2.3B</div>
                  <div className="text-sm text-muted-foreground">Value of AI search traffic</div>
                  <div className="text-xs text-muted-foreground mt-1">projected 2024</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-[#5F209B] mb-2">73%</div>
                  <div className="text-sm text-muted-foreground">Of marketers unaware</div>
                  <div className="text-xs text-muted-foreground mt-1">of this opportunity</div>
                </div>
              </div>
            </div>
            
            <p className="text-lg text-muted-foreground">
              [Stats on AI search market growth]
            </p>
          </div>
        </div>
      </section>

      {/* Promotion Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-8">
              Will I get a promotion?
            </h2>
            
            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
              <p>
                You're not chasing vanity numbers—you're positioning your brand to be the authority AI names by default. 
                When that happens, you own the moment—and that's worth way more than millions of passive visits.
              </p>
              <p className="text-xl font-semibold text-[#5F209B]">
                Also, Lex helps you with regular SEO and reporting too.. So yes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Nobody Knows Section */}
      <section className="py-20 px-4 bg-[#E7F0F6]">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-8">
              Why does nobody know about this?
            </h2>
            
            <p className="text-2xl font-bold text-[#5F209B]">
              Because they are dumb.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Pricing
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`relative p-8 flex flex-col ${plan.highlighted ? 'border-[#5F209B] shadow-xl bg-[#5F209B]/5' : 'bg-white border-gray-200'}`}>
                {plan.highlighted && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#5F209B] text-white">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="p-0 mb-6">
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                  <CardDescription className="text-base mt-4 leading-relaxed">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-0 flex flex-col flex-1">
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-[#5F209B] flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className={`w-full transition-none mt-auto ${
                      plan.highlighted 
                        ? 'bg-[#5F209B] text-white hover:bg-[#4A1A7D]' 
                        : 'bg-white text-[#5F209B] border-[#5F209B] border hover:bg-[#5F209B] hover:text-white'
                    }`}
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

      {/* CTA Section */}
      <section className="py-20 px-4 bg-[#5F209B]">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to Own Your Category?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
            Join the companies already teaching AI models to recommend them. 
            The gold rush is happening now. Don't get left behind.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-[#5F209B] hover:bg-gray-100 transition-none text-lg px-8 py-4"
              onClick={handleGetStarted}
            >
              Start Cheating Today
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#5F209B] transition-none text-lg px-8 py-4"
            >
              See Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-background border-t border-border">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg 
                  className="w-8 h-8 text-[#5F209B]" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="text-2xl font-bold text-foreground">Lex</span>
            </div>
            
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            © 2024 Lex. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;