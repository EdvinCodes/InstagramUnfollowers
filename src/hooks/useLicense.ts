import { useState, useEffect } from 'react';
import { validateLicenseKey } from '../utils/licenseManager';

/** Lemon Squeezy rejected this product category — PRO stays unlocked until a new payment provider is integrated. */
export const PRO_PROMO_FREE = true;

export const useLicense = () => {
  const [isPro, setIsPro] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(!PRO_PROMO_FREE);

  useEffect(() => {
    // Promo: every feature stays open. A saved key must not flip the UI back to
    // "upgrade" while the settings banner says PRO is free.
    if (PRO_PROMO_FREE) {
      setIsPro(true);
      setIsLoading(false);
      return;
    }

    const checkSavedLicense = async () => {
      const savedKey = localStorage.getItem('ig_pro_license_key');
      if (savedKey) {
        const isValid = await validateLicenseKey();
        setIsPro(isValid);
        if (!isValid) {
          localStorage.removeItem('ig_pro_license_key');
        }
      } else {
        setIsPro(false);
      }
      setIsLoading(false);
    };

    void checkSavedLicense();
  }, []);

  const activatePro = async (key: string): Promise<boolean> => {
    if (PRO_PROMO_FREE) {
      setIsPro(true);
      return true;
    }
    const isValid = await validateLicenseKey();
    if (isValid) {
      localStorage.setItem('ig_pro_license_key', key.trim().toUpperCase());
      setIsPro(true);
    }
    return isValid;
  };

  const deactivatePro = () => {
    if (PRO_PROMO_FREE) {
      return;
    }
    localStorage.removeItem('ig_pro_license_key');
    setIsPro(false);
  };

  return { isPro: PRO_PROMO_FREE || isPro, isLoading, activatePro, deactivatePro };
};
