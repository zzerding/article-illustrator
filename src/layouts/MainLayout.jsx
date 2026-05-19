import { User, Languages } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import ModelSettings from '../components/ModelSettings';

const MainLayout = ({ children, onNavigate, currentView }) => {
  const { user, balance, logout, apiKey } = useAuth();
  const { t, i18n } = useTranslation();
  const displayName = user?.name || user?.githubUsername || user?.email || 'User';

  const toggleLanguage = () => {
    const nextLng = i18n.language.startsWith('zh') ? 'en' : 'zh';
    i18n.changeLanguage(nextLng);
  };

  const Logo = ({ className = "" }) => (
    <button
      onClick={() => onNavigate('main')}
      className={`flex items-center min-w-0 hover:opacity-70 transition-opacity ${className}`}
    >
      <span className="font-serif text-lg sm:text-2xl font-bold tracking-tight text-text truncate">
        Article Illustrator
      </span>
    </button>
  );

  const UserMenu = ({ isMobile = false }) => {
    if (!apiKey) return null;
    return (
      <div className={`flex ${isMobile ? 'items-center gap-3' : 'flex-col gap-4'}`}>
        <div className={`flex items-center gap-3 ${isMobile ? '' : 'px-2'}`}>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-text/5 bg-slate-50 shrink-0">
            {user?.image ? (
              <img src={user.image} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-4 h-4 text-text/20" />
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className={`text-sm font-semibold text-text leading-none truncate ${isMobile ? 'max-w-[8rem]' : 'max-w-[10rem]'}`}>
              {displayName}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-bold text-primary tracking-widest uppercase opacity-70 leading-none">
                Tier: {user?.tier || 'Free'}
              </span>
              {balance !== null && (
                <>
                  <span className="text-[9px] text-text/20">·</span>
                  <a
                    href="https://pollinations.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] font-medium text-text/40 hover:text-primary transition-colors cursor-pointer leading-none"
                  >
                    {Number(balance.balance).toFixed(3)} P
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const NavLinks = ({ isMobile = false }) => (
    <div className={`flex ${isMobile ? 'items-center gap-4' : 'items-center gap-6'}`}>
      <button
        onClick={toggleLanguage}
        className="flex items-center gap-1.5 text-sm font-medium text-text/60 hover:text-text transition-opacity"
        title={i18n.language.startsWith('zh') ? 'Switch to English' : '切换至中文'}
      >
        <Languages className="w-4 h-4" />
        <span className="hidden sm:inline">{i18n.language.startsWith('zh') ? 'EN' : '中文'}</span>
        <span className="sm:hidden">{i18n.language.startsWith('zh') ? 'EN' : 'ZH'}</span>
      </button>

      <button
        onClick={() => onNavigate('about')}
        className={`text-sm font-medium transition-opacity ${currentView === 'about' ? 'text-primary' : 'text-text/60 hover:text-text'}`}
      >
        {t('common.about')}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex font-sans">
      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-slate-200 bg-white fixed inset-y-0 z-10 shadow-sm">
        <div className="p-8">
          <Logo />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 flex flex-col gap-8">
          <div className="px-4">
            <h2 className="text-[10px] font-bold text-text/30 uppercase tracking-[0.2em] mb-4">
              {t('common.account') || 'Account'}
            </h2>
            <UserMenu />
          </div>

          <div className="border-t border-slate-100 pt-8">
            {currentView !== 'about' && <ModelSettings inline={true} />}
          </div>
        </div>

        {apiKey && (
          <div className="p-8 border-t border-slate-50">
            <button
              onClick={logout}
              className="text-[10px] font-bold text-text/30 hover:text-red-400 uppercase tracking-[0.2em] transition-colors text-left"
            >
              {t('common.logout')}
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-72 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden py-4 px-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-20 border-b border-slate-100">
          <Logo />
          <div className="flex items-center gap-4">
            {currentView !== 'about' && <ModelSettings />}
            {apiKey && (
              <div className="w-8 h-8 rounded-full overflow-hidden border border-text/5 bg-slate-50">
                {user?.image ? (
                  <img src={user.image} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-4 h-4 text-text/20" />
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Desktop Header (Navigation & Actions) */}
        <header className="hidden lg:flex h-20 items-center justify-end px-12 sticky top-0 bg-background/80 backdrop-blur-md z-20 border-b border-slate-50/50">
          <NavLinks />
        </header>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
