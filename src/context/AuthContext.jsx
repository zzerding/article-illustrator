import React, { createContext, useContext, useState, useEffect } from 'react';
import { CONFIG } from '../config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [apiKey, setApiKey] = useState(sessionStorage.getItem('pollen_key'));
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
        // fetchUserInfo will be called by the next useEffect run triggered by setApiKey
        return;
      } 
      
      if (apiKey && !user) {
        await fetchUserInfo(apiKey);
      }
      
      if (isMounted) setIsLoading(false);
    };

    handleCallback();

    return () => { isMounted = false; };
  }, [apiKey, user]);

  const fetchUserInfo = async (key) => {
    try {
      const res = await fetch(CONFIG.USERINFO_API, {
        headers: { 'Authorization': `Bearer ${key}` }
      });
      if (res.status === 401) {
        logout();
        return;
      }
      const data = await res.json();
      setUser(data);
    } catch (e) {
      console.warn('UserInfo fetch failed', e);
    }
  };

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

  const logout = () => {
    sessionStorage.removeItem('pollen_key');
    setApiKey(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ apiKey, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
