import { useState } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ProblemSection from "@/components/ProblemSection";
import FeaturesSection from "@/components/FeaturesSection";
import AITestingDemo from "@/components/AITestingDemo";
import CompanySetupForm from "@/components/CompanySetupForm";

const Index = () => {
  const [showSetupForm, setShowSetupForm] = useState(false);

  const handleStartSetup = () => {
    setShowSetupForm(true);
  };

  const handleSetupComplete = (data: Record<string, unknown>) => {
    console.log("Company setup completed:", data);
    // Redirect to dashboard after successful setup
    window.location.href = '/dashboard';
  };

  if (showSetupForm) {
    return <CompanySetupForm onComplete={handleSetupComplete} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onStartSetup={handleStartSetup} />
      <HeroSection onStartSetup={handleStartSetup} />
      <ProblemSection />
      <FeaturesSection />
      <AITestingDemo />
    </div>
  );
};

export default Index;
