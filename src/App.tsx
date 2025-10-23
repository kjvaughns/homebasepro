import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { registerServiceWorker } from "@/utils/serviceWorker";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { InstallPromptDialog } from "@/components/pwa/InstallPromptDialog";
import { useToast } from "@/hooks/use-toast";
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
// Waitlist pages kept for legacy links but not routed
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
import Analytics from "./pages/provider/Analytics";
import Accounting from "./pages/provider/Accounting";
import Balance from "./pages/provider/Balance";
import Payroll from "./pages/provider/Payroll";
import EarningsLedger from "./pages/provider/EarningsLedger";
import PayTemplates from "./pages/provider/PayTemplates";
import CommissionRules from "./pages/provider/CommissionRules";
import TimeTracking from "./pages/provider/TimeTracking";
import ApproveTime from "./pages/provider/ApproveTime";
import TechnicianHome from "./pages/provider/TechnicianHome";
import MyEarnings from "./pages/provider/MyEarnings";
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
import MessagesPage from "./pages/Messages";
import Jobs from "@/pages/provider/Jobs";
import MyJobs from "@/pages/provider/MyJobs";
import Services from "@/pages/provider/Services";
import PartsMaterials from "@/pages/provider/PartsMaterials";
import ProfileSettings from "@/pages/provider/settings/ProfileSettings";
import BillingSettings from "@/pages/provider/settings/BillingSettings";
import PaymentSettings from "@/pages/provider/settings/PaymentSettings";
import IntegrationSettings from "@/pages/provider/settings/IntegrationSettings";
import AppSettings from "@/pages/provider/settings/AppSettings";
import RefundRequests from "@/pages/provider/RefundRequests";
import ShareLinks from "@/pages/provider/ShareLinks";
import ShareLinkAnalytics from "@/pages/provider/ShareLinkAnalytics";
import ShortLinkRedirect from "@/pages/ShortLinkRedirect";
import Portfolio from "@/pages/provider/Portfolio";
import Favorites from "@/pages/homeowner/Favorites";
import MyProviders from "@/pages/homeowner/MyProviders";
import AccountIndex from "@/pages/provider/account";
import AccountProfile from "@/pages/provider/account/Profile";
import AccountSocial from "@/pages/provider/account/Social";
import Tutorials from "@/pages/provider/Tutorials";
import ProfitLoss from "@/pages/provider/ProfitLoss";

import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminSupport from "./pages/admin/Support";
import { MaintenanceGuard } from "./components/MaintenanceGuard";
import { RoleGuard } from "./components/admin/RoleGuard";
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
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MessagingProvider } from "@/contexts/MessagingContext";
import Messages from "./pages/Messages";
import { SubscriptionGuard } from "@/components/provider/SubscriptionGuard";

const queryClient = new QueryClient();

// Onboarding Guard Component
const OnboardingGuard = ({ children, requiredFor }: { children: React.ReactNode; requiredFor: 'homeowner' | 'provider' }) => {
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkOnboarding = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarded_at, user_type')
        .eq('user_id', user.id)
        .single();

      if (!profile?.onboarded_at && profile?.user_type === requiredFor) {
        navigate(`/onboarding/${requiredFor}`);
      }
      setChecking(false);
    };

    checkOnboarding();
  }, []);

  if (checking) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>;
  }

  return <>{children}</>;
};

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'homeowner' | 'provider'>('homeowner');
  const { toast } = useToast();
  const { canInstall, isInstalled, isIOS, promptInstall, dismissInstall } = usePWAInstall();
  const [showInstallDialog, setShowInstallDialog] = useState(false);

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

  // Show install prompt once per session after authentication on dashboard routes
  useEffect(() => {
    if (user && canInstall && !isInstalled) {
      const timer = setTimeout(() => {
        setShowInstallDialog(true);
        sessionStorage.setItem('homebase-install-prompted-session', 'true');
      }, 5000); // Show after 5 seconds on first dashboard visit
      return () => clearTimeout(timer);
    }
  }, [user, canInstall, isInstalled]);

  // Helper to determine if AI widget should show
  const shouldShowAI = (pathname: string) => {
    const appRoutes = ['/homeowner', '/provider', '/admin'];
    return appRoutes.some(route => pathname.startsWith(route));
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MessagingProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AIWidgetWrapper 
              user={user} 
              userRole={userRole} 
              shouldShowAI={shouldShowAI} 
            />
            <ErrorBoundary>
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
            <Route path="/l/:slug" element={<ShortLinkRedirect />} />
            <Route path="/onboarding/homeowner" element={<OnboardingHomeowner />} />
            <Route path="/onboarding/provider" element={<OnboardingProvider />} />

            <Route path="/become-provider" element={<BecomeProvider />} />

            {/* Homeowner Routes */}
            <Route path="/homeowner" element={<OnboardingGuard requiredFor="homeowner"><HomeownerLayout /></OnboardingGuard>}>
              <Route path="dashboard" element={<HomeownerDashboard />} />
              <Route path="homes" element={<Homes />} />
              <Route path="homes/new" element={<AddHome />} />
              <Route path="homes/:id" element={<HomeDetail />} />
              <Route path="browse" element={<Browse />} />
              <Route path="browse/:id" element={<ProviderDetail />} />
              <Route path="subscriptions" element={<HomeownerSubscriptions />} />
              <Route path="subscriptions/:id" element={<SubscriptionDetail />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="appointments/:id" element={<AppointmentDetail />} />
              <Route path="favorites" element={<Favorites />} />
              <Route path="providers" element={<MyProviders />} />
              <Route path="settings" element={<HomeownerSettings />} />
              <Route path="messages" element={<Messages role="homeowner" />} />
            </Route>

            {/* Provider routes with shared layout */}
            <Route path="/provider" element={<OnboardingGuard requiredFor="provider"><ProviderLayout /></OnboardingGuard>}>
              <Route path="dashboard" element={<ProviderDashboard />} />
              
              {/* Guarded routes - require active subscription or trial */}
              <Route path="clients" element={
                <SubscriptionGuard requiredFeature="Client Management">
                  <Clients />
                </SubscriptionGuard>
              } />
              <Route path="clients/import" element={
                <SubscriptionGuard requiredFeature="Client Import">
                  <ImportClients />
                </SubscriptionGuard>
              } />
              <Route path="clients/:id" element={
                <SubscriptionGuard requiredFeature="Client Details">
                  <ClientDetail />
                </SubscriptionGuard>
              } />
              <Route path="payments" element={
                <SubscriptionGuard requiredFeature="Payments & Invoicing">
                  <Payments />
                </SubscriptionGuard>
              } />
              <Route path="jobs" element={
                <SubscriptionGuard requiredFeature="Job Management">
                  <Jobs />
                </SubscriptionGuard>
              } />
              <Route path="analytics" element={
                <SubscriptionGuard requiredFeature="Analytics">
                  <Analytics />
                </SubscriptionGuard>
              } />
              <Route path="accounting" element={
                <SubscriptionGuard requiredFeature="Accounting">
                  <Accounting />
                </SubscriptionGuard>
              } />
              <Route path="profit-loss" element={
                <SubscriptionGuard requiredFeature="Profit & Loss">
                  <ProfitLoss />
                </SubscriptionGuard>
              } />

              {/* Free access routes */}
              <Route path="services" element={<Services />} />
              <Route path="parts-materials" element={<PartsMaterials />} />
              <Route path="my-jobs" element={<MyJobs />} />
              <Route path="refund-requests" element={<Navigate to="/provider/payments?tab=disputes" replace />} />
              <Route path="balance" element={<Balance />} />
              <Route path="tutorials" element={<Tutorials />} />
              <Route path="team" element={<Team />} />
              <Route path="payroll" element={<Navigate to="/provider/earnings" replace />} />
              <Route path="earnings" element={<EarningsLedger />} />
              <Route path="pay-templates" element={<PayTemplates />} />
              <Route path="commission-rules" element={<CommissionRules />} />
              <Route path="time-tracking" element={<TimeTracking />} />
              <Route path="approve-time" element={<ApproveTime />} />
              <Route path="technician-home" element={<TechnicianHome />} />
              <Route path="my-earnings" element={<MyEarnings />} />
              
              {/* Account Routes */}
              <Route path="account" element={<AccountIndex />} />
              <Route path="account/profile" element={<AccountProfile />} />
              <Route path="account/portfolio" element={<Portfolio />} />
              <Route path="account/reviews" element={<Reviews />} />
              <Route path="account/share-links" element={<ShareLinks />} />
              <Route path="account/share-links/:id/analytics" element={<ShareLinkAnalytics />} />
              <Route path="account/social" element={<AccountSocial />} />
              
              {/* Settings Routes */}
              <Route path="settings" element={<Settings />} />
              <Route path="settings/billing" element={<BillingSettings />} />
              <Route path="settings/payments" element={<PaymentSettings />} />
              <Route path="settings/integrations" element={<IntegrationSettings />} />
              <Route path="settings/app" element={<AppSettings />} />
              
              {/* Legacy Routes - Redirect to Account */}
              <Route path="portfolio" element={<Navigate to="/provider/account/portfolio" replace />} />
              <Route path="share-links" element={<Navigate to="/provider/account/share-links" replace />} />
              <Route path="reviews" element={<Navigate to="/provider/account/reviews" replace />} />
              <Route path="settings/profile" element={<Navigate to="/provider/account/profile" replace />} />
              
              {/* Stripe onboarding redirect - handle old route */}
              <Route path="stripe-onboarding" element={<Navigate to="/provider/dashboard" replace />} />
              
              <Route path="messages" element={<Messages role="provider" />} />
            </Route>

            {/* Demo routes */}
            <Route path="/demo/homeowner" element={<DemoHomeowner />} />
            <Route path="/demo/provider" element={<DemoProvider />} />

            {/* Admin routes */}
            <Route path="/admin/login" element={<Login />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
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

            {/* Waitlist routes removed - redirect to register */}
            <Route path="/club" element={<Club />} />
            <Route path="/pwa-launch" element={<PWALaunch />} />

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
            </Routes>
            </ErrorBoundary>
            
            {/* Centralized PWA Install Dialog */}
            <InstallPromptDialog
              open={showInstallDialog}
              onOpenChange={setShowInstallDialog}
              isIOS={isIOS}
              onInstall={async () => {
                if (!isIOS) {
                  const success = await promptInstall();
                  if (success) {
                    toast({ title: 'HomeBase installed!', description: 'You can now access HomeBase from your home screen' });
                  }
                }
              }}
              onDismiss={dismissInstall}
            />
          </BrowserRouter>
        </MessagingProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

// Wrapper component to access useLocation inside BrowserRouter
function AIWidgetWrapper({ 
  user, 
  userRole, 
  shouldShowAI 
}: { 
  user: any; 
  userRole: 'homeowner' | 'provider' | null; 
  shouldShowAI: (pathname: string) => boolean;
}) {
  const location = useLocation();
  
  if (!user || !shouldShowAI(location.pathname)) {
    return null;
  }
  
  return <FloatingAIAssistant userRole={userRole} />;
}

export default App;
