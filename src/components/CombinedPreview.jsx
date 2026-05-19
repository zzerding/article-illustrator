// ABOUTME: Combined article + images reading view
// ABOUTME: Full-screen modal that renders article text alongside generated illustrations in a clean reading layout

import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CombinedPreview = ({ paragraphs, title, onClose }) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-text/90 backdrop-blur-md animate-in fade-in duration-300">
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all z-[60]"
        title={t('common.close')}
      >
        <X className="w-6 h-6" />
      </button>

      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative max-w-3xl w-full max-h-full overflow-y-auto animate-in zoom-in-95 duration-300 pointer-events-auto custom-scrollbar">
        <div className="bg-white rounded-3xl shadow-2xl ring-1 ring-white/10 overflow-hidden">
          <div className="p-8 sm:p-12 lg:p-16">
            {title && (
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-text mb-10 leading-tight">
                {title}
              </h1>
            )}

            <div className="space-y-12">
              {paragraphs.map((paragraph, index) => {
                const isFirst = index === 0;
                
                return (
                  <div key={paragraph.id} className="space-y-8">
                    <p className={`text-base sm:text-xl text-text/90 leading-relaxed font-sans ${isFirst ? 'first-letter:text-6xl first-letter:font-serif first-letter:font-bold first-letter:mr-3 first-letter:float-left first-letter:leading-none first-letter:pt-3' : ''}`}>
                      {paragraph.text}
                    </p>

                    {paragraph.imageUrl && (
                      <div className="rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5 my-12">
                        <img
                          src={paragraph.imageUrl}
                          alt=""
                          className="w-full h-auto object-contain max-h-[600px]"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
        </div>
      </div>
    </div>
  </div>
);
};

export default CombinedPreview;
