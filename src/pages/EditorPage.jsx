import { useEffect, useRef, useState } from 'react';
import { AlertCircle, HelpCircle, Sparkles, Wand2, Loader2, X, Download, Eye, Package } from 'lucide-react';
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

const distributeIntoBuckets = (items, bucketCount) => {
  if (!items.length || bucketCount <= 0) return [];

  const result = [];
  let cursor = 0;

  for (let index = 0; index < bucketCount; index += 1) {
    const remainingBuckets = bucketCount - index;
    const remainingItems = items.length - cursor;
    const take = index === bucketCount - 1
      ? remainingItems
      : Math.max(1, Math.ceil(remainingItems / remainingBuckets));

    const chunk = items.slice(cursor, cursor + take).join(' ').trim();
    if (chunk) {
      result.push(chunk);
    }
    cursor += take;
    if (cursor >= items.length) {
      break;
    }
  }

  return result;
};

const splitByPunctuation = (text) => {
  const normalized = normalizeText(text);
  const lines = normalized.split('\n');
  return lines
    .flatMap((line) =>
      line
        .match(/[^。！？!?；;,:，,.。\n]+[。！？!?；;,:，,.]?/g)
        ?.map((chunk) => chunk.replace(/\s+/g, ' ').trim())
    )
    .filter((chunk) => chunk.length >= 20);
};

const splitByCharQuotaWithPadding = (text, targetCount) => {
  if (targetCount <= 1) return [text];

  const nonWhitespaceChars = text.replace(/\s/g, '').length;
  const baseChunkSize = Math.floor(nonWhitespaceChars / targetCount);
  const remainder = nonWhitespaceChars % targetCount;
  const chunks = [];
  let cursor = 0;

  for (let i = 0; i < targetCount; i += 1) {
    const neededNonWhitespace = baseChunkSize + (i < remainder ? 1 : 0);
    if (i === targetCount - 1) {
      chunks.push(text.slice(cursor));
      break;
    }

    let nonWhitespaceCount = 0;
    let chunk = '';

    while (cursor < text.length && nonWhitespaceCount < neededNonWhitespace) {
      const ch = text[cursor];
      chunk += ch;
      if (!/\s/.test(ch)) nonWhitespaceCount += 1;
      cursor += 1;
    }

    while (cursor < text.length && /\s/.test(text[cursor])) {
      chunk += text[cursor];
      cursor += 1;
    }

    chunks.push(chunk);
  }

  return chunks;
};

const splitByIllustrationCount = (text, requestedCount) => {
  const baseCount = Number.isFinite(Number(requestedCount))
    ? Math.max(1, Math.min(Math.floor(requestedCount), MAX_PARAGRAPH_COUNT))
    : 1;
  const raw = normalizeText(text);
  if (!raw) return [];

  const safeMax = Math.max(1, Math.min(MAX_PARAGRAPH_COUNT, raw.replace(/\s/g, '').length || 1));
  const targetCount = Math.min(baseCount, safeMax);

  const rawParagraphs = extractRawParagraphs(raw);

  if (rawParagraphs.length >= targetCount) {
    return distributeIntoBuckets(rawParagraphs, targetCount);
  }

  const sentenceChunks = splitByPunctuation(raw);
  if (sentenceChunks.length >= targetCount) {
    return distributeIntoBuckets(sentenceChunks, targetCount);
  }

  const denseText = raw.replace(/\s+/g, ' ');
  const chunks = splitByCharQuotaWithPadding(denseText, targetCount);

  return chunks.map((chunk) => chunk.trim()).filter((chunk) => !!chunk);
};

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
  const [articleText, setArticleText] = useState('');
  const [illustrationCount, setIllustrationCount] = useState('3');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paragraphs, setParagraphs] = useState([]);
  const [error, setError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [showCombinedPreview, setShowCombinedPreview] = useState(false);
  const [isPackaging, setIsPackaging] = useState(false);

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

  const illustrationCountNumber = Number.isFinite(Number(illustrationCount))
    ? Number(illustrationCount)
    : 1;
  const sanitizedIllustrationCount = Math.max(1, Math.floor(illustrationCountNumber));

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

    // Initial split to check for short segments
    const rawParagraphs = articleText.split(/\n{2,}/).filter(p => p.trim());
    const tooShort = rawParagraphs.some(p => p.trim().length < 20);

    const splitResult = splitByIllustrationCount(
      articleText,
      sanitizedIllustrationCount
    );

    let finalChunks = splitResult;
    let isTruncated = false;

    if (finalChunks.length > MAX_PARAGRAPH_COUNT) {
      finalChunks = finalChunks.slice(0, MAX_PARAGRAPH_COUNT);
      isTruncated = true;
    }

    if (isTruncated) {
      setError(t('common.error_article_truncated'));
    } else if (tooShort) {
      // Show info message if some segments were filtered out
      // (Using error state for simplicity as there's no info state yet)
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
    setIsProcessing(false);
  };

  const generateImagePrompt = async (paragraphText, style, imageModel) => {
    const styleHint = STYLE_PROMPTS[style] ? `Style: ${STYLE_PROMPTS[style]}.` : '';
    const selectedTextModel = localStorage.getItem(STORAGE_KEYS.TEXT_MODEL) || CONFIG.DEFAULT_TEXT_MODEL;
    const selectedImageModel = imageModel || readImageGenerationSettings().model;

    const userMessage = `
Convert the following article paragraph into an image generation prompt.
Requirements:
- English only, max 60 words
- No real person names or copyrighted characters
- Vivid, visual description suitable for ${selectedImageModel} image model
- ${styleHint}

Paragraph:
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
      const prompt = await generateImagePrompt(targetParagraph.text, style, imageSettings.model);

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

  const generateImageForParagraph = async (id, customPrompt = null) => {
    const targetParagraph = paragraphs.find(p => p.id === id);
    if (!targetParagraph) return;

    const prompt = (customPrompt || targetParagraph.prompt || '').trim();
    if (!prompt) {
      const error = new Error('MISSING_PROMPT');
      setError(getGenerationErrorMessage(error, t));
      return;
    }

    const imageSettings = readImageGenerationSettings();

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

      const imageUrl = URL.createObjectURL(imageBlob);

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
    setParagraphs(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
      {error && (
        <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-2xl flex items-center justify-between border border-red-100 shadow-sm animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 transition-colors">✕</button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Left Column: Input (Sticky on Desktop) */}
        <div className="w-full lg:w-5/12 xl:w-4/12">
          <div className="lg:sticky lg:top-8 flex flex-col gap-6">
            <div className="bg-white/70 backdrop-blur-md border border-slate-200 rounded-3xl p-6 shadow-xl shadow-slate-200/50 focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/5 transition-all">
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-[10px] font-bold text-text/40 uppercase tracking-[0.2em]">{t('common.article_text')}</h2>
                  <Sparkles className="w-4 h-4 text-primary/40" />
                </div>

                <textarea
                  value={articleText}
                  onChange={(e) => setArticleText(e.target.value)}
                  placeholder={t('common.placeholder')}
                  className="w-full h-[300px] lg:h-[450px] bg-transparent border-none outline-none resize-none font-sans text-base text-text leading-relaxed placeholder:text-text/20 custom-scrollbar"
                />

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-text/40 uppercase tracking-widest block mb-1.5">
                        {t('common.illustration_count_label')}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={MAX_PARAGRAPH_COUNT}
                        value={illustrationCount}
                        onChange={(e) => setIllustrationCount(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 bg-white transition-all"
                      />
                    </div>

                    <button
                      onClick={handleParse}
                      disabled={isProcessing || !articleText.trim()}
                      className="mt-5 flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-95"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4" />
                      )}
                      {isProcessing ? t('common.loading') : t('common.parse_button')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Help/Tip section on desktop */}
            <div className="hidden lg:flex items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
              <HelpCircle className="w-5 h-5 text-text/30 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <p className="text-xs font-bold text-text/60 uppercase tracking-wider">How to use</p>
                <p className="text-xs text-text/40 leading-relaxed">
                  Paste your article content, choose how many illustrations you want, and hit parse. We will split the text into logical segments for you to illustrate individually.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Results (Scrollable) */}
        <div className="w-full lg:w-7/12 xl:w-8/12">
          {paragraphs.length > 0 ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-700">
              <div className="flex items-center justify-between mb-6 px-2">
                <h2 className="text-[10px] font-bold text-text/40 uppercase tracking-[0.2em]">{t('common.segments')}</h2>
                <div className="flex items-center gap-2">
                  {hasCompletedImages && (
                    <>
                      <button
                        onClick={() => setShowCombinedPreview(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-primary hover:text-white transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {t('common.preview_article')}
                      </button>
                      <button
                        onClick={handlePackageDownload}
                        disabled={isPackaging}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                      >
                        {isPackaging ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Package className="w-3.5 h-3.5" />
                        )}
                        {isPackaging ? t('common.package_preparing') : t('common.download_package')}
                      </button>
                    </>
                  )}
                  <span className="text-[10px] font-bold text-text/20 uppercase tracking-widest ml-2">
                    {paragraphs.length} {t('common.segments').toLowerCase()}
                  </span>
                </div>
              </div>

              <div className="space-y-8">
                {paragraphs.map((p, i) => (
                  <ParagraphCard
                    key={p.id}
                    paragraph={p}
                    index={i}
                    onGeneratePrompt={(style) => generatePromptForParagraph(p.id, style)}
                    onGenerateImage={(customPrompt) => generateImageForParagraph(p.id, customPrompt)}
                    onDelete={() => handleDelete(p.id)}
                    onPreview={() => setPreviewImage(p)}
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
