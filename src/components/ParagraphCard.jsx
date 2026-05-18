import { Download, RotateCcw, Trash2, Loader2, Send, Edit3, Image as ImageIcon, Maximize2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import StyleSelector from './StyleSelector';
import { useTranslation } from 'react-i18next';
import { CONFIG, STORAGE_KEYS } from '../config';

const getDownloadExtension = (contentType) => {
  if (contentType?.includes('jpeg') || contentType?.includes('jpg')) return 'jpg';
  if (contentType?.includes('webp')) return 'webp';
  return 'png';
};

const ParagraphCard = ({ paragraph, index, onGeneratePrompt, onGenerateImage, onDelete, onPreview }) => {
  const { t } = useTranslation();
  const [editedPrompt, setEditedPrompt] = useState(paragraph.prompt || '');

  useEffect(() => {
    setEditedPrompt(paragraph.prompt || '');
  }, [paragraph.prompt]);

  const isIdle = paragraph.status === 'idle';
  const isPrompting = paragraph.status === 'prompting';
  const isPrompted = paragraph.status === 'prompted';
  const isGenerating = paragraph.status === 'generating';
  const isCompleted = paragraph.status === 'completed';
  const isError = paragraph.status === 'error';
  const hasPrompt = typeof paragraph.prompt === 'string';
  const canGenerateImage = !isPrompting && !isGenerating && Boolean(editedPrompt.trim());

  const handleDownload = async () => {
    if (!paragraph.imageUrl) return;
    try {
      const response = await fetch(paragraph.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `illustration-${index + 1}.${getDownloadExtension(paragraph.imageContentType || blob.type)}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(paragraph.imageUrl, '_blank');
    }
  };

  return (
    <div className="group relative bg-white border border-slate-200 rounded-3xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/60 hover:border-primary/20">
      <div className="flex flex-col gap-6">
        {/* Header with Index and Delete */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-serif text-primary/20 italic">{(index + 1).toString().padStart(2, '0')}</span>
            <div className="h-px w-8 bg-slate-100" />
          </div>
          <button
            onClick={onDelete}
            className="p-2 text-text/10 hover:text-red-400 hover:bg-red-50 rounded-xl transition-all"
            title={t('common.delete_paragraph')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: The Source (Text & Prompts) */}
          <div className="flex flex-col gap-4">
            <div className="relative">
              <p className="text-base text-text/80 leading-relaxed font-sans">
                {paragraph.text}
              </p>
            </div>

            {/* Prompt Generation Control */}
            {(isIdle || (isError && !hasPrompt)) && (
              <div className="mt-4 p-6 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50 transition-all hover:border-primary/20 hover:bg-slate-50">
                <StyleSelector
                  onSelect={onGeneratePrompt}
                  buttonText={
                    <div className="flex flex-col items-center gap-3 w-full">
                      <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                        <Edit3 className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-sm font-bold text-primary">{t('common.generate_prompt')}</span>
                    </div>
                  }
                  className="w-full"
                />
              </div>
            )}

            {/* Prompt Generation Loading State */}
            {isPrompting && (
              <div className="mt-4 p-8 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-4 animate-pulse">
                <div className="relative">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
                </div>
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase">{t('common.generating_prompt_status')}</span>
                  <div className="flex items-center gap-2 text-[8px] font-bold text-text/20 uppercase tracking-wider">
                    <span>{localStorage.getItem(STORAGE_KEYS.TEXT_MODEL) || CONFIG.DEFAULT_TEXT_MODEL}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Editable Prompt Section */}
            {hasPrompt && (
              <div className="mt-4 flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 group/prompt">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-text/40 uppercase tracking-widest">
                    <Edit3 className="w-3 h-3" />
                    {t('common.image_prompt')}
                  </div>
                </div>
                <textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  placeholder={t('common.prompt_placeholder')}
                  className="w-full h-24 bg-transparent border-none outline-none resize-none text-xs text-text/60 leading-relaxed font-medium placeholder:text-text/20 custom-scrollbar"
                />
                <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-200/50">
                  <StyleSelector
                    onSelect={onGeneratePrompt}
                    buttonText={
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text/40 hover:text-primary transition-colors">
                        <RotateCcw className="w-3 h-3" />
                        {t('common.regenerate_prompt')}
                      </span>
                    }
                  />
                  <button
                    onClick={() => onGenerateImage(editedPrompt)}
                    disabled={!canGenerateImage}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-primary hover:text-white transition-all disabled:opacity-50 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {(isCompleted || isError) ? t('common.regenerate_image') : t('common.generate_image')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: The Canvas (Image & Visual Status) */}
          <div className="flex flex-col gap-4 min-h-[250px]">
            {/* Placeholder / Awaiting Action */}
            {(isIdle || isPrompting || isPrompted) && (
              <div className="h-full min-h-[250px] flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50 p-8 transition-all">
                <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4">
                  <ImageIcon className="w-6 h-6 text-slate-200" />
                </div>
                <div className="flex flex-col items-center gap-2 text-center">
                  <span className="text-[10px] font-bold text-text/20 tracking-[0.2em] uppercase">
                    {isPrompting ? t('common.generating_prompt_status') : isPrompted ? t('common.prompt_ready_status') : t('common.illustration')}
                  </span>
                  {isPrompted && (
                    <p className="text-[10px] text-text/20 max-w-[200px]">
                      {t('common.prompt_placeholder')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Generating Image Pulse */}
            {isGenerating && (
              <div className="aspect-[16/9] bg-slate-50 rounded-2xl flex flex-col items-center justify-center gap-4 animate-pulse border border-slate-100 min-h-[250px]">
                <div className="relative">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <div className="absolute inset-0 blur-2xl bg-primary/30 animate-pulse" />
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase">{t('common.generating_status')}</span>
                  <div className="flex items-center gap-2 text-[8px] font-bold text-text/20 uppercase tracking-wider">
                    <span>{localStorage.getItem(STORAGE_KEYS.IMAGE_MODEL) || CONFIG.DEFAULT_IMAGE_MODEL}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Completed Image */}
            {isCompleted && (
              <div className="flex flex-col gap-4 group/img animate-in fade-in duration-500">
                <div
                  className="relative aspect-[16/9] rounded-2xl overflow-hidden shadow-xl shadow-slate-200 group-hover:shadow-2xl group-hover:shadow-primary/10 transition-all duration-500 ring-1 ring-black/5 cursor-zoom-in"
                  onClick={onPreview}
                >
                  <img
                    src={paragraph.imageUrl}
                    alt="Generated illustration"
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-end justify-end p-4 gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreview();
                      }}
                      className="p-3 bg-white/20 backdrop-blur-md text-white rounded-xl hover:bg-white hover:text-primary transition-all shadow-lg"
                      title={t('common.preview')}
                    >
                      <Maximize2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload();
                      }}
                      className="p-3 bg-white/20 backdrop-blur-md text-white rounded-xl hover:bg-white hover:text-primary transition-all shadow-lg"
                      title={t('common.download')}
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {paragraph.imageModel && (
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 text-[8px] font-bold text-text/20 uppercase tracking-[0.2em]">
                      <span>I: {paragraph.imageModel}</span>
                      <span className="opacity-50">·</span>
                      <span>{paragraph.imageWidth}x{paragraph.imageHeight}</span>
                    </div>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-text/40 hover:text-primary transition-colors uppercase tracking-widest"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {t('common.download')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Error State (During Image Generation) */}
            {isError && hasPrompt && (
              <div className="aspect-[16/9] bg-red-50 rounded-2xl flex flex-col items-center justify-center gap-4 border border-red-100 p-8 min-h-[250px]">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div className="flex flex-col items-center gap-3 text-center">
                  <span className="text-[10px] font-bold text-red-500 tracking-widest uppercase">{t('common.error_failed_generation')}</span>
                  <button
                    onClick={() => onGenerateImage(editedPrompt)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-100 text-red-600 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-200 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {t('common.retry')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParagraphCard;
