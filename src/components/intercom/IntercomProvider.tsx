import { useEffect } from 'react';
import Intercom from '@intercom/messenger-js-sdk';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

export function IntercomProvider({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  useEffect(() => {
    const initializeIntercom = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          // Not authenticated, just boot Intercom without user data
          Intercom({ app_id: 'itubyguk' });
          return;
        }

        // Fetch user profile
        const profileResult = await supabase
          .from('profiles')
          .select('id, full_name, user_type, created_at')
          .eq('user_id', user.id)
          .single();

        const profile = profileResult.data;

        if (!profile) {
          Intercom({ app_id: 'itubyguk' });
          return;
        }

        // Check if admin
        const adminResult = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['admin', 'moderator'])
          .maybeSingle();

        // Build custom attributes
        const customAttributes: any = {
          role: profile.user_type || 'homeowner',
          is_admin: !!adminResult.data,
          ai_escalation: false,
        };

        if (adminResult.data) {
          customAttributes.admin_role = adminResult.data.role;
        }

        // Get provider org if provider
        if (profile.user_type === 'provider') {
          const orgResult = await supabase
            .from('organizations')
            .select('id, name, plan, stripe_account_id')
            .eq('owner_id', user.id)
            .maybeSingle();

          if (orgResult.data) {
            customAttributes.organization_id = orgResult.data.id;
            customAttributes.organization_name = orgResult.data.name;
            customAttributes.subscription_plan = orgResult.data.plan;
            customAttributes.stripe_connected = !!orgResult.data.stripe_account_id;
          }
        }

        // Get identity verification JWT token
        let userJwt: string | undefined;
        try {
          const { data: tokenData } = await supabase.functions.invoke('generate-intercom-hash');
          if (tokenData?.token) {
            userJwt = tokenData.token;
          }
        } catch (error) {
          console.warn('Failed to get Intercom JWT:', error);
        }

        // Initialize Intercom with context and identity verification
        Intercom({
          app_id: 'itubyguk',
          user_id: user.id,
          name: profile.full_name || user.email?.split('@')[0] || 'User',
          email: user.email,
          created_at: Math.floor(new Date(user.created_at).getTime() / 1000),
          intercom_user_jwt: userJwt, // Use JWT token for identity verification
          alignment: 'right',
          vertical_padding: 20,
          horizontal_padding: isMobile ? 16 : 20,
          hide_default_launcher: true,
          ...customAttributes
        });

      } catch (error) {
        console.error('Intercom initialization error:', error);
        // Fallback: initialize without user data
        Intercom({ app_id: 'itubyguk' });
      }
    };

    // Initialize on mount
    initializeIntercom();

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Re-initialize Intercom without user data on logout
        try {
          Intercom({ app_id: 'itubyguk' });
        } catch (error) {
          console.error('Error resetting Intercom:', error);
        }
      } else if (event === 'SIGNED_IN' && session) {
        initializeIntercom();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isMobile]);

  return <>{children}</>;
}
