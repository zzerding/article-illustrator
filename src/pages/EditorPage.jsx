import React, { useState } from 'react';
import { AlertCircle, Sparkles } from 'lucide-react';
import ParagraphCard from '../components/ParagraphCard';
import { useAuth } from '../context/AuthContext';
import { CONFIG, STYLE_PROMPTS } from '../config';
import { useTranslation } from 'react-i18next';

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
    const userMessage = `
Convert the following article paragraph into an image generation prompt.
Requirements:
- English only, max 60 words
- No real person names or copyrighted characters
- Vivid, visual description suitable for Flux image model
- ${styleHint}

Paragraph:
"""${paragraphText}"""

Output ONLY the prompt, no explanation.
    `.trim();

    const res = await fetch(CONFIG.TEXT_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai',
        messages: [{ role: 'user', content: userMessage }],
        max_tokens: 120,
      }),
    });

    if (res.status === 401) {
      logout();
      throw new Error('UNAUTHORIZED');
    }
    if (res.status === 402) {
      throw new Error('INSUFFICIENT_POLLEN');
    }

    const data = await res.json();
    return data.choices[0].message.content.trim();
  };

  const illustrateParagraph = async (id, style) => {
    setParagraphs(prev => prev.map(p =>
      p.id === id ? { ...p, status: 'generating', style } : p
    ));

    try {
      const p = paragraphs.find(p => p.id === id);
      const textToProcess = p ? p.text : '';
      const prompt = await generateImagePrompt(textToProcess, style);
      
      const encoded = encodeURIComponent(prompt);
      const imageUrl = `${CONFIG.IMAGE_API}/${encoded}?model=flux&width=1024&height=576&nologo=true&token=${apiKey}`;

      setParagraphs(prev => prev.map(p =>
        p.id === id ? { ...p, status: 'completed', imageUrl, prompt, style } : p
      ));
    } catch (e) {
      console.error('Generation failed', e);
      if (e.message === 'INSUFFICIENT_POLLEN') {
        setError(t('common.error_insufficient_pollen'));
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
