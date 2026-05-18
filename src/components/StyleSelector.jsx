import { useState } from 'react';
import { Camera, Paintbrush, Frame, Sparkles, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTranslation } from 'react-i18next';

const getStyles = (t) => [
  { id: 'photo', name: t('styles.photo'), description: 'photorealistic, professional photography', icon: Camera },
  { id: 'illustration', name: t('styles.illustration'), description: 'editorial illustration, flat design', icon: Paintbrush },
  { id: 'painting', name: t('styles.painting'), description: 'oil painting, artistic', icon: Frame },
  { id: 'free', name: t('styles.free'), description: '', icon: Sparkles },
];

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const StyleSelector = ({ onSelect, buttonText, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();
  const styles = getStyles(t);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn("flex items-center gap-1 transition-all", className)}
      >
        {buttonText}
        {typeof buttonText === 'string' && <ChevronDown className={cn("w-4 h-4 opacity-40 transition-transform", isOpen && "rotate-180")} />}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-left">
            <div className="p-1.5 flex flex-col gap-1" role="listbox">
              <div className="px-3 py-2 text-[10px] font-bold text-text/30 uppercase tracking-widest">{t('styles.prompt_hint')}</div>
              {styles.map((style) => (
                <button
                  key={style.id}
                  role="option"
                  onClick={() => {
                    onSelect(style.id);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 hover:bg-orange-50/50 group transition-colors"
                >
                  <style.icon className="w-4 h-4 text-text/40 group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium text-text/80 group-hover:text-text transition-colors">{style.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StyleSelector;
