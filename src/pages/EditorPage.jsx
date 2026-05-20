import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, X, Download, Sparkles } from 'lucide-react';
import ParagraphCard from '../components/ParagraphCard';
import CombinedPreview from '../components/CombinedPreview';
import { useAuth } from '../context/AuthContext';
import { CONFIG, STORAGE_KEYS, STYLE_PROMPTS } from '../config';
import { readImageGenerationSettings } from '../imageSettings';
import { downloadPackage } from '../utils/packageDownload';
import { useTranslation } from 'react-i18next';

const MAX_PARAGRAPH_COUNT = 50;
const PROMPT_GENERATION_MAX_TOKENS = 800;
const PROMPT_REASONING_EFFORT = 'minimal';

const getDownloadExtension = (contentType) => {
  if (contentType?.includes('jpeg') || contentType?.includes('jpg')) return 'jpg';
  if (contentType?.includes('webp')) return 'webp';
  return 'png';
};

const isBlobUrl = (url) => typeof url === 'string' && url.startsWith('blob:');

const normalizeText = (text) => text.replace(/\r\n/g, '\n').trim();

const extractRawParagraphs = (text) =>
  normalizeText(text)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(p => p.length >= 20);

const textFromChatContent = (content) => {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === 'string') {
          return block;
        }

        if (!block || typeof block !== 'object') {
          return '';
        }

        if (typeof block.text === 'string') {
          return block.text;
        }

        if (typeof block.content === 'string') {
          return block.content;
        }

        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  return '';
};

const isPromptGenerationLengthLimited = (data, choice) => {
  const reasoningTokens = Number(data?.usage?.completion_tokens_details?.reasoning_tokens);

  return choice?.finish_reason === 'length' ||
    (Number.isFinite(reasoningTokens) && reasoningTokens >= PROMPT_GENERATION_MAX_TOKENS);
};

const extractPromptFromChatCompletion = (data) => {
  const choice = data?.choices?.[0];
  const message = choice?.message;
  const prompt = [
    textFromChatContent(message?.content),
    textFromChatContent(message?.content_blocks),
    textFromChatContent(choice?.text),
    textFromChatContent(data?.content),
  ].find((candidate) => candidate.trim());

  if (!prompt) {
    if (isPromptGenerationLengthLimited(data, choice)) {
      throw new Error('PROMPT_GENERATION_LENGTH_LIMIT');
    }
    throw new Error('FAILED_PROMPT_GENERATION');
  }

  let cleanedPrompt = prompt.trim().replace(/^["']|["']$/g, '');
  if (cleanedPrompt.toLowerCase().startsWith('prompt:')) {
    cleanedPrompt = cleanedPrompt.slice(7).trim();
  }

  if (!cleanedPrompt) {
    throw new Error('FAILED_PROMPT_GENERATION');
  }

  return cleanedPrompt;
};

const buildImageGenerationUrl = (prompt, settings) => {
  const url = new URL(`${CONFIG.IMAGE_GENERATE_API}/${encodeURIComponent(prompt)}`);
  url.searchParams.set('model', settings.model);
  url.searchParams.set('width', String(settings.width));
  url.searchParams.set('height', String(settings.height));
  url.searchParams.set('seed', String(settings.seed));
  url.searchParams.set('enhance', String(settings.enhance));

  if (settings.referenceImage?.url) {
    url.searchParams.set('image', settings.referenceImage.url);
  }

  return url.toString();
};

const getGenerationErrorMessage = (error, t) => {
  if (error.message === 'INSUFFICIENT_POLLEN') {
    return t('common.error_insufficient_pollen');
  }
  if (error.message === 'FORBIDDEN') {
    return t('common.error_forbidden');
  }
  if (error.message === 'PROMPT_GENERATION_LENGTH_LIMIT') {
    return t('common.error_prompt_length_limit');
  }
  if (error.message === 'FILE_TOO_LARGE') {
    return t('common.upload_file_too_large');
  }
  if (error.message === 'MISSING_PROMPT') {
    return t('common.error_missing_prompt');
  }
  if (error.message === 'UNAUTHORIZED') {
    return null;
  }

  return t('common.error_failed_generation');
};

const EditorPage = () => {
  const { apiKey, logout } = useAuth();
  const { t } = useTranslation();
  const activeBlobUrlsRef = useRef(new Set());
  const [articleText, setArticleText] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.ARTICLE_TEXT) || '';
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [paragraphs, setParagraphs] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PARAGRAPHS);
      if (saved) {
        const list = JSON.parse(saved);
        return list.map(p => {
          if (p.status === 'generating') {
            return { ...p, status: 'prompted' };
          }
          if (p.status === 'prompting') {
            return { ...p, status: 'idle' };
          }
          return p;
        });
      }
      return [];
    } catch (e) {
      console.error('Error loading paragraphs from localStorage', e);
      return [];
    }
  });
  const [error, setError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [showCombinedPreview, setShowCombinedPreview] = useState(false);
  const [isPackaging, setIsPackaging] = useState(false);
  const [selectedId, setSelectedId] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PARAGRAPHS);
      const list = saved ? JSON.parse(saved) : [];
      return list.length > 0 ? list[0].id : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ARTICLE_TEXT, articleText);
  }, [articleText]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PARAGRAPHS, JSON.stringify(paragraphs));
  }, [paragraphs]);

  const articleTitle = paragraphs.length > 0
    ? paragraphs[0].text.replace(/[“”""'']/g, '').slice(0, 60).trim() + (paragraphs[0].text.length > 60 ? '…' : '')
    : t('common.article_text');

  const hasCompletedImages = paragraphs.some(p => p.status === 'completed' && p.imageUrl);

  useEffect(() => {
    if (previewImage || showCombinedPreview) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [previewImage, showCombinedPreview]);

  const handlePackageDownload = async () => {
    if (isPackaging) return;
    setIsPackaging(true);
    try {
      await downloadPackage(paragraphs, articleTitle);
    } catch (e) {
      console.error('Package download failed', e);
    } finally {
      setIsPackaging(false);
    }
  };

  useEffect(() => {
    const currentBlobUrls = new Set(
      paragraphs
        .map((paragraph) => paragraph.imageUrl)
        .filter(isBlobUrl)
    );

    activeBlobUrlsRef.current.forEach((url) => {
      if (!currentBlobUrls.has(url)) {
        URL.revokeObjectURL(url);
      }
    });

    activeBlobUrlsRef.current = currentBlobUrls;
  }, [paragraphs]);

  useEffect(() => {
    return () => {
      activeBlobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      activeBlobUrlsRef.current.clear();
    };
  }, []);

  const handleParse = () => {
    if (!articleText.trim()) return;
    setIsProcessing(true);
    setError(null);

    const naturalChunks = extractRawParagraphs(articleText);
    const tooShort = articleText.split(/\n{2,}/).some(p => p.trim() && p.trim().length < 20);

    let finalChunks = naturalChunks;
    let isTruncated = false;

    if (finalChunks.length > MAX_PARAGRAPH_COUNT) {
      finalChunks = finalChunks.slice(0, MAX_PARAGRAPH_COUNT);
      isTruncated = true;
    }

    if (isTruncated) {
      setError(t('common.error_article_truncated'));
    } else if (tooShort) {
      setError(t('common.error_segment_too_short'));
    }

    const initialParagraphs = finalChunks.map((text) => ({
      id: crypto.randomUUID(),
      text,
      status: 'idle',
      imageUrl: null,
      prompt: null,
      style: 'illustration' // Default style from design.md
    }));

    setParagraphs(initialParagraphs);
    if (initialParagraphs.length > 0) {
      setSelectedId(initialParagraphs[0].id);
    }
    setIsProcessing(false);
  };

  const generateImagePrompt = async (paragraphText, style, imageModel, articleContext = '') => {
    const styleHint = STYLE_PROMPTS[style] ? `Style: ${STYLE_PROMPTS[style]}.` : '';
    const selectedTextModel = localStorage.getItem(STORAGE_KEYS.TEXT_MODEL) || CONFIG.DEFAULT_TEXT_MODEL;
    const selectedImageModel = imageModel || readImageGenerationSettings().model;

    const contextSection = articleContext 
      ? `Background Context of the Article:\n"""\n${articleContext.slice(0, 1000)}${articleContext.length > 1000 ? '...' : ''}\n"""\n`
      : '';

    const userMessage = `
${contextSection}
Task: Convert the following specific paragraph from the article above into a vivid image generation prompt.
Requirements:
- English only, max 60 words
- Focus on the visual elements of the paragraph while respecting the overall article context
- No real person names or copyrighted characters
- Vivid, visual description suitable for ${selectedImageModel} image model
- ${styleHint}

Paragraph to illustrate:
"""${paragraphText}"""

Output ONLY the prompt, no explanation.
    `.trim();

    const res = await fetch(CONFIG.CHAT_COMPLETIONS_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedTextModel,
        messages: [{ role: 'user', content: userMessage }],
        max_tokens: PROMPT_GENERATION_MAX_TOKENS,
        reasoning_effort: PROMPT_REASONING_EFFORT,
        // Intentionally avoid `safe` here; that filter can cause false-positive refusals for prompt generation.
        response_format: { type: 'text' },
      }),
    });

    if (res.status === 401) {
      logout();
      throw new Error('UNAUTHORIZED');
    }
    if (res.status === 402) {
      throw new Error('INSUFFICIENT_POLLEN');
    }
    if (res.status === 403) {
      throw new Error('FORBIDDEN');
    }

    if (!res.ok) {
      throw new Error('FAILED_PROMPT_GENERATION');
    }

    const data = await res.json();
    return extractPromptFromChatCompletion(data);
  };

  const generatePromptForParagraph = async (id, style) => {
    const targetParagraph = paragraphs.find(p => p.id === id);
    if (!targetParagraph) return;

    setSelectedId(id);
    const selectedTextModel = localStorage.getItem(STORAGE_KEYS.TEXT_MODEL) || CONFIG.DEFAULT_TEXT_MODEL;
    const imageSettings = readImageGenerationSettings();

    setParagraphs(prev => prev.map(p =>
      p.id === id ? {
        ...p,
        status: 'prompting',
        style,
        imageUrl: null,
        prompt: null,
        textModel: selectedTextModel,
        imageModel: imageSettings.model
      } : p
    ));

    try {
      const prompt = await generateImagePrompt(targetParagraph.text, style, imageSettings.model, articleText);

      setParagraphs(prev => prev.map(p =>
        p.id === id ? {
          ...p,
          status: 'prompted',
          prompt,
          style,
          textModel: selectedTextModel,
          imageModel: imageSettings.model
        } : p
      ));
    } catch (e) {
      console.error('Prompt generation failed', e);
      const message = getGenerationErrorMessage(e, t);
      if (message) setError(message);

      setParagraphs(prev => prev.map(p =>
        p.id === id ? { ...p, status: 'error' } : p
      ));
    }
  };

  const generateImageForParagraph = async (id, customPrompt = null, customSeed = null) => {
    const targetParagraph = paragraphs.find(p => p.id === id);
    if (!targetParagraph) return;

    setSelectedId(id);
    const prompt = (customPrompt || targetParagraph.prompt || '').trim();
    if (!prompt) {
      const error = new Error('MISSING_PROMPT');
      setError(getGenerationErrorMessage(error, t));
      return;
    }

    const imageSettings = readImageGenerationSettings();
    if (customSeed !== null && customSeed !== undefined && String(customSeed).trim() !== '') {
      imageSettings.seed = Number(customSeed);
    }

    setParagraphs(prev => prev.map(p =>
      p.id === id ? {
        ...p,
        status: 'generating',
        prompt,
        imageUrl: null,
        imageModel: imageSettings.model
      } : p
    ));

    try {
      const imageRequestUrl = buildImageGenerationUrl(prompt, imageSettings);

      const res = await fetch(imageRequestUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (res.status === 401) {
        logout();
        throw new Error('UNAUTHORIZED');
      }
      if (res.status === 402) {
        throw new Error('INSUFFICIENT_POLLEN');
      }
      if (res.status === 403) {
        throw new Error('FORBIDDEN');
      }
      if (res.status === 413) {
        throw new Error('FILE_TOO_LARGE');
      }
      if (!res.ok) {
        throw new Error('FAILED_IMAGE_GENERATION');
      }

      const imageBlob = await res.blob();
      if (imageBlob.type && !imageBlob.type.startsWith('image/')) {
        throw new Error('FAILED_IMAGE_GENERATION');
      }

      const imageUrl = imageRequestUrl;

      setParagraphs(prev => prev.map(p =>
        p.id === id ? {
          ...p,
          status: 'completed',
          imageUrl,
          prompt,
          imageModel: imageSettings.model,
          imageWidth: imageSettings.width,
          imageHeight: imageSettings.height,
          imageSeed: imageSettings.seed,
          imageEnhance: imageSettings.enhance,
          referenceImageUrl: imageSettings.referenceImage?.url || null,
          imageContentType: imageBlob.type || null
        } : p
      ));
    } catch (e) {
      console.error('Image generation failed', e);
      const message = getGenerationErrorMessage(e, t);
      if (message) setError(message);

      setParagraphs(prev => prev.map(p =>
        p.id === id ? { ...p, status: 'error' } : p
      ));
    }
  };

  const handleDelete = (id) => {
    setParagraphs(prev => {
      const nextParagraphs = prev.filter(p => p.id !== id);
      if (selectedId === id) {
        if (nextParagraphs.length > 0) {
          const currentIndex = prev.findIndex(p => p.id === id);
          const nextIndex = Math.min(currentIndex, nextParagraphs.length - 1);
          setSelectedId(nextParagraphs[nextIndex].id);
        } else {
          setSelectedId(null);
        }
      }
      return nextParagraphs;
    });
  };

  const handleUpdateParagraphText = (id, newText) => {
    setParagraphs(prev => prev.map(p => p.id === id ? { ...p, text: newText } : p));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-24">
      {error && (
        <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-2xl flex items-center justify-between border border-red-100 shadow-sm animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 transition-colors">✕</button>
        </div>
      )}

      <div className="flex flex-col gap-12">
        {/* Top: Input Section */}
        <div className="w-full max-w-5xl mx-auto">
          <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm focus-within:ring-1 focus-within:ring-primary/20 transition-all">
            <div className="flex flex-col gap-2">
              <textarea
                value={articleText}
                onChange={(e) => setArticleText(e.target.value)}
                placeholder={t('common.placeholder')}
                className="w-full h-[200px] lg:h-[250px] bg-transparent border-none outline-none resize-none font-sans text-base text-text/80 leading-relaxed placeholder:text-text/20 custom-scrollbar"
              />

              <div className="flex justify-end pt-4">
                <button
                  onClick={handleParse}
                  disabled={isProcessing || !articleText.trim()}
                  className="group relative flex items-center gap-2 text-primary font-bold text-sm disabled:text-slate-300 disabled:cursor-not-allowed transition-all"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>{t('common.parse_button')}</span>
                  )}
                  <span className="absolute -bottom-1 left-0 w-full h-px bg-primary scale-x-100 group-hover:scale-x-110 transition-transform origin-right" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Results Section */}
        <div className="w-full">
          {paragraphs.length > 0 ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Mobile Actions Bar - Shown only on screens below lg when there are completed images */}
              {hasCompletedImages && (
                <div className="lg:hidden flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6 animate-in fade-in duration-300">
                  <span className="text-xs font-bold text-text/60 uppercase tracking-wider">
                    {t('common.article_actions') || 'Article Actions'}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowCombinedPreview(true)}
                      className="text-xs font-bold bg-white text-primary border border-slate-200 rounded-xl px-4 py-2 hover:bg-slate-100 transition-all shadow-sm"
                    >
                      {t('common.preview_article')}
                    </button>
                    <button
                      onClick={handlePackageDownload}
                      disabled={isPackaging}
                      className="text-xs font-bold bg-primary text-white rounded-xl px-4 py-2 hover:opacity-95 transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isPackaging ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                          <span>{t('common.package_preparing')}</span>
                        </>
                      ) : (
                        <span>{t('common.download_package')}</span>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Table Headers - Hidden on mobile, shown on lg screens */}
              <div className="hidden lg:grid grid-cols-[4fr_6fr] gap-0 mb-4 px-4 sticky top-20 z-10 bg-background/95 backdrop-blur-md border-b border-slate-200/40 py-3">
                <div className="pr-8 border-r border-slate-200/60 flex items-center">
                  <h2 className="text-sm font-bold text-text/60 tracking-wider">
                    {t('common.paragraph')}
                  </h2>
                </div>
                <div className="pl-8 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-text/60 tracking-wider">
                    {t('common.illustration')}
                  </h2>
                  <div className="flex items-center justify-end gap-4 h-full">
                    {hasCompletedImages && (
                      <>
                        <button
                          onClick={() => setShowCombinedPreview(true)}
                          className="text-[10px] font-bold text-primary uppercase tracking-wider hover:opacity-80 transition-all"
                        >
                          {t('common.preview_article')}
                        </button>
                        <button
                          onClick={handlePackageDownload}
                          disabled={isPackaging}
                          className="text-[10px] font-bold text-primary uppercase tracking-wider hover:opacity-80 transition-all disabled:opacity-50"
                        >
                          {isPackaging ? t('common.package_preparing') : t('common.download_package')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col">
                {paragraphs.map((p, i) => (
                  <ParagraphCard
                    key={p.id}
                    paragraph={p}
                    index={i}
                    isSelected={selectedId === p.id}
                    onSelect={setSelectedId}
                    onGeneratePrompt={(style) => generatePromptForParagraph(p.id, style)}
                    onGenerateImage={(customPrompt, customSeed) => generateImageForParagraph(p.id, customPrompt, customSeed)}
                    onDelete={() => handleDelete(p.id)}
                    onPreview={() => setPreviewImage(p)}
                    onUpdateText={handleUpdateParagraphText}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 lg:py-0 min-h-[400px]">
              <div className="p-8 rounded-full bg-slate-50 mb-6 group hover:scale-110 transition-transform duration-500">
                <Sparkles className="w-12 h-12 text-text/10 group-hover:text-primary/20 transition-colors" />
              </div>
              <h3 className="text-xl font-serif italic text-text/40 mb-2">{t('common.empty_state')}</h3>
              <p className="text-sm text-text/20 max-w-xs text-center leading-relaxed">
                Paste your text in the left panel to begin your creative journey.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Combined Article Preview Modal */}
      {showCombinedPreview && (
        <CombinedPreview
          paragraphs={paragraphs}
          title={articleTitle}
          onClose={() => setShowCombinedPreview(false)}
        />
      )}

      {/* Large Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-text/90 backdrop-blur-md animate-in fade-in duration-300">
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all z-[60]"
            title={t('common.close')}
          >
            <X className="w-6 h-6" />
          </button>

          <div
            className="absolute inset-0"
            onClick={() => setPreviewImage(null)}
          />

          <div className="relative max-w-5xl w-full max-h-full flex flex-col gap-6 animate-in zoom-in-95 duration-300 pointer-events-none">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 pointer-events-auto">
              <img
                src={previewImage.imageUrl}
                alt="Large preview"
                className="w-full h-auto max-h-[80vh] object-contain mx-auto"
              />
            </div>

            <div className="flex items-center justify-between px-4 pointer-events-auto">
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
                  {previewImage.imageModel} · {previewImage.imageWidth}x{previewImage.imageHeight}
                </p>
                <p className="text-sm text-white/80 line-clamp-1 max-w-2xl italic font-serif">
                  "{previewImage.prompt}"
                </p>
              </div>

              <button
                onClick={async () => {
                  try {
                    const response = await fetch(previewImage.imageUrl);
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    const index = paragraphs.findIndex(p => p.id === previewImage.id);
                    link.download = `illustration-${index + 1}.${getDownloadExtension(previewImage.imageContentType || blob.type)}`;
                    link.click();
                    URL.revokeObjectURL(url);
                  } catch {
                    window.open(previewImage.imageUrl, '_blank');
                  }
                }}
                className="flex items-center gap-2 px-6 py-3 bg-white text-primary rounded-xl font-bold text-sm hover:bg-white/90 transition-all shadow-xl"
              >
                <Download className="w-4 h-4" />
                {t('common.download')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorPage;
