import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';

export interface BrandingData {
  companyName: string;
  tagline: string | null;
  logoUrl: string | null;
  logoSmallUrl: string | null;
  logoMediumUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  pdfFooterText: string | null;
  emailFromName: string | null;
}

const DEFAULT_BRANDING: BrandingData = {
  companyName: 'DamageTrack',
  tagline: 'Warehouse Damage Management',
  logoUrl: null,
  logoSmallUrl: null,
  logoMediumUrl: null,
  primaryColor: '#3b82f6',
  secondaryColor: '#1e293b',
  accentColor: '#10b981',
  pdfFooterText: null,
  emailFromName: null,
};

interface BrandingContextValue {
  branding: BrandingData;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  isLoading: true,
  refetch: async () => {},
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingData>(DEFAULT_BRANDING);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBranding = useCallback(async () => {
    try {
      const res = await axios.get('/api/branding');
      // Unwrap envelope if present
      const data = res.data?.data ?? res.data;
      setBranding({ ...DEFAULT_BRANDING, ...data });
    } catch {
      setBranding(DEFAULT_BRANDING);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  // Apply CSS custom properties for branding colours
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', branding.primaryColor);
    root.style.setProperty('--brand-secondary', branding.secondaryColor);
    root.style.setProperty('--brand-accent', branding.accentColor);
  }, [branding.primaryColor, branding.secondaryColor, branding.accentColor]);

  // Update favicon
  useEffect(() => {
    if (branding.logoSmallUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = branding.logoSmallUrl;
    }
  }, [branding.logoSmallUrl]);

  // Update document title
  useEffect(() => {
    const baseTitle = branding.companyName || 'DamageTrack';
    // Only set if no page-specific title is set
    if (!document.title || document.title === 'DamageTrack') {
      document.title = baseTitle;
    }
  }, [branding.companyName]);

  return (
    <BrandingContext.Provider value={{ branding, isLoading, refetch: fetchBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
