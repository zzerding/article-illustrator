import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import editorDesktop from '../assets/editor-desktop.png';

const LandingPage = () => {
  const { login } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
      <div className="flex flex-col items-start">
        <h1 className="text-7xl md:text-9xl font-serif font-bold text-text leading-tight mb-8 whitespace-pre-line">
          {t('landing.title')}
        </h1>
        
        <div className="w-24 h-1 bg-primary mb-12" />
        
        <p className="text-2xl md:text-3xl font-sans text-text mb-16 max-w-lg leading-relaxed whitespace-pre-line">
          {t('landing.description')}
        </p>
        
        <button 
          onClick={login}
          className="group flex items-center gap-4 text-2xl font-semibold text-primary hover:text-primary-hover transition-all mb-8 text-left"
        >
          {t('landing.cta')}
          <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform shrink-0" />
        </button>
        
        <div className="flex items-center gap-2 text-text opacity-40 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{t('landing.privacy')}</span>
        </div>
      </div>

      <div className="relative hidden lg:block">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform rotate-2 hover:rotate-0 transition-transform duration-700">
          <div className="h-8 bg-slate-50 border-b border-slate-100 flex items-center px-4 gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
          </div>
          <img 
            src={editorDesktop} 
            alt="Editor Preview" 
            className="w-full h-auto"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="hidden h-96 bg-background flex-col p-8 gap-4">
             <div className="w-3/4 h-4 bg-slate-100 rounded" />
             <div className="w-1/2 h-4 bg-slate-100 rounded" />
             <div className="w-full h-64 bg-slate-50 rounded-xl border border-dashed border-slate-200" />
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -bottom-8 -right-8 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute -top-8 -left-8 w-48 h-48 bg-primary/5 rounded-full blur-3xl -z-10" />
      </div>
    </div>
  );
};

export default LandingPage;
