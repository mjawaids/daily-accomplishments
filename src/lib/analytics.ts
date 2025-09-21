// Google Analytics configuration and utilities
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export const GA_TRACKING_ID = import.meta.env.VITE_GA_TRACKING_ID;

// Initialize Google Analytics
export const initGA = () => {
  if (!GA_TRACKING_ID) {
    console.warn('Google Analytics tracking ID not found');
    return;
  }

  // Create script tag for gtag
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA_TRACKING_ID, {
    page_title: document.title,
    page_location: window.location.href,
  });
};

// Track page views
export const trackPageView = (page_title: string, page_location?: string) => {
  if (!GA_TRACKING_ID || !window.gtag) return;

  window.gtag('config', GA_TRACKING_ID, {
    page_title,
    page_location: page_location || window.location.href,
  });
};

// Track custom events
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (!GA_TRACKING_ID || !window.gtag) return;

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

// Track accomplishment events
export const trackAccomplishmentEvent = (action: 'add' | 'edit' | 'delete', category: string) => {
  trackEvent(action, 'accomplishment', category);
};

// Track user authentication events
export const trackAuthEvent = (action: 'signup' | 'signin' | 'signout') => {
  trackEvent(action, 'authentication');
};

// Track PWA events
export const trackPWAEvent = (action: 'install_prompt_shown' | 'install_accepted' | 'install_dismissed') => {
  trackEvent(action, 'pwa');
};

// Track offline/online events
export const trackConnectivityEvent = (action: 'offline' | 'online' | 'sync') => {
  trackEvent(action, 'connectivity');
};