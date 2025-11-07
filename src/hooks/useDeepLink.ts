import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import despia from 'despia-native';

interface DeepLinkParams {
  [key: string]: string;
}

export function useDeepLink() {
  const navigate = useNavigate();

  const registerDeepLink = (path: string, handler: (params: DeepLinkParams) => void) => {
    // Register deep link with Despia
    try {
      despia(`registerdeeplink://homebase://${path}`, ['params']);
    } catch (error) {
      console.warn('Deep link registration not available:', error);
    }
    
    // Set up listener for this specific path
    const handleDeepLink = (event: CustomEvent) => {
      const { path: eventPath, params } = event.detail;
      if (eventPath === path) {
        handler(params);
      }
    };
    
    window.addEventListener('deeplink' as any, handleDeepLink);
    return () => window.removeEventListener('deeplink' as any, handleDeepLink);
  };

  const openDeepLink = (path: string, params?: Record<string, string>) => {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    try {
      despia(`opendeeplink://homebase://${path}${queryString}`);
    } catch (error) {
      console.warn('Deep link opening not available:', error);
    }
  };

  const trackDeepLinkEvent = async (
    linkPath: string, 
    source?: string, 
    campaign?: string,
    converted: boolean = false
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('deep_link_events').insert({
      link_path: linkPath,
      source,
      campaign,
      user_id: user?.id,
      converted
    });
  };

  const generateShareableLink = (path: string, params?: Record<string, string>) => {
    const baseUrl = window.location.origin;
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return `${baseUrl}/dl/${path}${queryString}`;
  };

  return {
    registerDeepLink,
    openDeepLink,
    trackDeepLinkEvent,
    generateShareableLink
  };
}

// Initialize core deep link routes
export function useDeepLinkRouter() {
  const navigate = useNavigate();
  const { registerDeepLink, trackDeepLinkEvent } = useDeepLink();

  useEffect(() => {
    // Provider profile: homebase://pro/:slug
    registerDeepLink('pro/:slug', (params) => {
      trackDeepLinkEvent(`pro/${params.slug}`, params.source, params.campaign);
      navigate(`/provider/${params.slug}`);
    });

    // Invoice: homebase://invoice/:id
    registerDeepLink('invoice/:id', (params) => {
      trackDeepLinkEvent(`invoice/${params.id}`, params.source, params.campaign);
      navigate(`/invoice/${params.id}`);
    });

    // Quote: homebase://quote/:id
    registerDeepLink('quote/:id', (params) => {
      trackDeepLinkEvent(`quote/${params.id}`, params.source, params.campaign);
      navigate(`/quote/${params.id}`);
    });

    // Job: homebase://job/:id
    registerDeepLink('job/:id', (params) => {
      trackDeepLinkEvent(`job/${params.id}`, params.source, params.campaign);
      navigate(`/provider/jobs/${params.id}`);
    });

    // Payment: homebase://payment/:id
    registerDeepLink('payment/:id', (params) => {
      trackDeepLinkEvent(`payment/${params.id}`, params.source, params.campaign);
      navigate(`/payment/${params.id}`);
    });
  }, []);
}
