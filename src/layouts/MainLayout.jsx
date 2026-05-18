import { User, Languages } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import ModelSettings from '../components/ModelSettings';

const MainLayout = ({ children }) => {
  const { user, balance, usageSummary, logout, apiKey } = useAuth();
  const { t, i18n } = useTranslation();
  const displayName = user?.name || user?.githubUsername || user?.email || 'User';
  const secondaryName = user?.email && user.email !== displayName ? user.email : user?.githubUsername;
  const usageRequests = usageSummary?.requests || 0;
  const usageCostUsd = usageSummary?.costUsd || 0;

  const toggleLanguage = () => {
    const nextLng = i18n.language.startsWith('zh') ? 'en' : 'zh';
    i18n.changeLanguage(nextLng);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="py-4 sm:py-6 px-4 sm:px-6 md:px-12 flex items-center justify-between gap-3">
        <div className="flex items-center min-w-0">
          <span className="font-serif text-lg sm:text-2xl font-bold tracking-tight text-text truncate">Article Illustrator</span>
        </div>

        <div className="flex items-center gap-3 sm:gap-6 md:gap-8 shrink-0">
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
            <div className="flex items-center gap-3 sm:gap-6">
              <div className="flex flex-col items-end hidden md:flex">
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
                {usageRequests > 0 && (
                  <span
                    className="text-[10px] font-medium text-text/40"
                    title={t('common.usage_90d_title')}
                  >
                    {t('common.usage_90d', {
                      requests: usageRequests.toLocaleString(),
                      cost: usageCostUsd.toFixed(2)
                    })}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-text/5 bg-slate-50">
                  {user?.image ? (
                    <img src={user.image} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-4 h-4 text-text/20" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-text hidden sm:block leading-none">
                    {displayName}
                  </span>
                  {secondaryName && (
                    <span className="text-[10px] text-text/35 hidden md:block leading-tight max-w-[10rem] truncate">
                      {secondaryName}
                    </span>
                  )}
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
