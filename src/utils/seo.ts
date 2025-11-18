export interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';
  twitterCard?: 'summary' | 'summary_large_image';
  canonical?: string;
  noindex?: boolean;
  structuredData?: Record<string, any>;
}

export const updateMetaTags = (props: SEOProps) => {
  const { 
    title, 
    description, 
    keywords, 
    ogImage = 'https://homebaseproapp.com/og-image.png',
    ogType = 'website',
    twitterCard = 'summary_large_image',
    canonical,
    noindex = false,
    structuredData
  } = props;

  // Update title
  document.title = title;

  // Helper to update or create meta tag
  const setMetaTag = (name: string, content: string, property = false) => {
    const attr = property ? 'property' : 'name';
    let element = document.querySelector(`meta[${attr}="${name}"]`);
    
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attr, name);
      document.head.appendChild(element);
    }
    
    element.setAttribute('content', content);
  };

  // Basic meta tags
  setMetaTag('description', description);
  if (keywords) setMetaTag('keywords', keywords);
  
  // Open Graph tags
  setMetaTag('og:title', title, true);
  setMetaTag('og:description', description, true);
  setMetaTag('og:image', ogImage, true);
  setMetaTag('og:type', ogType, true);
  setMetaTag('og:url', window.location.href, true);

  // Twitter Card tags
  setMetaTag('twitter:card', twitterCard);
  setMetaTag('twitter:title', title);
  setMetaTag('twitter:description', description);
  setMetaTag('twitter:image', ogImage);

  // Robots
  if (noindex) {
    setMetaTag('robots', 'noindex, nofollow');
  }

  // Canonical URL
  if (canonical) {
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.href = canonical;
  }

  // Structured Data (JSON-LD)
  if (structuredData) {
    let script = document.querySelector('script[type="application/ld+json"]');
    if (!script) {
      script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData);
  }
};

// Predefined structured data schemas
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "HomeBase",
  "url": "https://homebaseproapp.com",
  "logo": "https://homebaseproapp.com/homebase-logo.png",
  "description": "Smart home management and service provider platform connecting homeowners with verified professionals",
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "support@homebaseproapp.com",
    "contactType": "Customer Support"
  },
  "sameAs": [
    "https://twitter.com/homebaseproapp"
  ]
};

export const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "HomeBase",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web, iOS, Android",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "description": "Free for homeowners"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "500"
  }
};

export const createBreadcrumbSchema = (items: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": item.url
  }))
});

export const createFAQSchema = (faqs: { question: string; answer: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(faq => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }))
});
