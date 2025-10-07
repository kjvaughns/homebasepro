import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import Pricing from "./pages/Pricing";
import OnboardingHomeowner from "./pages/OnboardingHomeowner";
import OnboardingProvider from "./pages/OnboardingProvider";
import Dashboard from "./pages/Dashboard";
import ProviderDashboard from "./pages/ProviderDashboard";
import BecomeProvider from "./pages/BecomeProvider";
import Clients from "./pages/provider/Clients";
import ServicePlans from "./pages/provider/ServicePlans";
import Subscriptions from "./pages/provider/Subscriptions";
import Payments from "./pages/provider/Payments";
import Team from "./pages/provider/Team";
import Settings from "./pages/provider/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/onboarding/homeowner" element={<OnboardingHomeowner />} />
          <Route path="/onboarding/provider" element={<OnboardingProvider />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/provider/dashboard" element={<ProviderDashboard />} />
          <Route path="/provider/clients" element={<Clients />} />
          <Route path="/provider/plans" element={<ServicePlans />} />
          <Route path="/provider/subscriptions" element={<Subscriptions />} />
          <Route path="/provider/payments" element={<Payments />} />
          <Route path="/provider/team" element={<Team />} />
          <Route path="/provider/settings" element={<Settings />} />
          <Route path="/become-provider" element={<BecomeProvider />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
