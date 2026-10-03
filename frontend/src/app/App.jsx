import React, { useEffect, Suspense } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './app.routes.jsx';
import useAuth from '../features/auth/hook/useAuth.js';
import { ToastProvider } from '../shared/context/ToastContext.jsx';
import ToastContainer from '../shared/components/ToastContainer.jsx';
import ConfirmModal from '../shared/components/ConfirmModal.jsx';
import RouteLoader from '../shared/components/RouteLoader.jsx';

function App() {
  const { fetchCurrentUser } = useAuth();

  useEffect(() => {
    fetchCurrentUser();

    // Auto-resync session when user refocuses tab
    const handleFocus = () => {
      fetchCurrentUser();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchCurrentUser]);

  return (
    <ToastProvider>
      <Suspense fallback={<RouteLoader fullScreen message="Loading Court & Ledger..." />}>
        <RouterProvider router={router} />
      </Suspense>
      <ToastContainer />
      <ConfirmModal />
    </ToastProvider>
  );
}

export default App;
