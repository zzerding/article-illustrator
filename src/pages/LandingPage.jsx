import React from 'react';
import { ArrowRight, Image as ImageIcon, Wand2 } from 'lucide-react';

const LandingPage = ({ onStart }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-primary text-sm font-medium border border-orange-100 mb-8">
        <Wand2 className="w-4 h-4" />
        <span>Now in Public Beta</span>
      </div>
      
      <h1 className="text-5xl md:text-6xl font-serif font-bold tracking-tight text-slate-900 mb-6">
        Turn your articles into <br />
        <span className="italic text-primary">visual stories</span>
      </h1>
      
      <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
        Paste your article, and Pollen will intelligently break it down and generate contextually aware illustrations for every paragraph.
      </p>
      
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
        <button 
          onClick={onStart}
          className="px-8 py-4 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold text-lg flex items-center gap-2 shadow-lg shadow-orange-200 transition-all hover:-translate-y-0.5"
        >
          Start illustrating with Pollen
          <ArrowRight className="w-5 h-5" />
        </button>
        <button className="px-8 py-4 bg-white border border-border hover:border-slate-300 text-slate-700 rounded-xl font-semibold text-lg transition-all">
          View Examples
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
        <div className="p-6 bg-white rounded-2xl border border-border">
          <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center mb-4">
            <Wand2 className="text-primary w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg mb-2">Smart Analysis</h3>
          <p className="text-slate-600">Pollen understands the semantic meaning of each paragraph in your article.</p>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-border">
          <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center mb-4">
            <ImageIcon className="text-primary w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg mb-2">Style Control</h3>
          <p className="text-slate-600">Choose from watercolor, 3D render, minimalist, and many more artistic styles.</p>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-border">
          <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center mb-4">
            <ArrowRight className="text-primary w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg mb-2">Export Ready</h3>
          <p className="text-slate-600">Download your illustrated article or share it directly with a link.</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
