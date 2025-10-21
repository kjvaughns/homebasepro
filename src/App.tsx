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
import ImportClients from "./pages/provider/ImportClients";
import ClientDetail from "./pages/provider/ClientDetail";
import Payments from "./pages/provider/Payments";
import Reviews from "./pages/provider/Reviews";
import Team from "./pages/provider/Team";
import Settings from "./pages/provider/Settings";
import StripeOnboarding from "./pages/provider/StripeOnboarding";
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
import Messages from "./pages/Messages";
import Jobs from "@/pages/provider/Jobs";
import MyJobs from "@/pages/provider/MyJobs";

import AdminLayout from "./layouts/AdminLayout";
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminRevenue from "./pages/admin/Revenue";
import AdminLedger from "./pages/admin/Ledger";
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
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
          console.log('Notification clicked:', event.data);
        }
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
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
              <Route path="/homeowner/messages" element={<Messages />} />
              <Route path="/homeowner/messages/:id" element={<Messages />} />
            </Route>

            {/* Provider routes with shared layout */}
            <Route path="/provider" element={<ProviderLayout />}>
              <Route path="dashboard" element={<ProviderDashboard />} />
              <Route path="clients" element={<Clients />} />
              <Route path="clients/import" element={<ImportClients />} />
              <Route path="clients/:id" element={<ClientDetail />} />
              <Route path="jobs" element={<Jobs />} />
              <Route path="my-jobs" element={<MyJobs />} />
              <Route path="payments" element={<Payments />} />
              <Route path="team" element={<Team />} />
              <Route path="settings" element={<Settings />} />
              <Route path="stripe-onboarding" element={<StripeOnboarding />} />
              <Route path="messages" element={<Messages />} />
          <Route path="messages/:id" element={<Messages />} />
            </Route>

            {/* Demo routes */}
            <Route path="/demo/homeowner" element={<DemoHomeowner />} />
            <Route path="/demo/provider" element={<DemoProvider />} />

            {/* Admin routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="revenue" element={<AdminRevenue />} />
              <Route path="ledger" element={<AdminLedger />} />
              <Route path="data" element={<AdminData />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="team" element={<AdminTeam />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="beta" element={<AdminBetaAccess />} />
              <Route path="referrals" element={<AdminReferrals />} />
              <Route path="commerce" element={<AdminCommerce />} />
              <Route path="access" element={<AdminUsersAccess />} />
            </Route>

            {/* Waitlist routes */}
            <Route path="/waitlist" element={<Waitlist />} />
            <Route path="/waitlist/thank-you" element={<WaitlistThankYou />} />
            <Route path="/club" element={<Club />} />
            <Route path="/pwa-launch" element={<PWALaunch />} />

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          
          {user && <FloatingAIAssistant userRole={userRole} />}
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
