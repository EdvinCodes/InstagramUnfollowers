import { useState, useEffect } from 'react';
import { validateLicenseKey } from '../utils/licenseManager';

/** Lemon Squeezy rejected this product category — PRO stays unlocked until a new payment provider is integrated. */
export const PRO_PROMO_FREE = true;

export const useLicense = () => {
  const [isPro, setIsPro] = useState<boolean>(PRO_PROMO_FREE);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Al cargar la extensión, miramos si ya compró la licencia antes
    const checkSavedLicense = async () => {
      const savedKey = localStorage.getItem('ig_pro_license_key');
      if (savedKey) {
        // const isValid = await validateLicenseKey(savedKey);
        const isValid = await validateLicenseKey();
        setIsPro(isValid);
        // Si por alguna razón guardó una clave inválida, la limpiamos
        if (!isValid) {
          localStorage.removeItem('ig_pro_license_key');
        }
      }
      setIsLoading(false);
    };

    checkSavedLicense();
  }, []);

  const activatePro = async (key: string): Promise<boolean> => {
    // const isValid = await validateLicenseKey(key);
    const isValid = await validateLicenseKey();
    if (isValid) {
      localStorage.setItem('ig_pro_license_key', key.trim().toUpperCase());
      setIsPro(true);
    }
    return isValid;
  };

  const deactivatePro = () => {
    localStorage.removeItem('ig_pro_license_key');
    setIsPro(false);
  };

  return { isPro, isLoading, activatePro, deactivatePro };
};
