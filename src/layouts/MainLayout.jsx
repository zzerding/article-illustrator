import React from 'react';
import { User, Languages } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const MainLayout = ({ children }) => {
  const { user, logout, apiKey } = useAuth();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLng = i18n.language.startsWith('zh') ? 'en' : 'zh';
    i18n.changeLanguage(nextLng);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="py-6 px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center">
          <span className="font-serif text-2xl font-bold tracking-tight text-text">Article Illustrator</span>
        </div>
        
        <div className="flex items-center gap-4 md:gap-8">
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 text-sm font-medium text-text opacity-60 hover:opacity-100 transition-opacity"
            title={i18n.language.startsWith('zh') ? 'Switch to English' : '切换至中文'}
          >
            <Languages className="w-4 h-4" />
            <span>{i18n.language.startsWith('zh') ? 'EN' : '中文'}</span>
          </button>

          {apiKey && (
            <>
              <div className="flex items-center gap-2">
                {user?.picture ? (
                  <img src={user.picture} alt="Avatar" className="w-8 h-8 rounded-full" />
                ) : (
                  <User className="w-5 h-5 text-text" />
                )}
                <span className="text-sm font-medium text-text hidden sm:block">
                  {user?.preferred_username || user?.name || 'User'}
                </span>
                <span className="text-text opacity-30 mx-1 hidden sm:block">⌄</span>
              </div>
              <button 
                onClick={logout}
                className="text-sm font-medium text-text opacity-60 hover:opacity-100 transition-opacity"
              >
                {t('common.logout')}
              </button>
            </>
          )}
          {!apiKey && (
            <button className="text-sm font-medium text-text opacity-60 hover:opacity-100 transition-opacity">
              {t('common.about')}
            </button>
          )}
        </div>
      </header>
      
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
