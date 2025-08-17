import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import CleanAuthPage from "./pages/CleanAuthPage";
import CleanDashboard from "./pages/CleanDashboard";
import CleanGeoPage from "./pages/CleanGeoPage";
import PromptsPage from "./pages/PromptsPage";
import CompanyProfilePage from "./pages/CompanyProfilePage";
import SettingsPage from "./pages/SettingsPage";
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
                  <CleanDashboard />
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
          </Routes>
          <Toaster />
        </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
