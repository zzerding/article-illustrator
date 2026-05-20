import { useState, useEffect } from 'react';
import { User, Languages, Menu, X, Settings2, ChevronLeft, ChevronRight, LayoutPanelLeft, Info, LogOut, Github } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import ModelSettings from '../components/ModelSettings';

const MainLayout = ({ children, onNavigate, currentView }) => {
  const { user, balance, logout, apiKey } = useAuth();
  const { t, i18n } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const displayName = user?.name || user?.githubUsername || user?.email || 'User';

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', isSidebarCollapsed);
  }, [isSidebarCollapsed]);

  const toggleLanguage = () => {
    const nextLng = i18n.language.startsWith('zh') ? 'en' : 'zh';
    i18n.changeLanguage(nextLng);
  };

  const Logo = ({ className = "", compact = false }) => (
    <button
      type="button"
      onClick={() => {
        onNavigate('main');
        setIsMenuOpen(false);
      }}
      className={`flex items-center min-w-0 gap-3 hover:opacity-80 transition-opacity ${compact ? 'justify-center' : ''} ${className}`}
    >
      <img
        src="/favicon.svg"
        alt=""
        aria-hidden="true"
        className={compact ? 'w-10 h-10 shrink-0' : 'w-10 h-10 sm:w-11 sm:h-11 shrink-0'}
      />
      {!compact && (
        <span className="font-serif text-lg sm:text-2xl font-bold tracking-tight text-text truncate">
          Article Illustrator
        </span>
      )}
    </button>
  );

  const UserMenu = ({ isMobile = false, compact = false }) => {
    if (!apiKey) return null;
    return (
      <div className={`flex ${isMobile ? 'flex-col gap-6' : 'flex-col gap-4'}`}>
        <div className={`flex items-center gap-3 ${isMobile ? '' : 'px-2'} ${compact ? 'justify-center' : ''}`}>
          <div className={`${compact ? 'w-10 h-10' : 'w-10 h-10 sm:w-8 sm:h-8'} rounded-full overflow-hidden border border-text/5 bg-slate-50 shrink-0 shadow-sm`}>
            {user?.image ? (
              <img src={user.image} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className={`${compact ? 'w-5 h-5' : 'w-5 h-5 sm:w-4 sm:h-4'} text-text/20`} />
              </div>
            )}
          </div>
          {!compact && (
            <div className="flex flex-col min-w-0">
              <span className={`text-sm font-semibold text-text leading-none truncate ${isMobile ? 'max-w-[12rem]' : 'max-w-[10rem]'}`}>
                {displayName}
              </span>
              <div className="flex items-center gap-2 mt-1.5">
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
          )}
        </div>
      </div>
    );
  };

  const NavLinks = ({ isMobile = false, compact = false }) => (
    <div className={`flex ${isMobile ? 'flex-col gap-4' : 'flex-col lg:flex-row lg:items-center gap-6'}`}>
      <button
        onClick={toggleLanguage}
        className={`flex items-center gap-2.5 text-sm font-medium transition-opacity ${isMobile ? 'w-full p-4 bg-slate-50 rounded-2xl text-text/80' : 'text-text/60 hover:text-text'} ${compact ? 'justify-center p-3' : ''}`}
        title={i18n.language.startsWith('zh') ? 'Switch to English' : '切换至中文'}
      >
        <Languages className="w-5 h-5 lg:w-4 lg:h-4 shrink-0" />
        {!compact && <span>{i18n.language.startsWith('zh') ? 'Switch to English' : '切换至中文'}</span>}
        {!compact && isMobile && (
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-100">
            {i18n.language.startsWith('zh') ? 'EN' : 'ZH'}
          </span>
        )}
      </button>

      <button
        onClick={() => {
          onNavigate('about');
          setIsMenuOpen(false);
        }}
        className={`flex items-center gap-2.5 text-sm font-medium transition-opacity ${isMobile ? 'w-full p-4 bg-slate-50 rounded-2xl text-left' : ''} ${currentView === 'about' ? 'text-primary' : 'text-text/60 hover:text-text'} ${compact ? 'justify-center p-3' : ''}`}
        title={t('common.about')}
      >
        <Info className="w-5 h-5 lg:w-4 lg:h-4 shrink-0" />
        {!compact && <span>{t('common.about')}</span>}
      </button>

      <a
        href="https://github.com/zzerding/article-illustrator"
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-2.5 text-sm font-medium transition-opacity ${isMobile ? 'w-full p-4 bg-slate-50 rounded-2xl text-left' : ''} text-text/60 hover:text-text ${compact ? 'justify-center p-3' : ''}`}
        title="GitHub"
      >
        <Github className="w-5 h-5 lg:w-4 lg:h-4 shrink-0" />
        {!compact && <span>GitHub</span>}
      </a>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex font-sans">
      {/* Sidebar (Desktop) */}
      {apiKey && (
        <aside 
          className={`hidden lg:flex flex-col border-r border-slate-200 bg-white fixed inset-y-0 z-10 shadow-sm transition-all duration-300 ease-in-out ${
            isSidebarCollapsed ? 'w-20' : 'w-72'
          }`}
        >
          <div className={`p-8 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            <Logo compact={isSidebarCollapsed} />
            {!isSidebarCollapsed && (
              <button
                onClick={() => setIsSidebarCollapsed(true)}
                className="p-1.5 rounded-lg hover:bg-slate-50 text-text/20 hover:text-text/40 transition-colors"
                title="Collapse Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className={`flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-8 ${isSidebarCollapsed ? 'px-2' : 'px-4'}`}>
            <div className={isSidebarCollapsed ? 'flex flex-col items-center' : 'px-4'}>
              {!isSidebarCollapsed && (
                <h2 className="text-[10px] font-bold text-text/30 uppercase tracking-[0.2em] mb-4">
                  {t('common.account') || 'Account'}
                </h2>
              )}
              <UserMenu compact={isSidebarCollapsed} />
            </div>

            <div className={`border-t border-slate-100 pt-8 flex-1 flex flex-col min-h-0 ${isSidebarCollapsed ? 'items-center' : ''}`}>
              {currentView !== 'about' && (
                isSidebarCollapsed ? (
                  <button
                    onClick={() => setIsSidebarCollapsed(false)}
                    className="p-3 rounded-xl bg-slate-50 text-text/40 hover:text-primary hover:bg-primary/5 transition-all"
                    title="Expand for Settings"
                  >
                    <Settings2 className="w-6 h-6" />
                  </button>
                ) : (
                  <ModelSettings inline={true} />
                )
              )}
            </div>
          </div>

          {isSidebarCollapsed ? (
            <div className="p-4 border-t border-slate-50 flex flex-col items-center gap-4">
              <button
                onClick={logout}
                className="p-3 rounded-xl text-text/20 hover:text-red-500 hover:bg-red-50 transition-all"
                title={t('common.logout')}
              >
                <LogOut className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="p-1.5 rounded-lg hover:bg-slate-50 text-text/20 hover:text-text/40 transition-colors"
                title="Expand Sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="p-8 border-t border-slate-50">
              <button
                onClick={logout}
                className="flex items-center gap-2 text-[10px] font-bold text-text/30 hover:text-red-400 uppercase tracking-[0.2em] transition-colors text-left group"
              >
                <LogOut className="w-3.5 h-3.5 group-hover:text-red-400" />
                {t('common.logout')}
              </button>
            </div>
          )}
        </aside>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${apiKey ? (isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72') : ''}`}>
        {/* Mobile Header */}
        <header className="lg:hidden h-16 px-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-30 border-b border-slate-100">
          <Logo />
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center transition-all active:scale-95"
              aria-label="Toggle Menu"
            >
              {isMenuOpen ? (
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-text/60 hover:text-primary transition-all">
                  <X className="w-5 h-5" />
                </div>
              ) : apiKey ? (
                <div className="w-10 h-10 rounded-full overflow-hidden border border-text/5 bg-slate-50 shrink-0 shadow-sm ring-2 ring-transparent hover:ring-primary/10 transition-all">
                  {user?.image ? (
                    <img src={user.image} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-5 h-5 text-text/20" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-text/60 hover:text-primary transition-all">
                  <Menu className="w-5 h-5" />
                </div>
              )}
            </button>
          </div>
        </header>

        {/* Mobile Menu Drawer */}
        {isMenuOpen && (
          <>
            <div 
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setIsMenuOpen(false)}
            />
            <div className="fixed inset-y-0 right-0 w-[85%] max-w-sm bg-white shadow-2xl z-50 flex flex-col lg:hidden overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-bold text-text/30 uppercase tracking-[0.2em]">Menu</span>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-50 text-text/40"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-10">
                {apiKey && (
                  <div>
                    <h2 className="text-[10px] font-bold text-text/30 uppercase tracking-[0.2em] mb-6">
                      {t('common.account') || 'Account'}
                    </h2>
                    <UserMenu isMobile={true} />
                  </div>
                )}

                {apiKey && (
                  <div className="border-t border-slate-100 pt-8">
                    <h2 className="text-[10px] font-bold text-text/30 uppercase tracking-[0.2em] mb-6">
                      {t('common.settings')}
                    </h2>
                    <ModelSettings inline={true} />
                  </div>
                )}

                <div className={apiKey ? 'border-t border-slate-100 pt-8' : ''}>
                  <h2 className="text-[10px] font-bold text-text/30 uppercase tracking-[0.2em] mb-6">
                    Navigation
                  </h2>
                  <NavLinks isMobile={true} />
                </div>
              </div>

              {apiKey && (
                <div className="p-6 border-t border-slate-100">
                  <button
                    onClick={logout}
                    className="w-full p-4 rounded-2xl bg-red-50 text-red-600 font-bold text-sm transition-colors active:bg-red-100"
                  >
                    {t('common.logout')}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

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
