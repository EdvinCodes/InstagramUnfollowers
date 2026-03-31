// src/utils/licenseManager.ts

const LS_PRODUCT_ID = process.env.REACT_APP_LS_PRODUCT_ID;
const GODMODE_KEY = process.env.REACT_APP_GODMODE_KEY || 'DISABLED_GODMODE';

const CACHE_KEY = 'ls_license_cache';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24h

interface CachedResult {
  key: string;
  valid: boolean;
  ts: number;
}

const getCache = (): CachedResult | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const setCache = (data: CachedResult) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage no disponible, ignoramos silenciosamente
  }
};

export const validateLicenseKey = async (key: string): Promise<boolean> => {
  const cleanKey = key.trim();

  // 1. GODMODE (solo tú, nunca lo compartas)
  if (cleanKey === GODMODE_KEY && GODMODE_KEY !== 'DISABLED_GODMODE') {
    return true;
  }

  if (!cleanKey || cleanKey.length < 10) {
    return false;
  }

  // 2. CACHÉ persistente en localStorage
  const cached = getCache();
  if (cached && cached.key === cleanKey && Date.now() - cached.ts < CACHE_TTL) {
    return cached.valid;
  }

  try {
    const instanceId = localStorage.getItem('ls_instance_id');
    const isActivation = !instanceId;

    const endpoint = isActivation
      ? 'https://api.lemonsqueezy.com/v1/licenses/activate'
      : 'https://api.lemonsqueezy.com/v1/licenses/validate';

    const body = new URLSearchParams({ license_key: cleanKey });
    if (instanceId) {
      body.append('instance_id', instanceId);
    } else {
      body.append('instance_name', 'IG_Pro_Extension');
    }
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (response.status >= 500) {
      console.warn('Lemon Squeezy API error, fallback to cache.');
      return cached?.valid ?? false;
    }

    if (!response.ok) {
      return false;
    }

    const data = await response.json();

    // 3. SEGURIDAD CRUZADA: verificar antes de guardar nada
    if (LS_PRODUCT_ID && data.meta?.product_id !== Number(LS_PRODUCT_ID)) {
      return false;
    }

    // Cada endpoint tiene su propio campo de éxito
    const valid = isActivation
      ? data.activated === true // <- /activate usa `activated`
      : data.valid === true; // <- /validate usa `valid`

    // Guardar instance_id solo si la activación fue válida
    if (isActivation && valid && data.instance?.id) {
      localStorage.setItem('ls_instance_id', data.instance.id);
    }

    if (valid) {
      setCache({ key: cleanKey, valid, ts: Date.now() });
    }

    return valid;
  } catch (error) {
    console.error('Error validando licencia:', error);
    return cached?.valid ?? false;
  }
};
