import { useEffect } from 'react';

interface SEOOptions {
  title: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
}

/**
 * Custom hook to dynamically manage page title and SEO meta tags
 * Ensures optimal search engine crawling and accurate social share previews across SPA routes.
 */
export function useSEO({
  title,
  description,
  keywords,
  ogTitle,
  ogDescription,
}: SEOOptions) {
  useEffect(() => {
    // 1. Update Document Title
    const prevTitle = document.title;
    document.title = title;

    // Helper to safely set or create a meta tag
    const setMeta = (selector: string, attrName: string, attrValue: string, content: string) => {
      let meta = document.querySelector(selector);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attrName, attrValue);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // 2. Meta description
    if (description) {
      setMeta('meta[name="description"]', 'name', 'description', description);
    }

    // 3. Meta keywords
    if (keywords) {
      setMeta('meta[name="keywords"]', 'name', 'keywords', keywords);
    }

    // 4. OpenGraph tags
    setMeta('meta[property="og:title"]', 'property', 'og:title', ogTitle || title);
    if (description || ogDescription) {
      setMeta('meta[property="og:description"]', 'property', 'og:description', ogDescription || description || '');
    }

    // 5. Twitter tags
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', ogTitle || title);
    if (description || ogDescription) {
      setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', ogDescription || description || '');
    }

    return () => {
      document.title = prevTitle;
    };
  }, [title, description, keywords, ogTitle, ogDescription]);
}
