import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const DebugDashboard = () => {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const runDebug = async () => {
      try {
        console.log("Debug Dashboard: Starting...");
        
        // Check auth state
        const authState = {
          user: user ? { id: user.id, email: user.email } : null,
          hasUser: !!user
        };
        
        console.log("Auth State:", authState);
        
        // Test Supabase connection
        const { data: testData, error: testError } = await supabase
          .from('companies')
          .select('count')
          .limit(1);
          
        console.log("Supabase Test:", { testData, testError });
        
        // If user exists, try to fetch company data
        let companyData = null;
        if (user) {
          const { data: companies, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('user_id', user.id);
            
          console.log("Company Query:", { companies, companyError });
          companyData = { companies, companyError };
        }
        
        setDebugInfo({
          authState,
          supabaseTest: { testData, testError },
          companyData,
          timestamp: new Date().toISOString()
        });
        
      } catch (err: any) {
        console.error("Debug Error:", err);
        setError(err.message || "Unknown error");
      }
    };
    
    runDebug();
  }, [user]);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Debug Dashboard</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Debug Information:</h2>
          <pre className="text-sm overflow-auto max-h-96 bg-white p-2 rounded border">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
        
        <div className="mt-4">
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Go to Real Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebugDashboard;