import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/Auth";
import LawyerAuth from "./pages/LawyerAuth";
import Privacy from "./pages/Privacy";
import Account from "./pages/Account";
import Pricing from "./pages/Pricing";
import LawyerDashboard from "./components/LawyerDashboard";
import AdminLayout from "./pages/admin/AdminLayout";
import Overview from "./pages/admin/Overview";
import Users from "./pages/admin/Users";
import UserDetail from "./pages/admin/UserDetail";
import Cases from "./pages/admin/Cases";
import Analytics from "./pages/admin/Analytics";
import Finance from "./pages/admin/Finance";
import Funnel from "./pages/admin/Funnel";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/lawyer-auth" element={<LawyerAuth />} />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              }
            />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/" element={<Index />} />
            <Route
              path="/lawyer"
              element={
                <ProtectedRoute requiredRole="lawyer">
                  <LawyerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Overview />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="finance" element={<Finance />} />
              <Route path="funnel" element={<Funnel />} />
              <Route path="users" element={<Users />} />
              <Route path="users/:id" element={<UserDetail />} />
              <Route path="cases" element={<Cases />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
