import { Suspense, lazy, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import LandingPage from './pages/LandingPage';

const EditorPage = lazy(() => import('./pages/EditorPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));

const PageLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
  </div>
);

function AppContent() {
  const { apiKey, isLoading } = useAuth();
  const [view, setView] = useState('main'); // 'main' or 'about'

  if (isLoading) {
    return <PageLoadingFallback />;
  }

  const navigateTo = (newView) => {
    setView(newView);
    window.scrollTo(0, 0);
  };

  return (
    <MainLayout onNavigate={(v) => navigateTo(v)} currentView={view}>
      {view === 'about' ? (
        <Suspense fallback={<PageLoadingFallback />}>
          <AboutPage onBack={() => navigateTo('main')} />
        </Suspense>
      ) : !apiKey ? (
        <LandingPage />
      ) : (
        <Suspense fallback={<PageLoadingFallback />}>
          <EditorPage />
        </Suspense>
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
