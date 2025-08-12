import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CleanAuthProvider } from "@/contexts/CleanAuthContext";
import { CleanProtectedRoute } from "@/components/auth/CleanProtectedRoute";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import CleanDashboard from "./pages/CleanDashboard";
import CleanGeoPage from "./pages/CleanGeoPage";
import CleanCompetitorPage from "./pages/CleanCompetitorPage";
import CleanContentPage from "./pages/CleanContentPage";
import TestCleanPage from "./pages/TestCleanPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const CleanApp = () => (
  <QueryClientProvider client={queryClient}>
    <CleanAuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <CleanProtectedRoute>
              <CleanDashboard />
            </CleanProtectedRoute>
          } />
          <Route path="/geo" element={
            <CleanProtectedRoute>
              <CleanGeoPage />
            </CleanProtectedRoute>
          } />
          <Route path="/competitors" element={
            <CleanProtectedRoute>
              <CleanCompetitorPage />
            </CleanProtectedRoute>
          } />
          <Route path="/content" element={
            <CleanProtectedRoute>
              <CleanContentPage />
            </CleanProtectedRoute>
          } />
          <Route path="/test-clean" element={
            <CleanProtectedRoute>
              <TestCleanPage />
            </CleanProtectedRoute>
          } />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </CleanAuthProvider>
  </QueryClientProvider>
);

export default CleanApp;