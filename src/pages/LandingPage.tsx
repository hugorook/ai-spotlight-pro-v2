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
  LineChart,
  Zap,
  Building2,
  LogIn as LogInIcon
} from "lucide-react";

// Custom hook for typewriter effect
function useTypewriter(text: string, typingSpeed = 100, startDelay = 500, onComplete?: () => void) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    // Start typing after the initial delay
    timeout = setTimeout(() => {
      if (displayedText.length < text.length) {
        const newLength = displayedText.length + 1;
        setDisplayedText(text.substring(0, newLength));
      } else {
        setIsTyping(false);
        // Trigger callback when typing is complete, with a small delay
        if (onComplete) {
          setTimeout(() => {
            onComplete();
          }, 500); // Half second delay after typing completes
        }
      }
    }, displayedText.length === 0 ? startDelay : typingSpeed);
    
    return () => clearTimeout(timeout);
  }, [displayedText, text, typingSpeed, startDelay, onComplete]);

  return { displayedText, isTyping };
}

// Typewriter text component
function TypewriterText({ text, typingSpeed, startDelay, onComplete }: { text: string; typingSpeed?: number; startDelay?: number; onComplete?: () => void }) {
  const { displayedText, isTyping } = useTypewriter(text, typingSpeed, startDelay, onComplete);
  
  return (
    <span className="relative font-corben" style={{fontWeight: 400}}>
      {displayedText}
      <span 
        className={`inline-block w-[0.1em] h-[1.2em] bg-[#282823] align-middle ml-1 ${isTyping ? 'animate-blink' : 'opacity-0'}`}
      />
    </span>
  );
}

// Hover/tap accordion for steps
function AccordionSteps({
  steps,
}: {
  steps: { title: string; description: string; icon: React.ComponentType<{ className?: string }> }[];
}) {
  const [activeIndex, setActiveIndex] = useState<number>(0);

  return (
    <div className="max-w-4xl md:max-w-5xl mx-auto space-y-5 mb-6 min-h-[560px] md:min-h-[620px]">
      {steps.map((step, index) => {
        const expanded = activeIndex === index;
        return (
          <div
            key={step.title}
            className="group bg-white border border-[#e7e5df] rounded-2xl overflow-hidden transition-shadow hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
            onMouseEnter={() => setActiveIndex(index)}
            onFocus={() => setActiveIndex(index)}
            onClick={() => setActiveIndex(index)}
          >
            <div className="flex items-center justify-between px-6 py-5">
              <h3 className="font-corben text-[#282823] text-xl md:text-2xl" style={{fontWeight: 400}}>
                {step.title}
              </h3>
              <div className="h-12 w-12 rounded-full bg-[#d6ff71] flex items-center justify-center shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]">
                <Search className="w-5 h-5 text-black" />
              </div>
            </div>

            <div
              className={`${
                expanded ? 'max-h-[320px] md:max-h-[380px] opacity-100 pt-10 pb-8' : 'max-h-0 opacity-0 pt-0 pb-0'
              } transition-all duration-500 ease-in-out px-6 text-[#3d3d38] text-sm md:text-base border-t border-[#efeee9]`}
            >
              <p className="leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const LandingPage = () => {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [footerSearchValue, setFooterSearchValue] = useState("");
  const [showContent, setShowContent] = useState(false);

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
    { label: "Dashboard", icon: TrendingUp, href: "/dashboard" },
    { label: "Site Connection", icon: Building2, href: "/settings/connections" },
    { label: "Analytics Hub", icon: BarChart3, href: "/analytics" },
    { label: "Prompts", icon: FileText, href: "/prompts" },
  ];

  const settingsItems = [
    { label: "Settings", icon: Settings, href: "/settings" },
  ];

  const statisticsData = [
    { value: "180M", description: "ChatGPT Monthly Users" },
    { value: "10X", description: "Higher Intent Traffic" },
    { value: "67%", description: "Trust AI Recommendations" },
  ];

  const processSteps = [
    {
      title: "Check your visibility",
      description: "What would an AI model say about your brand? Dexter runs a real-time audit across major platforms, from search engines to chatbots, and shows you exactly how you appear, where you’re strong, and where the blind spots are.",
      icon: Eye,
    },
    {
      title: "Analyse the gaps",
      description: "It’s not just about being visible, it’s about outperforming competitors. Dexter reveals the prompts your rivals own, the spaces you’re missing, and the areas where you can quickly win ground.",
      icon: Target,
    },
    {
      title: "Let Dexter guide you",
      description: "Most SEO tools drown you in data. Dexter cuts through the noise with clear, practical steps: the few things worth doing today that will actually improve your AI visibility.",
      icon: Rocket,
    },
    {
      title: "Track your growth",
      description: "Visibility builds over time. Dexter shows your share of mentions growing week by week, highlights which actions are working, and benchmarks you against competitors so you can prove the impact.",
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
      backgroundColor: "bg-[#E7FF8A]",
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
      <div className="max-w-[1920px] mx-auto px-6 lg:pl-[12.5rem] relative">
        {/* Background blur effect */}
        <div className="absolute w-full h-[1200px] top-[17px] left-0">
          <div className="w-full max-w-[1830px] h-full mx-auto bg-[#ffffff78] rounded-[50%] blur-[200px]" />
        </div>

        {/* Fixed Left Vertical Nav - full height with separate Login box below */}
        <aside className={`hidden lg:block fixed top-6 bottom-6 left-6 z-50 ${showContent ? 'animate-fadeIn' : 'opacity-0'}`}>
          <div className="h-full w-44 flex flex-col gap-3">
            {/* Nav box */}
            <div className="flex-1 bg-white rounded-2xl border border-[#d9d9d9] shadow-sm overflow-hidden flex flex-col">
              <div className="pl-3.5 pr-3 py-2 text-left text-[16px] md:text-[18px] text-[#282823] font-corben" style={{fontWeight: 400}}>Dexter</div>

              {/* Main Navigation */}
              <nav className="px-2 space-y-1 flex-1 mt-3">
                {navigationItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="text-[#282823b3] hover:bg-[#e7f8be] hover:text-[#282823] flex items-center justify-between px-3 py-2 rounded-md transition-colors"
                  >
                    <span className="text-[13px] font-normal">{item.label}</span>
                    <item.icon className="w-3.5 h-3.5" />
                  </a>
                ))}
              </nav>

              {/* Settings Navigation (stuck to bottom of white box) */}
              <nav className="px-2 pb-3 space-y-1 mt-auto">
                {settingsItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="text-[#282823b3] hover:bg-[#e7f8be] hover:text-[#282823] flex items-center justify-between px-3 py-2 rounded-md transition-colors"
                  >
                    <span className="text-[13px] font-normal">{item.label}</span>
                    <item.icon className="w-3.5 h-3.5" />
                  </a>
                ))}
              </nav>
            </div>

            {/* Login box (same style) */}
            <div className="bg-white rounded-2xl border border-[#d9d9d9] shadow-sm p-2">
              <a
                href="/auth"
                className="w-full block text-[#282823b3] hover:bg-[#e7f8be] hover:text-[#282823] px-3 py-2 rounded-md transition-colors flex items-center justify-between"
              >
                <span className="text-[13px] font-normal">Log in</span>
                <LogInIcon className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </aside>

        {/* Header */}
        <header className={`relative z-10 flex items-center justify-end py-6 ${showContent ? 'animate-fadeIn' : 'opacity-0'}`}>
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
              className="group !bg-[#262622] !text-white hover:!bg-white hover:!text-[#262622] transition-colors font-corben rounded-2xl px-6"
              >
              Boost your brand
              <Rocket className="w-4 h-4 ml-2 text-white group-hover:text-[#262622]" />
              </Button>
        </div>
      </header>

      {/* Hero Section */}
        <section className="relative z-10 text-center py-20">
          <div className={`inline-flex items-center gap-3 mb-3 ${showContent ? 'animate-fadeInUp' : 'opacity-0'}`}>
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
              onComplete={() => setShowContent(true)}
            />
                </h1>
                
          <p className={`text-[#3d3d38] text-lg max-w-3xl mx-auto mb-0 ${showContent ? 'animate-fadeInUp-delay-1' : 'opacity-0'}`}>
            AI is now funnelling huge volumes of super high intent traffic, but
            most brands aren't competing.
          </p>

          <p className={`font-semibold text-[#3d3d38] text-lg mb-12 ${showContent ? 'animate-fadeInUp-delay-2' : 'opacity-0'}`}>
            Dexter is your shovel in the AI search gold rush.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className={`max-w-2xl mx-auto mb-20 ${showContent ? 'animate-fadeInUp-delay-3' : 'opacity-0'}`}>
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

          {/* Future of Search Section (narrow white box) */}
          <div className={`bg-white rounded-[28px] px-8 py-10 md:px-14 md:py-14 mb-4 relative overflow-hidden max-w-7xl mx-auto ${showContent ? 'animate-fadeInUp' : 'opacity-0 translate-y-20'}`}>
            <div className="text-center">
              <Badge className="bg-[#ddff89] text-[#3d3d38] mb-6 text-sm px-4 py-2">
                The future of search
              </Badge>

              <h2 className="font-corben text-[#282823] text-4xl md:text-5xl mb-6" style={{fontWeight: 400}}>
                'What the ****<br />is Generative SEO?'
            </h2>
            
              <div className="space-y-5 max-w-3xl mx-auto text-left md:text-center">
                <p className="text-[#3d3d38] text-base md:text-lg">
                People use AI tools to search, ChatGPT alone has over 180M monthly users.
              </p>
                <p className="text-[#3d3d38] text-base md:text-lg">
                  People trust AI recommendations, so the traffic is way more valuable. You're not an
                  option, you're a recommendation. Fewer impressions — way higher intent.
                </p>
                <p className="text-[#3d3d38] text-base md:text-lg">
                  First movers win, and win big. Companies in SaaS and consumer products have already
                  become the "default" answer to certain prompts. Once a model learns you as the go-to
                  example, it tends to stick.
                </p>
              </div>
            </div>
            
            {/* Inline Green Stats + CTA panel */}
            <div className="mt-10 md:mt-12">
              <div className="bg-[#ddff89] rounded-2xl px-6 py-8 md:px-10 md:py-10 flex flex-col md:flex-row items-center md:items-center justify-between gap-12">
                {/* Left: Headline, subcopy, CTA */}
                <div className="order-1 flex-1 w-full text-left">
                  <h3 className="font-corben text-[#282823] text-2xl md:text-4xl lg:text-5xl mb-2" style={{fontWeight: 400}}>
                    Your customers are already here
                  </h3>
                  <p className="text-[#3d3d38] text-sm md:text-base mb-4">
                    Show up early. Own your category.
                  </p>
                  <Button
                    onClick={() => navigate('/auth')}
                    className="group bg-[#282823] text-white hover:bg-white hover:text-[#262622] transition-colors font-corben rounded-2xl px-6 py-2.5"
                  >
                    Leverage this traffic
                    <ArrowRight className="w-4 h-4 ml-2 text-white group-hover:text-[#262622]" />
                  </Button>
                </div>
                {/* Right: Stats */}
                <div className="order-2 flex-1 grid grid-cols-3 gap-10 md:gap-12 w-full justify-items-center">
                  {statisticsData.map((stat) => (
                    <div key={stat.description} className="text-center">
                      <div className="font-corben text-[#282823] text-4xl md:text-6xl lg:text-7xl" style={{fontWeight: 400}}>
                        {stat.value}
                      </div>
                      <div className="text-[#3d3d38] text-xs md:text-sm font-medium mt-1">
                        {stat.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

        {/* How it Works Section */}
        <section className={`relative z-10 pt-4 pb-14 ${showContent ? 'animate-fadeInUp' : 'opacity-0'}`}>
          <div className="max-w-7xl mx-auto">
          <div className="text-center mb-4">
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

          {/* Hover-accordion list */}
          <AccordionSteps steps={processSteps} />

          </div>
          <div className="text-center absolute left-1/2 -translate-x-1/2 bottom-2 md:bottom-4">
            <Button
              onClick={() => navigate('/auth')}
              className="group bg-[#282823] text-white hover:bg-white hover:text-[#262622] transition-colors font-corben rounded-2xl px-8 py-3"
            >
              Get started
              <ArrowRight className="w-4 h-4 ml-2 text-white group-hover:text-[#262622]" />
            </Button>
        </div>
      </section>

      {/* Pricing Section */}
        <section className={`relative z-10 py-20 ${showContent ? 'animate-fadeInUp' : 'opacity-0'}`}>
          <div className="text-center mb-12">
            <Badge className="bg-[#ddff89] text-[#282823] mb-6 text-sm px-4 py-2">
              Pricing
            </Badge>
            
            <h2 className="font-corben text-[#1a1a1a] text-5xl" style={{fontWeight: 400}}>
              Show up early.<br />
              Own your category.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-7xl mx-auto items-stretch">
            {pricingPlans.map((plan, index) => (
              <Card
                key={index}
                className={`${plan.backgroundColor} border-0 relative overflow-hidden h-full flex flex-col`}
              >
                {plan.popular && (
                  <Badge className="absolute top-6 right-6 bg-[#32322d] text-white">
                    Most popular
                  </Badge>
                )}
                
                <CardContent className="p-8 flex flex-col flex-1 text-left">
                  <h3 className={`font-corben ${plan.textColor} text-5xl mb-4`} style={{fontWeight: 400}}>
                    {plan.name}
                  </h3>
                  
                  <div className={`font-corben ${plan.textColor} text-2xl mb-8`} style={{fontWeight: 400}}>
                    {plan.price}
                  </div>

                  <div className="space-y-4 mb-8 flex-1">
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
                    className="group mt-auto w-full bg-[#262622] text-white hover:bg-white hover:text-[#262622] transition-colors font-corben rounded-2xl"
                  >
                    {plan.buttonText}
                    <ArrowRight className="w-4 h-4 ml-2 text-white group-hover:text-[#262622]" />
                  </Button>
                </CardContent>
              </Card>
            ))}
        </div>
      </section>

      {/* CTA Section */}
        <section className={`relative z-10 text-center py-20 ${showContent ? 'animate-fadeInUp' : 'opacity-0'}`}>
          <div className="max-w-7xl mx-auto">
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
          </div>
      </section>

      {/* Footer */}
        <footer className={`relative z-10 bg-white/80 backdrop-blur rounded-t-3xl py-12 px-8 ${showContent ? 'animate-fadeInUp' : 'opacity-0'}`}>
          <div className="max-w-7xl mx-auto">
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