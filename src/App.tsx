import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { registerServiceWorker } from "@/utils/serviceWorker";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Pricing from "./pages/Pricing";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Resources from "./pages/Resources";
import HomeMaintenanceSurvivalKit from "./pages/HomeMaintenanceSurvivalKit";
import ProviderCommunicationBuilder from "./pages/ProviderCommunicationBuilder";
import Waitlist from "./pages/Waitlist";
import WaitlistThankYou from "./pages/WaitlistThankYou";
import Club from "./pages/Club";
import DemoHomeowner from "./pages/demo/DemoHomeowner";
import DemoProvider from "./pages/demo/DemoProvider";
import OnboardingHomeowner from "./pages/OnboardingHomeowner";
import OnboardingProvider from "./pages/OnboardingProvider";
import HomeownerDashboard from "./pages/homeowner/Dashboard";
import ProviderDashboard from "./pages/provider/Dashboard";
import BecomeProvider from "./pages/BecomeProvider";
import Clients from "./pages/provider/Clients";
import ClientDetail from "./pages/provider/ClientDetail";
import ServicePlans from "./pages/provider/ServicePlans";
import Subscriptions from "./pages/provider/Subscriptions";
import Payments from "./pages/provider/Payments";
import Team from "./pages/provider/Team";
import Settings from "./pages/provider/Settings";
import NotFound from "./pages/NotFound";
import ProviderLayout from "./layouts/ProviderLayout";
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
import ProviderPayroll from "./pages/provider/Payroll";
import ProviderAccounting from "./pages/provider/Accounting";
import ServiceCalls from "./pages/provider/ServiceCalls";
import Reviews from "./pages/provider/Reviews";
import AdminLayout from "./layouts/AdminLayout";
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminRevenue from "./pages/admin/Revenue";
import AdminData from "./pages/admin/DataManagement";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminTeam from "./pages/admin/TeamManagement";
import AdminUsers from "./pages/admin/UserManagement";
import AdminSettings from "./pages/admin/Settings";
import AdminBetaAccess from "./pages/admin/BetaAccess";
import AdminReferrals from "./pages/admin/Referrals";
import PWALaunch from "./pages/PWALaunch";
import AdminCommerce from "./pages/admin/Commerce";
import AdminUsersAccess from "./pages/admin/UsersAccess";
import { FloatingAIAssistant } from "@/components/ai/FloatingAIAssistant";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'homeowner' | 'provider'>('homeowner');

  useEffect(() => {
    registerServiceWorker();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        supabase.from('profiles').select('user_type').eq('user_id', session.user.id).single()
          .then(({ data }) => setUserRole(data?.user_type === 'provider' ? 'provider' : 'homeowner'));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        supabase.from('profiles').select('user_type').eq('user_id', session.user.id).single()
          .then(({ data }) => setUserRole(data?.user_type === 'provider' ? 'provider' : 'homeowner'));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      const path = window.location.pathname;
      if (!['/pwa-launch', '/login', '/auth'].includes(path)) {
        window.location.replace('/pwa-launch');
      }
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {user && <FloatingAIAssistant userRole={userRole} />}
        <BrowserRouter>
          <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/pwa-launch" element={<PWALaunch />} />
        <Route path="/home" element={<Index />} />
          <Route path="/waitlist" element={<Waitlist />} />
          <Route path="/waitlist/thank-you" element={<WaitlistThankYou />} />
          <Route path="/club" element={<Club />} />
          <Route path="/demo/homeowner" element={<DemoHomeowner />} />
          <Route path="/demo/serviceprovider" element={<DemoProvider />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/resources/home-maintenance-survival-kit" element={<HomeMaintenanceSurvivalKit />} />
            <Route path="/resources/provider-communication-builder" element={<ProviderCommunicationBuilder />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
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
              <Route path="accounting" element={<ProviderAccounting />} />
              <Route path="payroll" element={<ProviderPayroll />} />
            </Route>

            {/* Admin login (no layout) */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Admin routes with shared layout */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="commerce" element={<AdminCommerce />} />
              <Route path="users-access" element={<AdminUsersAccess />} />
              <Route path="data" element={<AdminData />} />
              <Route path="settings" element={<AdminSettings />} />
              {/* Legacy routes for backward compatibility */}
              <Route path="users" element={<AdminUsers />} />
              <Route path="team" element={<AdminTeam />} />
              <Route path="beta-access" element={<AdminBetaAccess />} />
              <Route path="revenue" element={<AdminRevenue />} />
              <Route path="referrals" element={<AdminReferrals />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
