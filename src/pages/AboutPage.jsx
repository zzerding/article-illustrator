import { ArrowLeft, BookOpen, Cpu, ShieldCheck, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AboutPage = ({ onBack }) => {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
      <button
        onClick={onBack}
        className="group flex items-center gap-2 text-sm font-medium text-text opacity-60 hover:opacity-100 transition-all mb-12"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        {t('about.back')}
      </button>

      <div className="space-y-16">
        <section>
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-text mb-6">
            {t('about.title')}
          </h1>
          <p className="text-xl md:text-2xl text-primary font-medium mb-8">
            {t('about.subtitle')}
          </p>
          <div className="w-20 h-1 bg-primary/20 mb-8" />
          <p className="text-lg text-text/80 leading-relaxed max-w-3xl">
            {t('about.intro')}
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div className="flex items-center gap-3 text-2xl font-serif font-bold text-text">
              <BookOpen className="w-6 h-6 text-primary" />
              <h2>{t('about.how_it_works.title')}</h2>
            </div>
            <ul className="space-y-6">
              {[1, 2, 3, 4].map((step) => (
                <li key={step} className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    {step}
                  </span>
                  <p className="text-text/70 pt-1">
                    {t(`about.how_it_works.step${step}`)}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-12">
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-2xl font-serif font-bold text-text">
                <ShieldCheck className="w-6 h-6 text-primary" />
                <h2>{t('about.privacy_credits.title')}</h2>
              </div>
              <p className="text-text/70 leading-relaxed text-sm">
                {t('about.privacy_credits.privacy')}
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Cpu className="w-5 h-5" />
                <span className="font-bold text-xs uppercase tracking-widest">Powered By</span>
              </div>
              <p className="text-text/70 text-sm italic">
                {t('about.privacy_credits.credits')}
              </p>
              <a
                href="https://pollinations.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs font-bold text-primary hover:underline"
              >
                pollinations.ai →
              </a>
            </div>
          </div>
        </section>

        <footer className="pt-12 border-t border-slate-100 flex items-center justify-center gap-2 text-text/30 text-sm">
          <span>Made with</span>
          <Heart className="w-4 h-4 fill-current text-red-400/50" />
          <span>for creators</span>
        </footer>
      </div>
    </div>
  );
};

export default AboutPage;
