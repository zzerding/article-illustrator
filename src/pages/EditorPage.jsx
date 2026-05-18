import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import ParagraphCard from '../components/ParagraphCard';
import { useAuth } from '../context/AuthContext';
import { CONFIG, STYLE_PROMPTS } from '../config';
import { useTranslation } from 'react-i18next';

const POLLINATIONS_SAFE_FILTERS = 'privacy,secrets';

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

const EditorPage = () => {
  const { apiKey, logout } = useAuth();
  const { t } = useTranslation();
  const [articleText, setArticleText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paragraphs, setParagraphs] = useState([]);
  const [error, setError] = useState(null);

  const handleParse = () => {
    if (!articleText.trim()) return;
    setIsProcessing(true);

    // Split text into paragraphs as per design spec
    const rawParagraphs = articleText
      .split(/\n{2,}/)
      .map(p => p.replace(/\n/g, ' ').trim())
      .filter(p => p.length >= 20)
      .slice(0, 50);

    const initialParagraphs = rawParagraphs.map(text => ({
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

  const generateImagePrompt = async (paragraphText, style) => {
    const styleHint = STYLE_PROMPTS[style] ? `Style: ${STYLE_PROMPTS[style]}.` : '';
    const selectedTextModel = localStorage.getItem('pollen_text_model') || CONFIG.DEFAULT_TEXT_MODEL;
    const selectedImageModel = localStorage.getItem('pollen_image_model') || CONFIG.DEFAULT_IMAGE_MODEL;

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
        max_tokens: 150,
        response_format: { type: 'text' },
        // Pollinations documents safe as comma-separated filter names.
        safe: POLLINATIONS_SAFE_FILTERS,
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
    const selectedTextModel = localStorage.getItem('pollen_text_model') || CONFIG.DEFAULT_TEXT_MODEL;
    const selectedImageModel = localStorage.getItem('pollen_image_model') || CONFIG.DEFAULT_IMAGE_MODEL;

    setParagraphs(prev => prev.map(p =>
      p.id === id ? { ...p, status: 'generating', style } : p
    ));

    try {
      const p = paragraphs.find(p => p.id === id);
      const textToProcess = p ? p.text : '';
      const prompt = await generateImagePrompt(textToProcess, style);

      const res = await fetch(CONFIG.IMAGE_GENERATIONS_API, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model: selectedImageModel,
          size: '1024x576',
          response_format: 'url'
        })
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
        throw new Error('FAILED_IMAGE_GENERATION');
      }

      const data = await res.json();
      // Pollinations API returns { data: [{ url: '...' }] }
      const imageUrl = data.data?.[0]?.url || data[0]?.url;

      if (!imageUrl) throw new Error('NO_IMAGE_URL');

      setParagraphs(prev => prev.map(p =>
        p.id === id ? {
          ...p,
          status: 'completed',
          imageUrl,
          prompt,
          style,
          textModel: selectedTextModel,
          imageModel: selectedImageModel
        } : p
      ));
    } catch (e) {
      console.error('Generation failed', e);
      if (e.message === 'INSUFFICIENT_POLLEN') {
        setError(t('common.error_insufficient_pollen'));
      } else if (e.message === 'FORBIDDEN') {
        setError(t('common.error_forbidden'));
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
          <textarea
            value={articleText}
            onChange={(e) => setArticleText(e.target.value)}
            placeholder={t('common.placeholder')}
            className="w-full h-48 bg-transparent border-none outline-none resize-none font-sans text-lg text-text leading-relaxed placeholder:text-text/20"
          />
          <div className="flex justify-end mt-4">
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
