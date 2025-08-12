import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/types/supabase";

type Company = Tables<'companies'>;
type TestResult = Tables<'ai_tests'>;

const StepByStepDashboard = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [company, setCompany] = useState<Company | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);

  const loadDashboardData = useCallback(async () => {
    try {
      console.log("Starting data load");
      setLogs(prev => [...prev, "Starting data load"]);
      
      if (!user) {
        console.log("No user found, returning early");
        setLogs(prev => [...prev, "No user found"]);
        setLoading(false);
        return;
      }

      console.log(`User found: ${user.id}`);
      setLogs(prev => [...prev, `User found: ${user.id}`]);

      // Load company data
      console.log("Fetching company data...");
      setLogs(prev => [...prev, "Fetching company data..."]);
      
      const { data: companies, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id);

      const logMsg = `Company query: ${companies?.length || 0} companies, error: ${companyError?.message || 'none'}`;
      console.log(logMsg);
      setLogs(prev => [...prev, logMsg]);

      if (companyError) {
        console.log(`Company error: ${companyError.message}`);
        setLogs(prev => [...prev, `Company error: ${companyError.message}`]);
        setLoading(false);
        return;
      }

      const company = companies && companies.length > 0 ? companies[0] : null;
      if (company) {
        console.log(`Company found: ${company.company_name}`);
        setLogs(prev => [...prev, `Company found: ${company.company_name}`]);
        setCompany(company);

        // Load test results
        console.log("Fetching test results...");
        setLogs(prev => [...prev, "Fetching test results..."]);
        
        const { data: tests, error: testsError } = await supabase
          .from('ai_tests')
          .select('*')
          .eq('company_id', company.id)
          .order('test_date', { ascending: false })
          .limit(10);

        const testLogMsg = `Tests: ${tests?.length || 0} found, error: ${testsError?.message || 'none'}`;
        console.log(testLogMsg);
        setLogs(prev => [...prev, testLogMsg]);

        if (!testsError && tests) {
          setTestResults(tests);
        }
      } else {
        console.log("No company found for user");
        setLogs(prev => [...prev, "No company found"]);
      }

      console.log("Data loading complete");
      setLogs(prev => [...prev, "Data loading complete"]);
    } catch (error: any) {
      console.log(`Caught error: ${error.message}`);
      setLogs(prev => [...prev, `Error: ${error.message}`]);
    } finally {
      setLoading(false);
      console.log("Loading finished");
      setLogs(prev => [...prev, "Loading finished"]);
    }
  }, [user]);

  useEffect(() => {
    console.log("StepByStepDashboard: useEffect triggered");
    if (user) {
      console.log("StepByStepDashboard: User exists, loading data");
      loadDashboardData();
    } else {
      console.log("StepByStepDashboard: No user, setting loading to false");
      setLoading(false);
    }
  }, [user, loadDashboardData]);

  const nextStep = () => {
    setStep(prev => prev + 1);
    console.log(`Moving to step ${step + 1}`);
    setLogs(prev => [...prev, `Moving to step ${step + 1}`]);
  };

  // Step 1: Basic structure
  if (step === 1) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '20px' }}>
        <h1>Step 1: Basic Structure Test</h1>
        <p>User: {user?.email || 'No user'}</p>
        <p>Loading: {loading.toString()}</p>
        <p>Company: {company?.company_name || 'No company'}</p>
        <button 
          onClick={nextStep}
          style={{ background: '#007bff', color: 'white', padding: '10px', border: 'none', borderRadius: '5px', margin: '10px 0' }}
        >
          Next Step
        </button>
        <div style={{ background: '#333', padding: '10px', marginTop: '20px', fontSize: '12px' }}>
          <h3>Logs:</h3>
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </div>
    );
  }

  // Step 2: Try importing UI components
  if (step === 2) {
    try {
      // This will test if UI components can be imported
      addLog("Testing UI component imports");
      
      return (
        <div style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '20px' }}>
          <h1>Step 2: UI Components Test</h1>
          <p>Trying to import and use UI components...</p>
          <div style={{ border: '1px solid #555', padding: '10px', margin: '10px 0' }}>
            <p>Basic card-like structure</p>
            <p>Company: {company?.company_name}</p>
            <p>Tests: {testResults.length}</p>
          </div>
          <button 
            onClick={nextStep}
            style={{ background: '#007bff', color: 'white', padding: '10px', border: 'none', borderRadius: '5px', margin: '10px 0' }}
          >
            Next Step
          </button>
          <div style={{ background: '#333', padding: '10px', marginTop: '20px', fontSize: '12px' }}>
            <h3>Logs:</h3>
            {logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </div>
      );
    } catch (error: any) {
      addLog(`Step 2 error: ${error.message}`);
      return (
        <div style={{ minHeight: '100vh', background: '#ff0000', color: '#fff', padding: '20px' }}>
          <h1>Step 2 Failed!</h1>
          <p>Error in UI components: {error.message}</p>
          <button onClick={() => setStep(1)}>Back to Step 1</button>
        </div>
      );
    }
  }

  // Step 3: Try with actual UI components
  if (step === 3) {
    try {
      const { Card, CardContent, CardHeader, CardTitle } = require("@/components/ui/card");
      
      addLog("Successfully imported Card components");
      
      return (
        <div style={{ minHeight: '100vh', background: '#111', padding: '20px' }}>
          <h1 style={{ color: '#fff', marginBottom: '20px' }}>Step 3: Real UI Components</h1>
          <Card>
            <CardHeader>
              <CardTitle>Company Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Name: {company?.company_name}</p>
              <p>Industry: {company?.industry}</p>
              <p>Tests: {testResults.length}</p>
            </CardContent>
          </Card>
          <button 
            onClick={nextStep}
            style={{ background: '#007bff', color: 'white', padding: '10px', border: 'none', borderRadius: '5px', margin: '10px 0' }}
          >
            Next Step
          </button>
          <div style={{ background: '#333', color: '#fff', padding: '10px', marginTop: '20px', fontSize: '12px' }}>
            <h3>Logs:</h3>
            {logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </div>
      );
    } catch (error: any) {
      addLog(`Step 3 error: ${error.message}`);
      return (
        <div style={{ minHeight: '100vh', background: '#ff0000', color: '#fff', padding: '20px' }}>
          <h1>Step 3 Failed!</h1>
          <p>Error with UI components: {error.message}</p>
          <pre>{error.stack}</pre>
          <button onClick={() => setStep(2)}>Back to Step 2</button>
        </div>
      );
    }
  }

  // Step 4: Full dashboard attempt
  if (step === 4) {
    addLog("Attempting full dashboard render");
    try {
      // Import the real Dashboard and try to render it
      const Dashboard = require("./Dashboard").default;
      return <Dashboard />;
    } catch (error: any) {
      addLog(`Step 4 error: ${error.message}`);
      return (
        <div style={{ minHeight: '100vh', background: '#ff0000', color: '#fff', padding: '20px' }}>
          <h1>Step 4 Failed!</h1>
          <p>Error with real Dashboard: {error.message}</p>
          <pre style={{ fontSize: '10px', overflow: 'auto' }}>{error.stack}</pre>
          <button onClick={() => setStep(3)}>Back to Step 3</button>
        </div>
      );
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: '20px' }}>
      <h1>Unknown Step: {step}</h1>
      <button onClick={() => setStep(1)}>Reset to Step 1</button>
    </div>
  );
};

export default StepByStepDashboard;