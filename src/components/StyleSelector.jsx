import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const styles = [
  { id: 'watercolor', name: 'Watercolor', description: 'Soft, artistic painted look' },
  { id: '3d-render', name: '3D Render', description: 'Modern, glossy 3D characters' },
  { id: 'minimalist', name: 'Minimalist', description: 'Clean lines, limited palette' },
  { id: 'pixel-art', name: 'Pixel Art', description: 'Retro 8-bit aesthetic' },
  { id: 'cinematic', name: 'Cinematic', description: 'High contrast, dramatic lighting' },
];

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const StyleSelector = ({ selectedStyleId, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedStyle = styles.find(s => s.id === selectedStyleId) || styles[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex items-center justify-between w-full px-4 py-3 bg-white border border-border rounded-xl hover:border-slate-300 transition-all text-left"
      >
        <div>
          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Illustration Style</span>
          <span className="block font-medium text-slate-900">{selectedStyle.name}</span>
        </div>
        <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-xl shadow-xl z-20 overflow-hidden">
            <div className="p-1" role="listbox">
              {styles.map((style) => (
                <button
                  key={style.id}
                  role="option"
                  aria-selected={selectedStyleId === style.id}
                  onClick={() => {
                    onSelect(style.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors",
                    selectedStyleId === style.id ? "bg-orange-50 text-primary" : "hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <div>
                    <span className="block font-medium">{style.name}</span>
                    <span className="block text-xs text-slate-500">{style.description}</span>
                  </div>
                  {selectedStyleId === style.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StyleSelector;
