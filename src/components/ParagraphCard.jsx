import { Download, RotateCcw, Trash2, Loader2, Edit3, Maximize2, Hash, Sparkles, AlertCircle, Shuffle, X, CheckCircle2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import StyleSelector from './StyleSelector';
import { useTranslation } from 'react-i18next';
import { CONFIG, STORAGE_KEYS } from '../config';

const getDownloadExtension = (contentType) => {
  if (contentType?.includes('jpeg') || contentType?.includes('jpg')) return 'jpg';
  if (contentType?.includes('webp')) return 'webp';
  return 'png';
};

const ParagraphCard = ({ paragraph, index, isSelected, onSelect, onGeneratePrompt, onGenerateImage, onDelete, onPreview, onUpdateText }) => {
  const { t } = useTranslation();
  const [editedPrompt, setEditedPrompt] = useState(paragraph.prompt || '');
  const [localSeed, setLocalSeed] = useState(paragraph.imageSeed || '');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);

  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [paragraph.text]);

  useEffect(() => {
    setEditedPrompt(paragraph.prompt || '');
  }, [paragraph.prompt]);

  useEffect(() => {
    if (paragraph.imageSeed !== undefined && paragraph.imageSeed !== null) {
      setLocalSeed(paragraph.imageSeed);
    }
  }, [paragraph.imageSeed]);

  const handleTextChange = (e) => {
    onUpdateText(paragraph.id, e.target.value);
  };

  const handleFocus = () => {
    if (onSelect) {
      onSelect(paragraph.id);
    }
  };

  const handleClick = () => {
    if (onSelect) {
      onSelect(paragraph.id);
    }
  };

  const handleRandomizeSeed = () => {
    setLocalSeed(Math.floor(Math.random() * 2147483647));
  };

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

  const handleGenerateImage = () => {
    onGenerateImage(editedPrompt, localSeed);
    setIsEditingPrompt(false);
  };

  const SeedInput = ({ className }) => (
    <div className={`flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1 gap-1 ${className}`}>
      <Hash className="w-3 h-3 text-text/30" />
      <input
        type="number"
        value={localSeed}
        onChange={(e) => setLocalSeed(e.target.value)}
        placeholder="Seed"
        className="w-16 bg-transparent border-none outline-none text-[10px] font-bold text-text/60"
      />
      <button
        onClick={handleRandomizeSeed}
        className="p-1 hover:text-primary transition-colors"
        title="Randomize Seed"
      >
        <Shuffle className="w-3 h-3 text-text/30 hover:text-primary" />
      </button>
    </div>
  );

  return (
    <div
      onClick={handleClick}
      className={`relative flex flex-col lg:grid lg:grid-cols-[4fr_6fr] lg:gap-0 border-t border-slate-200/50 first:border-t-0 pt-6 first:pt-0 lg:pt-0 lg:border-t-0 pb-8 lg:pb-12 transition-all duration-300 cursor-pointer ${isSelected ? 'bg-white' : 'hover:bg-slate-50/20'}`}
    >
      {/* Left Column: Text Content */}
      <div className="flex gap-4 lg:gap-6 px-4 lg:px-0 lg:pr-8 lg:border-t lg:border-r lg:border-slate-200/60 lg:pt-8 relative">
        {/* Selected Indicator Bar */}
        {isSelected && (
          <div className="absolute left-4 lg:-left-2 top-6 lg:top-0 bottom-6 w-[3px] bg-primary rounded-full animate-in fade-in slide-in-from-left-2 duration-300" />
        )}
        <span className="text-lg font-serif text-text/20 italic select-none min-w-[1.5rem] pt-1">
          {(index + 1).toString().padStart(2, '0')}
        </span>
        <div className="flex flex-col gap-4 flex-1">
          <textarea
            ref={textareaRef}
            value={paragraph.text}
            onChange={handleTextChange}
            onFocus={handleFocus}
            className="w-full bg-transparent border-none outline-none resize-none text-sm text-text/70 leading-relaxed font-sans focus:text-text transition-colors custom-scrollbar py-1 overflow-hidden"
            placeholder={t('common.placeholder')}
          />
        </div>
      </div>

      {/* Right Column: Work Area & Actions */}
      <div className="flex flex-col xl:flex-row gap-6 xl:items-start w-full px-4 lg:px-0 lg:pl-8 lg:border-t lg:border-slate-200/60 lg:pt-8">

        {/* Work Area (Image/Prompt) */}
        <div className="flex-1 flex items-center min-h-[160px] w-full">
          <div className="w-full">
            {/* Skeleton Loader for Generating State */}
            {isGenerating && (
              <div className="flex gap-8 animate-pulse w-full items-center bg-[#F6F6F4]/60 border border-[#EDEDEB]/50 p-6 rounded-2xl min-h-[140px]">
                {/* Left skeleton: circle + lines */}
                <div className="flex-1 flex flex-col gap-3.5 py-1">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-9 h-9 rounded-full bg-slate-200/70" />
                    <div className="h-2 bg-slate-200/60 rounded-full w-7/12" />
                  </div>
                  <div className="h-2 bg-slate-200/40 rounded-full w-11/12" />
                  <div className="h-2 bg-slate-200/40 rounded-full w-8/12" />
                  <div className="h-2 bg-slate-200/40 rounded-full w-10/12" />
                </div>
                {/* Right skeleton: image rectangle */}
                <div className="w-[180px] sm:w-[240px] h-[100px] bg-slate-200/60 rounded-xl shrink-0" />
              </div>
            )}

            {/* Prompt Editor View (When Prompted or Editing) */}
            {((isPrompted && !isCompleted && !isGenerating) || isEditingPrompt || isPrompting) && (
              <div className="w-full bg-white border border-slate-100 rounded-xl p-4 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                {isPrompting ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    <span className="text-[10px] font-bold text-primary tracking-widest uppercase">{t('common.generating_prompt_status')}</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between text-[10px] font-bold text-text/30 uppercase tracking-widest">
                      <span>{t('common.image_prompt')}</span>
                      <StyleSelector
                        onSelect={onGeneratePrompt}
                        buttonText={<span className="hover:text-primary transition-colors cursor-pointer flex items-center gap-1"><RotateCcw className="w-2.5 h-2.5" />{t('common.regenerate_prompt')}</span>}
                      />
                    </div>
                    <textarea
                      value={editedPrompt}
                      onChange={(e) => setEditedPrompt(e.target.value)}
                      className="w-full h-20 bg-transparent border-none outline-none resize-none text-xs text-text/60 leading-relaxed font-medium custom-scrollbar"
                      placeholder={t('common.prompt_placeholder')}
                    />
                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                      <SeedInput />
                      <div className="flex items-center gap-2">
                        {isCompleted && (
                          <button
                            onClick={() => setIsEditingPrompt(false)}
                            className="p-1.5 text-text/40 hover:text-text/60 transition-colors"
                            title={t('common.close')}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={handleGenerateImage}
                          disabled={!canGenerateImage}
                          className="px-4 py-1.5 bg-primary text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-30 transition-all shadow-sm"
                        >
                          {isCompleted ? t('common.regenerate_image') : t('common.generate_image')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Idle State */}
            {isIdle && (
              <div className="w-full flex items-center py-4">
                <StyleSelector
                  onSelect={onGeneratePrompt}
                  buttonText={
                    <button className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest hover:scale-105 transition-transform">
                      <Sparkles className="w-4 h-4" />
                      {t('common.generate_prompt')}
                    </button>
                  }
                />
              </div>
            )}

            {/* Completed State (Image View) */}
            {isCompleted && !isEditingPrompt && !isGenerating && (
              <div className="w-full animate-in fade-in slide-in-from-left-4 duration-500 flex justify-start">
                <div
                  className="relative w-full max-w-full rounded-xl overflow-hidden shadow-sm group/img cursor-zoom-in border border-slate-100 bg-[#F6F6F4]/50 flex items-center justify-center max-h-[320px]"
                  style={
                    paragraph.imageWidth && paragraph.imageHeight
                      ? { aspectRatio: `${paragraph.imageWidth} / ${paragraph.imageHeight}` }
                      : { aspectRatio: '1 / 1' }
                  }
                  onClick={onPreview}
                >
                  <img
                    src={paragraph.imageUrl}
                    alt="Result"
                    className="max-w-full max-h-full object-contain transition-transform duration-700 group-hover/img:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            )}

            {/* Error State */}
            {isError && !isEditingPrompt && (
              <div className="w-full flex flex-col items-start py-4 gap-3 text-red-400">
                <AlertCircle className="w-6 h-6" />
                <button onClick={() => setIsEditingPrompt(true)} className="text-[10px] font-bold uppercase tracking-widest hover:underline">
                  {t('common.retry')} / {t('common.edit_prompt')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Stack */}
        <div className="flex flex-col gap-4 items-start shrink-0 min-w-[140px] w-full sm:w-auto mt-4 sm:mt-0">
          {isGenerating ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-primary tracking-wider mt-1 animate-pulse">
              <span>{t('common.generating_status')}</span>
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          ) : isCompleted && !isEditingPrompt ? (
            <>
              {/* Status */}
              <div className="flex items-center gap-2 text-xs font-semibold text-[#E8622A] tracking-wider mb-1">
                <span>{t('common.generated_status')}</span>
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>

              {/* Actions List */}
              <div className="flex flex-wrap sm:flex-col gap-x-4 gap-y-2.5 sm:gap-3.5 items-center sm:items-start w-full">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 text-xs font-bold text-text/40 hover:text-primary transition-colors uppercase tracking-widest"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('common.download')}</span>
                </button>

                <button
                  onClick={() => onGenerateImage(editedPrompt, localSeed)}
                  className="flex items-center gap-2 text-xs font-bold text-text/40 hover:text-primary transition-colors uppercase tracking-widest"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('common.regenerate_image')}</span>
                </button>

                <button
                  onClick={() => setIsEditingPrompt(true)}
                  className="flex items-center gap-2 text-xs font-bold text-text/40 hover:text-primary transition-colors uppercase tracking-widest"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{t('common.edit_prompt')}</span>
                </button>

                <SeedInput className="mt-1" />
              </div>
            </>
          ) : (
            <button
              onClick={onDelete}
              className="p-2 text-text/10 hover:text-red-400 transition-colors ml-auto sm:ml-0"
              title={t('common.delete_paragraph')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParagraphCard;
