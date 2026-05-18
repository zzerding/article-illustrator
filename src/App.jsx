import React, { useState } from 'react';
import MainLayout from './layouts/MainLayout';
import LandingPage from './pages/LandingPage';
import EditorPage from './pages/EditorPage';

function App() {
  const [view, setView] = useState('landing'); // 'landing' or 'editor'

  return (
    <MainLayout onBackToLanding={() => setView('landing')}>
      {view === 'landing' ? (
        <LandingPage onStart={() => setView('editor')} />
      ) : (
        <EditorPage />
      )}
    </MainLayout>
  );
}

export default App;
