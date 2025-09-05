import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  ArrowRight,
  Rocket,
  TrendingUp,
  BarChart3,
  FileText,
  Settings,
  Home,
  Check,
  Eye,
  Target,
  LineChart
} from "lucide-react";

// Custom hook for typewriter effect
function useTypewriter(text: string, typingSpeed = 100, startDelay = 500) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    // Start typing after the initial delay
    timeout = setTimeout(() => {
      if (displayedText.length < text.length) {
        setDisplayedText(text.substring(0, displayedText.length + 1));
      } else {
        setIsTyping(false);
      }
    }, displayedText.length === 0 ? startDelay : typingSpeed);
    
    return () => clearTimeout(timeout);
  }, [displayedText, text, typingSpeed, startDelay]);

  return { displayedText, isTyping };
}

// Typewriter text component
function TypewriterText({ text, typingSpeed, startDelay }: { text: string; typingSpeed?: number; startDelay?: number }) {
  const { displayedText, isTyping } = useTypewriter(text, typingSpeed, startDelay);
  
  return (
    <span className="relative font-corben" style={{fontWeight: 400}}>
      {displayedText}
      <span 
        className={`inline-block w-[0.1em] h-[1.2em] bg-[#282823] align-middle ml-1 ${isTyping ? 'animate-blink' : 'opacity-0'}`}
      />
    </span>
  );
}

const LandingPage = () => {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [footerSearchValue, setFooterSearchValue] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate('/auth');
    }
  };

  const handleFooterSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (footerSearchValue.trim()) {
      navigate('/auth');
    }
  };

  const navigationItems = [
    { label: "How it works", icon: Home, href: "#how" },
    { label: "Dashboard", icon: TrendingUp, href: "/dashboard" },
    { label: "Analytics", icon: BarChart3, href: "/analytics" },
    { label: "Prompts", icon: FileText, href: "/prompts" },
    { label: "Company", icon: Settings, href: "/content" },
  ];

  const statisticsData = [
    { value: "180M", description: "ChatGPT Monthly Users" },
    { value: "10X", description: "Higher Intent Traffic" },
    { value: "67%", description: "Trust AI Recommendations" },
  ];

  const processSteps = [
    {
      title: "Check your visibility",
      description: "Get real-time visibility into how AI models see your brand across all major platforms.",
      icon: Eye,
    },
    {
      title: "Analyse the gaps",
      description: "Identify where your competitors are winning and where you're missing out.",
      icon: Target,
    },
    {
      title: "Let Dexter guide you",
      description: "Get actionable recommendations to improve your AI visibility.",
      icon: Rocket,
    },
    {
      title: "Track your growth",
      description: "Monitor your progress and watch your AI mentions grow over time.",
      icon: LineChart,
    },
  ];

  const pricingPlans = [
    {
      name: "Prospect",
      price: "$19.99 pm",
      description: "Test the waters. See if AI even knows you exist.",
      features: [
        "Basic AI visibility checks",
        "ChatGPT, Claude, Gemini testing",
        "Monthly reports",
        "Email support",
        "Up to 50 prompts tested",
      ],
      buttonText: "Start Testing",
      backgroundColor: "bg-white",
      textColor: "text-[#282823]",
    },
    {
      name: "Pro",
      price: "$50 pm",
      description: "Track competitors, publish content, measure results.",
      features: [
        "Everything in Starter",
        "Competitor tracking & analysis",
        "Content gap analysis",
        "Smart content recommendations",
        "Weekly reports & insights",
        "Up to 500 prompts tested",
        "Priority support",
        "Content creation tools",
      ],
      buttonText: "Get Ahead",
      backgroundColor: "bg-[#f5f5e8]",
      textColor: "text-[#282823]",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "Need integrations, dashboards, or a dedicated manager?",
      features: [
        "Everything in Pro",
        "Unlimited prompts tested",
        "Custom integrations",
        "White-label dashboards",
        "Dedicated account manager",
        "Custom reporting",
        "SLA guarantee",
        "Training & onboarding",
      ],
      buttonText: "Let's Talk",
      backgroundColor: "bg-[#282823]",
      textColor: "text-[#ece7e1]",
      featureTextColor: "text-white",
    },
  ];

  return (
    <main className="bg-[#ece7e0] min-h-screen">
      <div className="max-w-[1920px] mx-auto px-6 relative">
        {/* Background blur effect */}
        <div className="absolute w-full h-[1200px] top-[17px] left-0">
          <div className="w-full max-w-[1830px] h-full mx-auto bg-[#ffffff78] rounded-[50%] blur-[200px]" />
        </div>

        {/* Fixed Left Vertical Nav */}
        <aside className="hidden lg:block fixed top-6 left-6 z-50">
          <div className="w-40 bg-white rounded-2xl border border-[#d9d9d9] shadow-sm">
            <div className="px-3 pt-3 pb-2 text-[13px] text-[#282823] font-corben" style={{fontWeight: 400}}>Dexter</div>
            <nav className="px-2 pb-2 space-y-1">
              {navigationItems.map((item, index) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={`${
                    index === 0
                      ? 'bg-[#ddff89] text-[#282823]'
                      : 'text-[#282823b3] hover:bg-[#e7f8be] hover:text-[#282823]'
                  } flex items-center justify-between px-3 py-2 rounded-md transition-colors`}
                >
                  <span className="text-[13px] font-normal">{item.label}</span>
                  <item.icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Header */}
        <header className="relative z-10 flex items-center justify-end py-6">
          {/* Left Navigation */}
          <nav className="hidden">
            <div className="flex items-center gap-2">
              <div className="bg-[#ddff89] px-3 py-1 rounded-lg">
                <span className="font-corben text-[#282823] text-xl">Dexter</span>
              </div>
            </div>
            <div className="flex items-center space-x-6" />
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/auth')}
              className="bg-white border-[#3b3b3738] text-[#282823] font-corben rounded-2xl px-6"
            >
              Log In
            </Button>
            <Button
              onClick={() => navigate('/auth')}
              className="bg-[#262622] text-white font-corben rounded-2xl px-6"
            >
              Boost your brand
              <Rocket className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative z-10 text-center py-20">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="bg-[#ddff89] px-4 py-2 rounded-lg">
              <span className="font-corben text-[#282823] text-lg">Dexter</span>
            </div>
            <p className="font-semibold text-[#3d3d38] text-lg">
              Win the Generative SEO race
            </p>
          </div>

          <h1 className="font-corben text-[#282823] text-6xl md:text-7xl leading-tight mb-2" style={{fontWeight: 400}}>
            <TypewriterText 
              text="Cheat the internet." 
              typingSpeed={100}
              startDelay={500}
            />
          </h1>

          <p className="text-[#3d3d38] text-lg max-w-3xl mx-auto mb-0">
            AI is now funnelling huge volumes of super high intent traffic, but
            most brands aren't competing.
          </p>

          <p className="font-semibold text-[#3d3d38] text-lg mb-12">
            Dexter is your shovel in the AI search gold rush.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto mb-20">
            <div className="relative">
              <div className="absolute inset-0 top-6 bg-[#a9a9a9] rounded-full blur-[50px] opacity-20" />
              <div className="relative bg-white rounded-3xl border border-[#28282357] p-3">
                <Input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search or paste your website url"
                  className="border-0 text-base placeholder:text-[#afaca7] pr-16"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#d6ff71] hover:bg-[#c4ee60] rounded-full"
                >
                  <Search className="w-4 h-4 text-black" />
                </Button>
              </div>
            </div>
          </form>

          {/* Future of Search Section */}
          <div className="bg-white rounded-3xl p-12 mb-20 relative overflow-hidden">
            <Badge className="bg-[#ddff89] text-[#3d3d38] mb-6 text-sm px-4 py-2">
              The future of search
            </Badge>
            
            <h2 className="font-corben text-[#282823] text-5xl mb-8" style={{fontWeight: 400}}>
              'What the ****<br />
              is Generative SEO?'
            </h2>

            <p className="text-[#3d3d38] text-lg max-w-3xl mx-auto mb-8">
              People use AI tools to search, ChatGPT alone has over 180M monthly users.
            </p>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
              <p className="text-[#3d3d38] text-lg">
                People trust AI recommendations, so the traffic is way more
                valuable. You're not an option, you're a recommendation. Fewer
                impressions — way higher intent.
              </p>
              <p className="text-[#3d3d38] text-lg">
                First movers win, and win big. Companies in SaaS and consumer
                products have already become the "default" answer to certain
                prompts. Once a model learns you as the go-to example, it tends
                to stick.
              </p>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white/80 backdrop-blur rounded-3xl p-8 mb-20">
            <h3 className="font-corben text-[#282823] text-2xl mb-8" style={{fontWeight: 400}}>
              Your customers are already here
            </h3>
            
            <div className="grid grid-cols-3 gap-8">
              {statisticsData.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="font-corben text-[#282823] text-5xl mb-2">
                    {stat.value}
                  </div>
                  <div className="text-[#3d3d38] text-sm font-medium">
                    {stat.description}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[#3d3d38] font-medium mt-8">
              Show up early. Own your category.
            </p>

            <Button
              onClick={() => navigate('/auth')}
              className="bg-[#282823] text-white font-corben rounded-2xl px-8 py-3 mt-6"
            >
              Leverage this traffic
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="relative z-10 py-20">
          <div className="text-center mb-12">
            <Badge className="bg-[#ddff89] text-[#3d3d38] mb-6 text-sm px-4 py-2">
              How can I win?
            </Badge>
            
            <h2 className="font-corben text-[#282823] text-5xl mb-8" style={{fontWeight: 400}}>
              Win the Generative SEO race
            </h2>

            <p className="text-[#3d3d38] text-lg max-w-2xl mx-auto mb-4">
              Generative SEO is about teaching AI models to know you, trust you,
              and recommend you when customers ask.
            </p>

            <p className="font-semibold text-[#3d3d38] text-lg">
              Most marketers find it confusing. Dexter makes it simple.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12">
            {processSteps.map((step, index) => (
              <Card key={index} className="bg-white border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="bg-[#ddff89] w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                    <step.icon className="w-6 h-6 text-[#282823]" />
                  </div>
                  <h3 className="font-corben text-[#282823] text-xl mb-3" style={{fontWeight: 400}}>
                    {step.title}
                  </h3>
                  <p className="text-[#3d3d38] text-sm">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button
              onClick={() => navigate('/auth')}
              className="bg-[#282823] text-white font-corben rounded-2xl px-8 py-3"
            >
              Get started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="relative z-10 py-20">
          <div className="text-center mb-12">
            <Badge className="bg-[#ddff89] text-[#282823] mb-6 text-sm px-4 py-2">
              Pricing
            </Badge>
            
            <h2 className="font-corben text-[#1a1a1a] text-5xl" style={{fontWeight: 400}}>
              Show up early.<br />
              Own your category.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4 max-w-7xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card
                key={index}
                className={`${plan.backgroundColor} border-0 relative overflow-hidden`}
              >
                {plan.popular && (
                  <Badge className="absolute top-6 right-6 bg-[#32322d] text-white">
                    Most popular
                  </Badge>
                )}
                
                <CardContent className="p-8">
                  <h3 className={`font-corben ${plan.textColor} text-5xl mb-4`}>
                    {plan.name}
                  </h3>
                  
                  <div className={`font-corben ${plan.textColor} text-2xl mb-8`}>
                    {plan.price}
                  </div>

                  <div className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start gap-3">
                        <Check className={`w-4 h-4 mt-1 flex-shrink-0 ${plan.featureTextColor || 'text-[#3d3d38]'}`} />
                        <p className={`text-sm font-semibold ${plan.featureTextColor || 'text-[#3d3d38]'}`}>
                          {feature}
                        </p>
                      </div>
                    ))}
                  </div>

                  <p className={`text-sm font-medium mb-6 ${plan.featureTextColor || plan.textColor}`}>
                    {plan.description}
                  </p>

                  <Button
                    onClick={() => navigate('/auth')}
                    className="w-full bg-[#282823] text-white font-corben rounded-2xl"
                  >
                    {plan.buttonText}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative z-10 text-center py-20">
          <h2 className="font-corben text-[#282823] text-6xl mb-8" style={{fontWeight: 400}}>
            Cheat the internet.
          </h2>

          <p className="font-semibold text-[#3d3d38] text-lg mb-8">
            Ready to Own Your Category? <span className="font-normal">Try for free</span>
          </p>

          {/* Footer Search Bar */}
          <form onSubmit={handleFooterSearchSubmit} className="max-w-2xl mx-auto mb-20">
            <div className="relative">
              <div className="absolute inset-0 top-6 bg-[#a9a9a9] rounded-full blur-[50px] opacity-20" />
              <div className="relative bg-white rounded-3xl border border-[#28282357] p-3">
                <Input
                  type="text"
                  value={footerSearchValue}
                  onChange={(e) => setFooterSearchValue(e.target.value)}
                  placeholder="Search or paste your website url"
                  className="border-0 text-base placeholder:text-[#afaca7] pr-16"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#d6ff71] hover:bg-[#c4ee60] rounded-full"
                >
                  <Search className="w-4 h-4 text-black" />
                </Button>
              </div>
            </div>
          </form>
        </section>

        {/* Footer */}
        <footer className="relative z-10 bg-white/80 backdrop-blur rounded-t-3xl py-12 px-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
              <div className="flex items-center gap-3 mb-4 md:mb-0">
                <div className="bg-[#ddff89] px-4 py-2 rounded-lg">
                  <span className="font-corben text-[#282823] text-lg">Dexter</span>
                </div>
                <p className="font-semibold text-[#3d3d38]">
                  Win the Generative SEO race
                </p>
              </div>

              <nav className="flex gap-8">
                <a href="#" className="font-corben text-[#282823] hover:opacity-70 transition-opacity">
                  Privacy Policy
                </a>
                <a href="#" className="font-corben text-[#282823] hover:opacity-70 transition-opacity">
                  Terms
                </a>
                <a href="#" className="font-corben text-[#282823] hover:opacity-70 transition-opacity">
                  Contact
                </a>
              </nav>
            </div>

            <p className="text-[#3d3d38] text-sm">
              © 2025 Dexter. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
};

export default LandingPage;