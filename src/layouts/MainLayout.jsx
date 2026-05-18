import React from 'react';
import { User, Languages } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import ModelSettings from '../components/ModelSettings';

const MainLayout = ({ children }) => {
  const { user, balance, logout, apiKey } = useAuth();
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
          <ModelSettings />

          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 text-sm font-medium text-text opacity-60 hover:opacity-100 transition-opacity"
            title={i18n.language.startsWith('zh') ? 'Switch to English' : '切换至中文'}
          >
            <Languages className="w-4 h-4" />
            <span>{i18n.language.startsWith('zh') ? 'EN' : '中文'}</span>
          </button>

          {apiKey && (
            <div className="flex items-center gap-4 md:gap-6">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-[10px] font-bold text-primary tracking-widest uppercase opacity-70">
                  {user?.tier || 'Free'}
                </span>
                {balance !== null && (
                  <a
                    href="https://pollinations.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-medium text-text/50 hover:text-primary transition-colors cursor-pointer"
                    title={t('common.recharge')}
                  >
                    {balance.balance} Pollen
                  </a>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-text/5 bg-slate-50">
                  {user?.image ? (
                    <img src={user.image} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-4 h-4 text-text/20" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-text hidden sm:block leading-none">
                    {user?.githubUsername || 'User'}
                  </span>
                  <button
                    onClick={logout}
                    className="text-[9px] font-bold text-text/30 hover:text-red-400 uppercase tracking-widest transition-colors text-left"
                  >
                    {t('common.logout')}
                  </button>
                </div>
              </div>
            </div>
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
