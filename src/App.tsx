import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MinimalAuthProvider } from "@/contexts/MinimalAuthContext";
import { MinimalProtectedRoute } from "@/components/auth/MinimalProtectedRoute";
import LandingPage from "./pages/LandingPage";
import CleanAuthPage from "./pages/CleanAuthPage";
import CleanDashboard from "./pages/CleanDashboard";
import CleanGeoPage from "./pages/CleanGeoPage";
import MinimalContentPage from "./pages/MinimalContentPage";
import StrategyPage from "./pages/StrategyPage";
import SettingsPage from "./pages/SettingsPage";
import ErrorBoundary from "./components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <MinimalAuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<CleanAuthPage />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <MinimalProtectedRoute>
                <ErrorBoundary>
                  <CleanDashboard />
                </ErrorBoundary>
              </MinimalProtectedRoute>
            } />
            <Route path="/geo" element={
              <MinimalProtectedRoute>
                <ErrorBoundary>
                  <CleanGeoPage />
                </ErrorBoundary>
              </MinimalProtectedRoute>
            } />
            <Route path="/strategy" element={
              <MinimalProtectedRoute>
                <ErrorBoundary>
                  <StrategyPage />
                </ErrorBoundary>
              </MinimalProtectedRoute>
            } />
            <Route path="/content" element={
              <MinimalProtectedRoute>
                <ErrorBoundary>
                  <MinimalContentPage />
                </ErrorBoundary>
              </MinimalProtectedRoute>
            } />
            <Route path="/settings" element={
              <MinimalProtectedRoute>
                <ErrorBoundary>
                  <SettingsPage />
                </ErrorBoundary>
              </MinimalProtectedRoute>
            } />
          </Routes>
          <Toaster />
        </BrowserRouter>
    </MinimalAuthProvider>
  </QueryClientProvider>
);

export default App;
