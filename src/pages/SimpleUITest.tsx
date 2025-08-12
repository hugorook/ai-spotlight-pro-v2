import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, Globe, TrendingUp, Check } from "lucide-react";

const SimpleUITest = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#000', 
      color: '#fff', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ marginBottom: '20px' }}>Simple UI Component Test</h1>
      <p style={{ marginBottom: '30px' }}>
        Testing each UI component individually. If any component breaks, you'll see an error.
      </p>
      
      <div style={{ marginBottom: '30px' }}>
        <h2>Test 1: Basic Div</h2>
        <div style={{ background: '#333', padding: '15px', borderRadius: '5px', margin: '10px 0' }}>
          ✅ Basic div with inline styles works!
        </div>
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h2>Test 2: Tailwind Classes</h2>
        <div className="bg-gray-800 text-white p-4 rounded-lg mb-2">
          ✅ Tailwind classes work!
        </div>
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h2>Test 3: cn Utility Function</h2>
        <TestCnUtility />
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h2>Test 4: Card Component</h2>
        <TestCardComponent />
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h2>Test 5: Button Component</h2>
        <TestButtonComponent />
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h2>Test 6: Badge Component</h2>
        <TestBadgeComponent />
      </div>
      
      <div style={{ marginBottom: '30px' }}>
        <h2>Test 7: Lucide Icons</h2>
        <TestIconsComponent />
      </div>

      <div style={{ marginTop: '40px', padding: '20px', background: '#333', borderRadius: '5px' }}>
        <h3>Results:</h3>
        <p>If you can see all the green checkmarks above, all UI components are working!</p>
        <p>If any component shows a red error, that's the component causing the initialization issue.</p>
      </div>
    </div>
  );
};

const TestCnUtility = () => {
  try {
    const className = cn("bg-blue-800", "text-white", "p-4", "rounded-lg", "mb-2");
    return (
      <div className={className}>
        ✅ cn utility function works!
      </div>
    );
  } catch (error: any) {
    return (
      <div style={{ background: '#ff3333', padding: '15px', borderRadius: '5px', color: 'white' }}>
        ❌ cn utility failed: {error.message}
      </div>
    );
  }
};

const TestCardComponent = () => {
  try {
    return (
      <Card className="bg-green-800 text-white mb-2">
        <CardHeader>
          <CardTitle>✅ Card Component Works!</CardTitle>
        </CardHeader>
        <CardContent>
          Card header and content are both rendering properly.
        </CardContent>
      </Card>
    );
  } catch (error: any) {
    return (
      <div style={{ background: '#ff3333', padding: '15px', borderRadius: '5px', color: 'white' }}>
        ❌ Card component failed: {error.message}
        <pre style={{ fontSize: '10px', marginTop: '10px', overflow: 'auto' }}>
          {error.stack}
        </pre>
      </div>
    );
  }
};

const TestButtonComponent = () => {
  try {
    return (
      <Button className="bg-purple-600 hover:bg-purple-700 text-white mb-2">
        ✅ Button Component Works!
      </Button>
    );
  } catch (error: any) {
    return (
      <div style={{ background: '#ff3333', padding: '15px', borderRadius: '5px', color: 'white' }}>
        ❌ Button component failed: {error.message}
        <pre style={{ fontSize: '10px', marginTop: '10px', overflow: 'auto' }}>
          {error.stack}
        </pre>
      </div>
    );
  }
};

const TestBadgeComponent = () => {
  try {
    return (
      <Badge className="bg-orange-600 text-white">
        ✅ Badge Works!
      </Badge>
    );
  } catch (error: any) {
    return (
      <div style={{ background: '#ff3333', padding: '15px', borderRadius: '5px', color: 'white' }}>
        ❌ Badge component failed: {error.message}
        <pre style={{ fontSize: '10px', marginTop: '10px', overflow: 'auto' }}>
          {error.stack}
        </pre>
      </div>
    );
  }
};

const TestIconsComponent = () => {
  try {
    return (
      <div className="flex gap-2 items-center p-4 bg-yellow-800 text-white rounded-lg mb-2">
        <Building className="w-5 h-5" />
        <Globe className="w-5 h-5" />
        <TrendingUp className="w-5 h-5" />
        <Check className="w-5 h-5" />
        <span>✅ Lucide Icons Work!</span>
      </div>
    );
  } catch (error: any) {
    return (
      <div style={{ background: '#ff3333', padding: '15px', borderRadius: '5px', color: 'white' }}>
        ❌ Lucide icons failed: {error.message}
        <pre style={{ fontSize: '10px', marginTop: '10px', overflow: 'auto' }}>
          {error.stack}
        </pre>
      </div>
    );
  }
};

export default SimpleUITest;