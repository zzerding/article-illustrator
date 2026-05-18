import React from 'react';
import { User } from 'lucide-react';

const MainLayout = ({ children, onBackToLanding }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={onBackToLanding}
          >
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-bold">P</span>
            </div>
            <span className="font-serif text-xl font-bold tracking-tight">Pollen</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Docs
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-border">
              <User className="w-4 h-4 text-slate-600" />
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
