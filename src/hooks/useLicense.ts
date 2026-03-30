import { useState, useEffect } from 'react';
import { validateLicenseKeyOffline } from '../utils/licenseManager';

export const useLicense = () => {
  const [isPro, setIsPro] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Al cargar la extensión, miramos si ya compró la licencia antes
    const checkSavedLicense = async () => {
      const savedKey = localStorage.getItem('ig_pro_license_key');
      if (savedKey) {
        const isValid = await validateLicenseKeyOffline(savedKey);
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
    const isValid = await validateLicenseKeyOffline(key);
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
