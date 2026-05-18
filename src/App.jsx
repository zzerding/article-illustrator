import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import LandingPage from './pages/LandingPage';
import EditorPage from './pages/EditorPage';
import AboutPage from './pages/AboutPage';

function AppContent() {
  const { apiKey, isLoading } = useAuth();
  const [view, setView] = useState('main'); // 'main' or 'about'

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const navigateTo = (newView) => {
    setView(newView);
    window.scrollTo(0, 0);
  };

  return (
    <MainLayout onNavigate={(v) => navigateTo(v)} currentView={view}>
      {view === 'about' ? (
        <AboutPage onBack={() => navigateTo('main')} />
      ) : !apiKey ? (
        <LandingPage />
      ) : (
        <EditorPage />
      )}
    </MainLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
