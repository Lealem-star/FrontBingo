import React, { useState, useEffect } from 'react';
import Game from './pages/Game';
import CartelaSelection from './pages/CartelaSelection';
import Rules from './components/Rules';
import Scores from './pages/Scores';
import History from './pages/History';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import { AuthProvider } from './lib/auth/AuthProvider.jsx';
import { ToastProvider } from './contexts/ToastContext.jsx';
import AdminLayout from './admin/AdminLayout.jsx';

function App() {
  const [currentPage, setCurrentPage] = useState('game');
  const [selectedStake, setSelectedStake] = useState(null);
  const [selectedCartela, setSelectedCartela] = useState(null);
  const [isAdminApp, setIsAdminApp] = useState(false);

  // Handle query parameter routing for admin panel
  useEffect(() => {
    const checkAdminParam = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const isAdmin = urlParams.get('admin') === 'true';
      console.log('Admin parameter check:', isAdmin); // Debug log
      if (isAdmin) {
        setCurrentPage('admin');
      } else {
        setCurrentPage('game');
      }
    };

    // Check initial admin parameter
    checkAdminParam();

    // Listen for URL changes (including query parameter changes)
    const handleUrlChange = () => {
      checkAdminParam();
    };

    window.addEventListener('popstate', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);


  const handleStakeSelected = (stake) => {
    setSelectedStake(stake);
    setCurrentPage('cartela-selection');
  };

  const handleCartelaSelected = (cartela) => {
    setSelectedCartela(cartela);
    if (cartela === null) {
      // If cartela is null, also clear the stake to go back to stake selection
      setSelectedStake(null);
    }
    setCurrentPage('game');
  };

  const handleNavigate = (page) => {
    if (page === 'game' && currentPage === 'cartela-selection') {
      // When navigating back to game from cartela selection, clear the stake
      setSelectedStake(null);
    }
    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'game':
        return <Game onNavigate={handleNavigate} onStakeSelected={handleStakeSelected} selectedCartela={selectedCartela} selectedStake={selectedStake} />;
      case 'cartela-selection':
        return <CartelaSelection onNavigate={handleNavigate} stake={selectedStake} onCartelaSelected={handleCartelaSelected} />;
      case 'admin':
        return <AdminLayout onNavigate={handleNavigate} />;
      case 'rules':
        return <Rules onNavigate={handleNavigate} />;
      case 'scores':
        return <Scores onNavigate={handleNavigate} />;
      // history removed
      case 'wallet':
        return <Wallet onNavigate={handleNavigate} />;
      case 'profile':
        return <Profile onNavigate={handleNavigate} />;
      default:
        return <Game onNavigate={handleNavigate} onStakeSelected={handleStakeSelected} selectedCartela={selectedCartela} selectedStake={selectedStake} />;
    }
  };

  return (
    <AuthProvider>
      <ToastProvider>
        <div className="App">
          {renderPage()}
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
