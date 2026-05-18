import React from 'react';
import { Loader2, RefreshCw, Download, Trash2 } from 'lucide-react';

const ParagraphCard = ({ paragraph, index, onRegenerate, onDelete }) => {
  const isGenerating = paragraph.status === 'generating';
  const isCompleted = paragraph.status === 'completed';

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
    <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row">
        {/* Image Section */}
        <div className="w-full md:w-48 h-48 bg-slate-50 flex-shrink-0 border-b md:border-b-0 md:border-r border-border relative">
          {isGenerating ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-xs font-medium text-slate-500">Generating illustration...</p>
            </div>
          ) : isCompleted ? (
            <img 
              src={paragraph.imageUrl} 
              alt="Generated illustration"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <span className="text-slate-400 font-bold text-xl">?</span>
              </div>
              <p className="text-xs font-medium text-slate-400">Ready to illustrate</p>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 p-6 flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Paragraph {index + 1}</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={onRegenerate}
                className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                title="Regenerate"
              >
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              </button>
              <button 
                onClick={onDelete}
                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <p className="text-slate-700 leading-relaxed line-clamp-4 flex-1">
            {paragraph.text}
          </p>

          <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-50">
            <div className="flex items-center gap-2">
              {isCompleted && (
                <button 
                  onClick={handleDownload}
                  className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              )}
            </div>
            <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
              isCompleted ? 'bg-green-50 text-green-600' : 
              isGenerating ? 'bg-orange-50 text-primary' : 'bg-slate-50 text-slate-500'
            }`}>
              {paragraph.status}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParagraphCard;
