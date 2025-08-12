import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building, Globe, Target, Lightbulb, MapPin, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CompanyData {
  companyName: string;
  website: string;
  industry: string;
  description: string;
  targetCustomers: string;
  keyDifferentiators: string;
  geographicFocus: string[];
  competitors: string[];
}

const CompanySetupForm = ({ onComplete }: { onComplete: (data: CompanyData) => void }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    companyName: "",
    website: "",
    industry: "",
    description: "",
    products: "",
    targetCustomers: "",
    differentiators: "",
    geography: ""
  });

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const industries = [
    "Technology/Software",
    "Marketing/Advertising",
    "Professional Services",
    "Healthcare",
    "Finance/Banking",
    "E-commerce/Retail",
    "Manufacturing",
    "Education",
    "Real Estate",
    "Other"
  ];

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!formData.companyName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Company name is required.",
      });
      return;
    }

    setLoading(true);
    try {
      // Call the save-company edge function
      const { data, error } = await supabase.functions.invoke('save-company', {
        body: {
          company_name: formData.companyName,
          website_url: formData.website,
          description: formData.description,
          industry: formData.industry,
          target_customers: formData.targetCustomers,
          key_differentiators: formData.differentiators,
          geographic_focus: [formData.geography]
        }
      });

      if (error) {
        console.error('Error saving company:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to save company data. Please try again.",
        });
        return;
      }

      toast({
        title: "Success!",
        description: "Company profile saved successfully.",
      });

      onComplete(data);
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Let's Optimize Your AI Visibility
          </h1>
          <p className="text-muted-foreground text-lg">
            We need some information about your company to generate the most relevant AI prompts
          </p>
        </div>

        <Card className="p-8 bg-card/50 backdrop-blur border-border/50">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Step {step} of {totalSteps}</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>

          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Building className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">Basic Company Information</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => updateFormData("companyName", e.target.value)}
                    placeholder="e.g. Acme Software Solutions"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="website">Website URL *</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => updateFormData("website", e.target.value)}
                    placeholder="https://www.yourcompany.com"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="industry">Industry *</Label>
                  <Select value={formData.industry} onValueChange={(value) => updateFormData("industry", value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Company Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormData("description", e.target.value)}
                    placeholder="Briefly describe what your company does and your main value proposition..."
                    className="mt-1 min-h-[100px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Products & Positioning */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <Target className="w-5 h-5 text-accent" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">Products & Positioning</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="products">Products/Services *</Label>
                  <Textarea
                    id="products"
                    value={formData.products}
                    onChange={(e) => updateFormData("products", e.target.value)}
                    placeholder="Describe your main products or services in detail. Include features, benefits, and use cases..."
                    className="mt-1 min-h-[120px]"
                  />
                </div>

                <div>
                  <Label htmlFor="targetCustomers">Target Customers *</Label>
                  <Textarea
                    id="targetCustomers"
                    value={formData.targetCustomers}
                    onChange={(e) => updateFormData("targetCustomers", e.target.value)}
                    placeholder="Who are your ideal customers? (e.g., SaaS startups with 10-50 employees, enterprise manufacturers, etc.)"
                    className="mt-1 min-h-[100px]"
                  />
                </div>

                <div>
                  <Label htmlFor="differentiators">Key Differentiators *</Label>
                  <Textarea
                    id="differentiators"
                    value={formData.differentiators}
                    onChange={(e) => updateFormData("differentiators", e.target.value)}
                    placeholder="What makes you different from competitors? Awards, unique features, special expertise, etc."
                    className="mt-1 min-h-[100px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Geographic & Final Details */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-success/20 rounded-lg">
                  <MapPin className="w-5 h-5 text-success" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">Geographic Focus</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="geography">Primary Markets *</Label>
                  <Textarea
                    id="geography"
                    value={formData.geography}
                    onChange={(e) => updateFormData("geography", e.target.value)}
                    placeholder="Where do you primarily serve customers? (e.g., North America, New York City, Global, etc.)"
                    className="mt-1 min-h-[80px]"
                  />
                </div>

                <div className="bg-muted/50 p-6 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-4">What happens next?</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="bg-primary/10 text-primary">1</Badge>
                      <span className="text-sm text-muted-foreground">We'll generate 50+ relevant AI prompts for your industry</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="bg-primary/10 text-primary">2</Badge>
                      <span className="text-sm text-muted-foreground">Test your current visibility across major AI models</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="bg-primary/10 text-primary">3</Badge>
                      <span className="text-sm text-muted-foreground">Get your personalized AI optimization strategy</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
            >
              Back
            </Button>
            <Button
              variant="hero"
              onClick={handleNext}
              disabled={!formData.companyName || !formData.website || !formData.industry || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {step === totalSteps ? "Generate AI Analysis" : "Continue"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CompanySetupForm;