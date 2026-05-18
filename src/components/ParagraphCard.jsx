import React from 'react';
import { Download, RotateCcw, Trash2, Loader2, ImageIcon } from 'lucide-react';
import StyleSelector from './StyleSelector';
import { useTranslation } from 'react-i18next';

const ParagraphCard = ({ paragraph, index, onIllustrate, onDelete }) => {
  const { t } = useTranslation();
  const isIdle = paragraph.status === 'idle';
  const isGenerating = paragraph.status === 'generating';
  const isCompleted = paragraph.status === 'completed';
  const isError = paragraph.status === 'error';

  const handleDownload = async () => {
    if (!paragraph.imageUrl) return;
    try {
      const response = await fetch(paragraph.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `illustration-${index + 1}.png`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(paragraph.imageUrl, '_blank');
    }
  };

  return (
    <div className="group relative grid grid-cols-12 gap-8 py-4 transition-all border-l-2 border-transparent hover:border-primary pl-4 -ml-4">
      {/* 01 Index */}
      <div className="col-span-1 text-2xl font-serif text-text/20">
        {(index + 1).toString().padStart(2, '0')}
      </div>

      {/* Content Section */}
      <div className="col-span-6 lg:col-span-7 pr-4">
        <p className="text-lg text-text leading-relaxed font-sans">
          {paragraph.text}
        </p>
      </div>

      {/* Action / Image Section */}
      <div className="col-span-5 lg:col-span-4 flex flex-col gap-4">
        {isIdle && (
          <div className="h-full flex items-center">
            <StyleSelector 
              onSelect={onIllustrate}
              buttonText={`🎨 ${t('common.illustration')}`}
              className="text-primary font-semibold hover:text-primary-hover transition-colors border-b border-primary/20 hover:border-primary"
            />
          </div>
        )}

        {isGenerating && (
          <div className="aspect-[16/9] bg-slate-100 rounded-xl flex flex-col items-center justify-center gap-3 animate-pulse">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-bold text-primary tracking-widest uppercase">{t('common.generating_status')}</span>
              <div className="flex items-center gap-2 text-[8px] font-bold text-primary/40 uppercase tracking-wider">
                <span>{localStorage.getItem('pollen_text_model') || '...'}</span>
                <span>→</span>
                <span>{localStorage.getItem('pollen_image_model') || '...'}</span>
              </div>
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="flex flex-col gap-3 group/img">
            <div className="relative aspect-[16/9] rounded-xl overflow-hidden shadow-lg group-hover/img:shadow-xl transition-shadow">
              <img 
                src={paragraph.imageUrl} 
                alt="Generated illustration"
                className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-4">
                 {/* Quick actions could go here if needed */}
              </div>
            </div>
            
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-4 text-xs font-bold text-text/40">
                <button 
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 hover:text-primary transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t('common.download')}
                </button>
                <StyleSelector 
                  onSelect={onIllustrate}
                  buttonText={
                    <span className="flex items-center gap-1.5 hover:text-primary transition-colors">
                      <RotateCcw className="w-3.5 h-3.5" />
                      {t('common.regenerate')}
                    </span>
                  }
                />
              </div>
              <div className="text-[10px] font-bold text-text/20 uppercase tracking-tighter">
                {t('common.generated_status')}
              </div>
            </div>
            
            {paragraph.prompt && (
               <div className="flex flex-col gap-1 mt-1">
                 <p className="text-[10px] text-text/30 line-clamp-1 italic hover:line-clamp-none transition-all cursor-help" title={paragraph.prompt}>
                   Prompt: {paragraph.prompt}
                 </p>
                 {(paragraph.textModel || paragraph.imageModel) && (
                   <div className="flex items-center gap-2 text-[8px] font-bold text-text/20 uppercase tracking-wider">
                     {paragraph.textModel && <span title="Text Model">T: {paragraph.textModel}</span>}
                     {paragraph.imageModel && <span title="Image Model">I: {paragraph.imageModel}</span>}
                   </div>
                 )}
               </div>
            )}
          </div>
        )}

        {isError && (
          <div className="aspect-[16/9] bg-red-50 rounded-xl flex flex-col items-center justify-center gap-3 border border-red-100">
            <span className="text-xs font-bold text-red-500 tracking-widest uppercase">{t('common.error_failed_generation')}</span>
            <button 
              onClick={() => onIllustrate(paragraph.style)}
              className="text-[10px] font-bold text-red-400 hover:text-red-600 underline decoration-red-200"
            >
              {t('common.retry')}
            </button>
          </div>
        )}
      </div>

      {/* Delete button (hidden by default, shown on hover) */}
      <button 
        onClick={onDelete}
        className="absolute -right-4 top-4 p-2 text-text/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
        title={t('common.delete_paragraph')}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ParagraphCard;
