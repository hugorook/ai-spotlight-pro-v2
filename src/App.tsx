import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import CleanAuthPage from "./pages/CleanAuthPage";
import SimplifiedDashboard from "./pages/SimplifiedDashboard";
import CleanGeoPage from "./pages/CleanGeoPage";
import PromptsPage from "./pages/PromptsPage";
import CompanyProfilePage from "./pages/CompanyProfilePage";
import SettingsPage from "./pages/SettingsPage";
import ConnectionsSettings from "./pages/settings/connections";
import Analytics from "./pages/analytics";
import HealthCheckAnalytics from "./pages/analytics/health-check";
import PromptsAnalytics from "./pages/analytics/prompts";
import RecommendationsAnalytics from "./pages/analytics/recommendations";
import BenchmarkAnalytics from "./pages/analytics/benchmark";
import AuthorityAnalytics from "./pages/analytics/authority";
import TrendingAnalytics from "./pages/analytics/trending";
import PublicSnapshot from "./pages/PublicSnapshot";
import ErrorBoundary from "./components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<CleanAuthPage />} />
            <Route path="/snapshot" element={<PublicSnapshot />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <SimplifiedDashboard />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/geo" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <CleanGeoPage />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/prompts" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <PromptsPage />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/content" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <CompanyProfilePage />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <SettingsPage />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/settings/connections" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <ConnectionsSettings />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            
            {/* Analytics Routes */}
            <Route path="/analytics" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Analytics />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/analytics/health-check" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <HealthCheckAnalytics />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/analytics/prompts" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <PromptsAnalytics />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/analytics/recommendations" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <RecommendationsAnalytics />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/analytics/benchmark" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <BenchmarkAnalytics />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/analytics/authority" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <AuthorityAnalytics />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/analytics/trending" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <TrendingAnalytics />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
          </Routes>
          <Toaster />
        </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
