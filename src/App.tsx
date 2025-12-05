import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import Dashboard from './components/Dashboard';
import { useAuthStore } from './stores/authStore';

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  console.log('[AppRoutes] Rendering with isAuthenticated:', isAuthenticated);

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
      />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  // Initialize auth on mount
  useEffect(() => {
    console.log('[App] Initializing auth from localStorage...');
    useAuthStore.getState().initializeAuth();
    console.log('[App] Auth initialization complete');
  }, []);

  try {
    return (
      <Router>
        <AppRoutes />
      </Router>
    );
  } catch (error) {
    console.error('App Error:', error);
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>Error Loading Application</h1>
        <p>Check browser console for details</p>
        <pre>{String(error)}</pre>
      </div>
    );
  }
}

export default App;
