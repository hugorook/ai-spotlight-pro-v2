import React, { useState } from "react";

const UIComponentTest = () => {
  const [currentTest, setCurrentTest] = useState(0);
  const [results, setResults] = useState<Array<{test: string, success: boolean, error?: string}>>([]);

  const tests = [
    {
      name: "Basic div with inline styles",
      test: () => <div style={{padding: '20px', background: '#333', color: '#fff'}}>Basic div works!</div>
    },
    {
      name: "Tailwind classes", 
      test: () => <div className="p-4 bg-gray-800 text-white">Tailwind classes work!</div>
    },
    {
      name: "cn utility function",
      test: () => {
        const { cn } = require("@/lib/utils");
        const className = cn("p-4", "bg-gray-800", "text-white");
        return <div className={className}>cn utility works!</div>;
      }
    },
    {
      name: "Card component - basic",
      test: () => {
        const { Card } = require("@/components/ui/card");
        return <Card style={{padding: '20px', background: '#333', color: '#fff'}}>Card works!</Card>;
      }
    },
    {
      name: "Card component - with className",
      test: () => {
        const { Card, CardContent, CardHeader, CardTitle } = require("@/components/ui/card");
        return (
          <Card className="bg-gray-800 text-white">
            <CardHeader>
              <CardTitle>Test Card</CardTitle>
            </CardHeader>
            <CardContent>
              Card with className works!
            </CardContent>
          </Card>
        );
      }
    },
    {
      name: "Button component",
      test: () => {
        const { Button } = require("@/components/ui/button");
        return <Button className="bg-blue-600 text-white p-2">Button works!</Button>;
      }
    },
    {
      name: "Badge component", 
      test: () => {
        const { Badge } = require("@/components/ui/badge");
        return <Badge className="bg-green-600 text-white">Badge works!</Badge>;
      }
    }
  ];

  const runTest = (testIndex: number) => {
    try {
      const testResult = tests[testIndex].test();
      setResults(prev => [...prev, { test: tests[testIndex].name, success: true }]);
      return testResult;
    } catch (error: any) {
      setResults(prev => [...prev, { 
        test: tests[testIndex].name, 
        success: false, 
        error: error.message 
      }]);
      throw error;
    }
  };

  const [testOutput, setTestOutput] = useState<React.ReactNode | null>(null);
  const [hasRunCurrentTest, setHasRunCurrentTest] = useState(false);

  // Run test when currentTest changes
  React.useEffect(() => {
    setHasRunCurrentTest(false);
    setTestOutput(null);
  }, [currentTest]);

  const executeCurrentTest = () => {
    if (hasRunCurrentTest) return;
    
    try {
      const output = runTest(currentTest);
      setTestOutput(output);
      setHasRunCurrentTest(true);
    } catch (error: any) {
      const errorOutput = (
        <div style={{ background: '#ff3333', padding: '20px', color: 'white', borderRadius: '5px' }}>
          <h3>❌ Test Failed: {tests[currentTest].name}</h3>
          <p><strong>Error:</strong> {error.message}</p>
          <pre style={{ fontSize: '12px', overflow: 'auto', marginTop: '10px' }}>
            {error.stack}
          </pre>
        </div>
      );
      setTestOutput(errorOutput);
      setHasRunCurrentTest(true);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#000', 
      color: '#fff', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ marginBottom: '20px' }}>UI Component Testing</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <p>Current Test: {currentTest + 1}/{tests.length}</p>
        <p>Test: {tests[currentTest].name}</p>
      </div>

      <div style={{ 
        border: '2px solid #333', 
        padding: '20px', 
        marginBottom: '20px',
        minHeight: '100px',
        background: '#111'
      }}>
        <h3>Test Output:</h3>
        {!hasRunCurrentTest ? (
          <div>
            <p>Ready to run: {tests[currentTest].name}</p>
            <button
              onClick={executeCurrentTest}
              style={{
                background: '#28a745',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Run Test
            </button>
          </div>
        ) : (
          testOutput || <p>Test completed</p>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => {
            const newIndex = Math.max(0, currentTest - 1);
            setCurrentTest(newIndex);
          }}
          disabled={currentTest === 0}
          style={{
            background: currentTest === 0 ? '#333' : '#666',
            color: '#fff',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            marginRight: '10px',
            cursor: currentTest === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          Previous Test
        </button>
        
        <button
          onClick={() => {
            const newIndex = Math.min(tests.length - 1, currentTest + 1);
            setCurrentTest(newIndex);
          }}
          disabled={currentTest === tests.length - 1}
          style={{
            background: currentTest === tests.length - 1 ? '#333' : '#007bff',
            color: '#fff',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            cursor: currentTest === tests.length - 1 ? 'not-allowed' : 'pointer'
          }}
        >
          Next Test
        </button>
      </div>

      <div style={{ background: '#222', padding: '15px', borderRadius: '5px' }}>
        <h3>Test Results:</h3>
        {results.length === 0 && <p>No tests run yet</p>}
        {results.map((result, index) => (
          <div key={index} style={{ 
            color: result.success ? '#00ff00' : '#ff3333',
            marginBottom: '5px'
          }}>
            {result.success ? '✅' : '❌'} {result.test}
            {result.error && <span style={{ color: '#ff6666' }}> - {result.error}</span>}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px' }}>
        <button
          onClick={() => window.location.href = '/dashboard-full'}
          style={{
            background: results.length > 0 && results.every(r => r.success) ? '#00ff00' : '#666',
            color: 'black',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Try Full Dashboard
        </button>
      </div>
    </div>
  );
};

export default UIComponentTest;