// Test Dashboard components one by one to isolate the problematic import
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

// Test 1: Only basic imports
const IsolatedDashboard = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string>("");

  const testStep = async (stepNumber: number, testName: string, testFn: () => Promise<void> | void) => {
    try {
      console.log(`Testing step ${stepNumber}: ${testName}`);
      if (testFn.constructor.name === 'AsyncFunction') {
        await (testFn as () => Promise<void>)();
      } else {
        (testFn as () => void)();
      }
      console.log(`✅ Step ${stepNumber} passed: ${testName}`);
    } catch (err: any) {
      console.error(`❌ Step ${stepNumber} failed: ${testName}`, err);
      setError(`Step ${stepNumber} failed: ${err.message}`);
      throw err;
    }
  };

  const runTests = async () => {
    try {
      // Step 1: Basic React hooks
      await testStep(1, "Basic hooks", () => {
        useState(true);
        useEffect(() => {}, []);
        useCallback(() => {}, []);
      });
      setStep(2);

      // Step 2: Supabase import
      await testStep(2, "Supabase client", async () => {
        const { supabase } = await import("@/integrations/supabase/client");
        console.log("Supabase imported:", !!supabase);
      });
      setStep(3);

      // Step 3: UI Card component
      await testStep(3, "Card component", async () => {
        const { Card } = await import("@/components/ui/card");
        console.log("Card imported:", !!Card);
      });
      setStep(4);

      // Step 4: Badge component  
      await testStep(4, "Badge component", async () => {
        const { Badge } = await import("@/components/ui/badge");
        console.log("Badge imported:", !!Badge);
      });
      setStep(5);

      // Step 5: Button component
      await testStep(5, "Button component", async () => {
        const { Button } = await import("@/components/ui/button");
        console.log("Button imported:", !!Button);
      });
      setStep(6);

      // Step 6: Lucide icons
      await testStep(6, "Lucide icons", async () => {
        const { Building, Globe, TrendingUp } = await import("lucide-react");
        console.log("Icons imported:", !!Building, !!Globe, !!TrendingUp);
      });
      setStep(7);

      // Step 7: Toast hook
      await testStep(7, "Toast hook", async () => {
        const { useToast } = await import("@/hooks/use-toast");
        console.log("useToast imported:", !!useToast);
      });
      setStep(8);

      // Step 8: AppHeader component
      await testStep(8, "AppHeader component", async () => {
        const AppHeader = await import("@/components/AppHeader");
        console.log("AppHeader imported:", !!AppHeader.default);
      });
      setStep(9);

      // Step 9: Types
      await testStep(9, "Supabase types", async () => {
        const types = await import("@/types/supabase");
        console.log("Types imported:", !!types);
      });

      setStep(10); // All tests passed!

    } catch (err) {
      console.error("Test failed at step:", step, err);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#000', 
      color: '#fff', 
      padding: '20px',
      fontFamily: 'monospace'
    }}>
      <h1>Isolated Dashboard Component Testing</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <p>User: {user?.email || 'No user'}</p>
        <p>Current Step: {step}/10</p>
        <p>Status: {error ? `❌ ${error}` : step >= 10 ? '✅ All tests passed!' : '⏳ Testing...'}</p>
      </div>

      {error && (
        <div style={{ 
          background: '#ff3333', 
          padding: '15px', 
          borderRadius: '5px', 
          marginBottom: '20px' 
        }}>
          <strong>Error Found:</strong>
          <p>{error}</p>
          <p>This tells us exactly which import is causing the initialization issue!</p>
        </div>
      )}

      <div style={{ background: '#333', padding: '15px', borderRadius: '5px' }}>
        <h3>Test Progress:</h3>
        {[
          'Basic hooks',
          'Supabase client', 
          'Card component',
          'Badge component',
          'Button component',
          'Lucide icons',
          'Toast hook',
          'AppHeader component',
          'Supabase types',
          'Complete!'
        ].map((test, index) => (
          <div key={index} style={{ 
            color: step > index + 1 ? '#00ff00' : step === index + 1 ? '#ffff00' : '#666' 
          }}>
            {step > index + 1 ? '✅' : step === index + 1 ? '⏳' : '⚪'} {index + 1}. {test}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={() => window.location.href = '/dashboard-full'}
          style={{
            background: step >= 10 ? '#00ff00' : '#666',
            color: 'black',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            cursor: step >= 10 ? 'pointer' : 'not-allowed'
          }}
          disabled={step < 10}
        >
          {step >= 10 ? 'Try Full Dashboard' : 'Fix Errors First'}
        </button>
      </div>
    </div>
  );
};

export default IsolatedDashboard;