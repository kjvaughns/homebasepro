import { useEffect } from 'react';
import { updateMetaTags, SEOProps } from '@/utils/seo';

interface SEOComponentProps extends SEOProps {}

export function SEO(props: SEOComponentProps) {
  useEffect(() => {
    updateMetaTags(props);
  }, [props]);

  return null;
}
