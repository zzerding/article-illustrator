import { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import { CONFIG } from '../config';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

const normalizeBalance = (payload) => {
  if (typeof payload === 'number') {
    return { balance: payload };
  }

  if (typeof payload?.balance === 'number') {
    return payload;
  }

  return null;
};

export const AuthProvider = ({ children }) => {
  const [apiKey, setApiKey] = useState(() => {
    const storedKey = sessionStorage.getItem('pollen_key');
    if (storedKey) return storedKey;
    
    // In development, fallback to the token from .env if available
    if (import.meta.env.DEV && import.meta.env.VITE_DEV_TOKEN) {
      return import.meta.env.VITE_DEV_TOKEN;
    }
    
    return null;
  });
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accountError, setAccountError] = useState(null);

  const logout = useCallback(() => {
    sessionStorage.removeItem('pollen_key');
    setApiKey(null);
    setUser(null);
    setBalance(null);
  }, []);

  const fetchAccountData = useCallback(async (key) => {
    setAccountError(null);
    try {
      // 1. Fetch Profile
      const profileRes = await fetch(CONFIG.PROFILE_API, {
        headers: { 'Authorization': `Bearer ${key}` }
      });

      if (profileRes.status === 401) {
        logout();
        return;
      }

      if (!profileRes.ok) {
        throw new Error('Failed to fetch profile');
      }

      const profileData = await profileRes.json();
      setUser(profileData);

      // 2. Fetch Balance (Optional, don't block if fails)
      try {
        const balanceRes = await fetch(CONFIG.BALANCE_API, {
          headers: { 'Authorization': `Bearer ${key}` }
        });
        if (balanceRes.ok) {
          const balanceData = await balanceRes.json();
          setBalance(normalizeBalance(balanceData));
        }
      } catch (e) {
        console.warn('Balance fetch failed', e);
      }
    } catch (e) {
      console.warn('Account data fetch failed', e);
      setAccountError(e.message);
    }
  }, [logout]);

  useEffect(() => {
    let isMounted = true;

    const handleCallback = async () => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const keyFromHash = hash.get('api_key');
      const error = hash.get('error');

      if (error) {
        console.error('Auth error:', error);
        if (isMounted) setIsLoading(false);
        return;
      }

      if (keyFromHash) {
        sessionStorage.setItem('pollen_key', keyFromHash);
        setApiKey(keyFromHash);
        window.history.replaceState(null, '', window.location.pathname);
        // fetchAccountData will be called by the next useEffect run triggered by setApiKey
        return;
      }

      if (apiKey && !user) {
        await fetchAccountData(apiKey);
      }

      if (isMounted) setIsLoading(false);
    };

    handleCallback();

    return () => { isMounted = false; };
  }, [apiKey, fetchAccountData, user]);

  const login = () => {
    const params = new URLSearchParams({
      redirect_uri: CONFIG.REDIRECT_URI,
      client_id: CONFIG.CLIENT_ID,
      scope: 'generate',
      budget: '10',
      expiry: '7',
    });
    window.location.href = `${CONFIG.AUTH_URL}?${params}`;
  };

  return (
    <AuthContext.Provider value={{
      apiKey,
      user,
      balance,
      login,
      logout,
      isLoading,
      accountError
    }}>
      {children}
    </AuthContext.Provider>
  );
};
