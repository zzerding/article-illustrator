import { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import ParagraphCard from '../components/ParagraphCard';
import { useAuth } from '../context/AuthContext';
import { CONFIG, STORAGE_KEYS, STYLE_PROMPTS } from '../config';
import { readImageGenerationSettings } from '../imageSettings';
import { useTranslation } from 'react-i18next';

const MAX_PARAGRAPH_COUNT = 50;
const PROMPT_GENERATION_MAX_TOKENS = 800;
const PROMPT_REASONING_EFFORT = 'minimal';

const isBlobUrl = (url) => typeof url === 'string' && url.startsWith('blob:');

const normalizeText = (text) => text.replace(/\r\n/g, '\n').trim();

const extractRawParagraphs = (text) =>
  normalizeText(text)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

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
    .filter((chunk) => !!chunk);
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

const EditorPage = () => {
  const { apiKey, logout } = useAuth();
  const { t } = useTranslation();
  const activeBlobUrlsRef = useRef(new Set());
  const [articleText, setArticleText] = useState('');
  const [illustrationCount, setIllustrationCount] = useState('3');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paragraphs, setParagraphs] = useState([]);
  const [error, setError] = useState(null);
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

    const splitResult = splitByIllustrationCount(
      articleText,
      sanitizedIllustrationCount
    );
    const initialParagraphs = splitResult.map((text) => ({
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

  const illustrateParagraph = async (id, style) => {
    const targetParagraph = paragraphs.find(p => p.id === id);
    if (!targetParagraph) return;

    const selectedTextModel = localStorage.getItem(STORAGE_KEYS.TEXT_MODEL) || CONFIG.DEFAULT_TEXT_MODEL;
    const imageSettings = readImageGenerationSettings();

    setParagraphs(prev => prev.map(p =>
      p.id === id ? { ...p, status: 'generating', style } : p
    ));

    try {
      const prompt = await generateImagePrompt(targetParagraph.text, style, imageSettings.model);
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
          style,
          textModel: selectedTextModel,
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
      console.error('Generation failed', e);
      if (e.message === 'INSUFFICIENT_POLLEN') {
        setError(t('common.error_insufficient_pollen'));
      } else if (e.message === 'FORBIDDEN') {
        setError(t('common.error_forbidden'));
      } else if (e.message === 'PROMPT_GENERATION_LENGTH_LIMIT') {
        setError(t('common.error_prompt_length_limit'));
      } else if (e.message === 'FILE_TOO_LARGE') {
        setError(t('common.upload_file_too_large'));
      } else if (e.message !== 'UNAUTHORIZED') {
        setError(t('common.error_failed_generation'));
      }

      setParagraphs(prev => prev.map(p =>
        p.id === id ? { ...p, status: 'error' } : p
      ));
    }
  };

  const handleDelete = (id) => {
    setParagraphs(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto px-6 pb-24">
      {error && (
        <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Input Section */}
      <div className="mb-12">
        <div className="bg-white/50 border border-slate-200 rounded-2xl p-6 focus-within:border-primary/30 transition-colors">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6 mb-4">
            <textarea
              value={articleText}
              onChange={(e) => setArticleText(e.target.value)}
              placeholder={t('common.placeholder')}
              className="w-full h-48 bg-transparent border-none outline-none resize-none font-sans text-lg text-text leading-relaxed placeholder:text-text/20"
            />
            <div className="sm:w-36">
              <label className="text-[10px] font-bold text-text/40 uppercase tracking-wider">
                {t('common.illustration_count_label')}
              </label>
              <input
                type="number"
                min={1}
                max={MAX_PARAGRAPH_COUNT}
                value={illustrationCount}
                onChange={(e) => setIllustrationCount(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 bg-white"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleParse}
              disabled={isProcessing || !articleText.trim()}
              className="text-primary font-semibold hover:text-primary-hover transition-colors flex items-center gap-2 group relative"
            >
              {isProcessing ? t('common.loading') : t('common.parse_button')}
              <div className="h-px w-0 group-hover:w-full bg-primary transition-all duration-300 absolute -bottom-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {paragraphs.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="grid grid-cols-12 gap-8 mb-8 pb-4 border-b border-text/5 text-sm font-bold text-text/40 tracking-wider">
            <div className="col-span-1">{t('common.paragraph')}</div>
            <div className="col-span-6 lg:col-span-7">{t('common.content')}</div>
            <div className="col-span-5 lg:col-span-4">{t('common.illustration')}</div>
          </div>

          <div className="space-y-12">
            {paragraphs.map((p, i) => (
              <ParagraphCard
                key={p.id}
                paragraph={p}
                index={i}
                onIllustrate={(style) => illustrateParagraph(p.id, style)}
                onDelete={() => handleDelete(p.id)}
              />
            ))}
          </div>
        </div>
      )}

      {paragraphs.length === 0 && !isProcessing && (
        <div className="py-32 text-center opacity-20">
          <p className="text-xl font-serif italic">{t('common.empty_state')}</p>
        </div>
      )}
    </div>
  );
};

export default EditorPage;
