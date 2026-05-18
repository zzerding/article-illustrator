import React, { useState } from 'react';
import { Image as ImageIcon, Sparkles, LayoutGrid, List } from 'lucide-react';
import StyleSelector from '../components/StyleSelector';
import ParagraphCard from '../components/ParagraphCard';

const EditorPage = () => {
  const [articleText, setArticleText] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('watercolor');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paragraphs, setParagraphs] = useState([]);

  const handleProcess = () => {
    if (!articleText.trim()) return;
    setIsProcessing(true);
    
    // Split text into paragraphs (filtered for non-empty)
    const rawParagraphs = articleText
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const initialParagraphs = rawParagraphs.map(text => ({
      id: crypto.randomUUID(),
      text,
      status: 'idle',
      imageUrl: null
    }));

    setParagraphs(initialParagraphs);
    setIsProcessing(false);

    // Auto-trigger generation for all paragraphs
    initialParagraphs.forEach(p => {
      generateImage(p.id, initialParagraphs);
    });
  };

  const generateImage = (id, currentParagraphs) => {
    setParagraphs(prev => prev.map(p =>
      p.id === id ? { ...p, status: 'generating' } : p
    ));

    const p = currentParagraphs ? currentParagraphs.find(p => p.id === id) : paragraphs.find(p => p.id === id);
    const prompt = encodeURIComponent(`${p.text} | ${selectedStyle} style`);
    const imageUrl = `https://pollinations.ai/p/${prompt}?width=1024&height=1024&seed=${Math.floor(Math.random() * 1000000)}`;

    // In a real app we might want to pre-fetch/validate,
    // but Pollinations is a direct image URL service.
    // We'll simulate a small delay for "AI generation" feel
    setTimeout(() => {
      setParagraphs(prev => prev.map(p =>
        p.id === id ? { ...p, status: 'completed', imageUrl } : p
      ));
    }, 1500 + Math.random() * 2000);
  };

  const handleRegenerate = (id) => {
    generateImage(id);
  };

  const handleDelete = (id) => {
    setParagraphs(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Input */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm sticky top-24">
            <h2 className="text-xl font-serif font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Article Content
            </h2>
            
            <textarea
              value={articleText}
              onChange={(e) => setArticleText(e.target.value)}
              placeholder="Paste your article here..."
              className="w-full h-80 p-4 border border-border rounded-xl focus:ring-2 focus:ring-orange-100 focus:border-primary outline-none transition-all resize-none mb-4 font-sans text-slate-700 leading-relaxed"
            />

            <div className="space-y-4">
              <StyleSelector 
                selectedStyleId={selectedStyle}
                onSelect={setSelectedStyle}
              />

              <button
                onClick={handleProcess}
                disabled={isProcessing || !articleText.trim()}
                className="w-full py-4 bg-primary hover:bg-primary-hover disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-100 transition-all active:scale-[0.98]"
              >
                {isProcessing ? (
                  <>
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    Analyzing Article...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5" />
                    Generate Illustrations
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Results */}
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-serif font-bold">Illustrated Paragraphs</h2>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button className="p-1.5 bg-white shadow-sm rounded-md text-slate-900">
                <List className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-slate-500 hover:text-slate-700">
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {paragraphs.map((p, i) => (
              <ParagraphCard
                key={p.id}
                paragraph={p}
                index={i}
                onRegenerate={() => handleRegenerate(p.id)}
                onDelete={() => handleDelete(p.id)}
              />
            ))}
            
            {paragraphs.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ImageIcon className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="font-bold text-slate-400">No illustrations yet</h3>
                <p className="text-sm text-slate-400">Paste an article to begin</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorPage;
