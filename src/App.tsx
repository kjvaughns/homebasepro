import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import Pricing from "./pages/Pricing";
import Waitlist from "./pages/Waitlist";
import WaitlistThankYou from "./pages/WaitlistThankYou";
import OnboardingHomeowner from "./pages/OnboardingHomeowner";
import OnboardingProvider from "./pages/OnboardingProvider";
import HomeownerDashboard from "./pages/homeowner/Dashboard";
import ProviderDashboard from "./pages/ProviderDashboard";
import BecomeProvider from "./pages/BecomeProvider";
import Clients from "./pages/provider/Clients";
import ClientDetail from "./pages/provider/ClientDetail";
import ServicePlans from "./pages/provider/ServicePlans";
import Subscriptions from "./pages/provider/Subscriptions";
import Payments from "./pages/provider/Payments";
import Team from "./pages/provider/Team";
import Settings from "./pages/provider/Settings";
import NotFound from "./pages/NotFound";
import { ProviderLayout } from "./layouts/ProviderLayout";
import HomeownerLayout from "./layouts/HomeownerLayout";
import Homes from "./pages/homeowner/Homes";
import AddHome from "./pages/homeowner/AddHome";
import HomeDetail from "./pages/homeowner/HomeDetail";
import Browse from "./pages/homeowner/Browse";
import ProviderDetail from "./pages/homeowner/ProviderDetail";
import HomeownerSubscriptions from "./pages/homeowner/Subscriptions";
import SubscriptionDetail from "./pages/homeowner/SubscriptionDetail";
import Appointments from "./pages/homeowner/Appointments";
import AppointmentDetail from "./pages/homeowner/AppointmentDetail";
import HomeownerSettings from "./pages/homeowner/Settings";
import HomeownerMessages from "./pages/homeowner/Messages";
import ProviderMessages from "./pages/provider/Messages";
import ProviderAnalytics from "./pages/provider/Analytics";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/waitlist" element={<Waitlist />} />
          <Route path="/waitlist/thank-you" element={<WaitlistThankYou />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding/homeowner" element={<OnboardingHomeowner />} />
          <Route path="/onboarding/provider" element={<OnboardingProvider />} />
          
          <Route path="/become-provider" element={<BecomeProvider />} />
          
          {/* Homeowner Routes */}
          <Route element={<HomeownerLayout />}>
            <Route path="/dashboard" element={<HomeownerDashboard />} />
            <Route path="/homeowner/homes" element={<Homes />} />
            <Route path="/homeowner/homes/new" element={<AddHome />} />
            <Route path="/homeowner/homes/:id" element={<HomeDetail />} />
            <Route path="/homeowner/browse" element={<Browse />} />
            <Route path="/homeowner/browse/:id" element={<ProviderDetail />} />
            <Route path="/homeowner/subscriptions" element={<HomeownerSubscriptions />} />
            <Route path="/homeowner/subscriptions/:id" element={<SubscriptionDetail />} />
            <Route path="/homeowner/appointments" element={<Appointments />} />
            <Route path="/homeowner/appointments/:id" element={<AppointmentDetail />} />
            <Route path="/homeowner/settings" element={<HomeownerSettings />} />
            <Route path="/homeowner/messages" element={<HomeownerMessages />} />
          </Route>
          
          {/* Provider routes with shared layout */}
          <Route path="/provider" element={<ProviderLayout />}>
            <Route path="dashboard" element={<ProviderDashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="plans" element={<ServicePlans />} />
            <Route path="subscriptions" element={<Subscriptions />} />
            <Route path="payments" element={<Payments />} />
            <Route path="team" element={<Team />} />
            <Route path="settings" element={<Settings />} />
            <Route path="messages" element={<ProviderMessages />} />
            <Route path="analytics" element={<ProviderAnalytics />} />
          </Route>
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
