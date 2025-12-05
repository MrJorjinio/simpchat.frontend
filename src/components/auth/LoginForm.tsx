import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../stores/authStore';
import { Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginForm = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuth();
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      console.log('[LoginForm] Starting login...');
      await login({ credential, password });

      // Verify state was updated in the store
      const state = useAuthStore.getState();
      console.log('[LoginForm] Login successful. Auth state:', {
        hasToken: !!state.token,
        hasUser: !!state.user,
        isLoading: state.isLoading,
      });

      if (state.token && state.user) {
        console.log('[LoginForm] Auth state verified, navigating to dashboard...');
        navigate('/dashboard');
      } else {
        console.error('[LoginForm] Login completed but auth state not set!');
      }
    } catch (err) {
      console.error('[LoginForm] Login error:', err);
      // Error is handled by the store
    }
  };

  return (
    <div style={{ minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: 'var(--background)' }}>
      <div style={{ width: '100%', maxWidth: '400px', minWidth: 0 }}>
        {/* Header */}
        <div style={{ marginBottom: '36px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '14px', background: 'linear-gradient(135deg, #0066ff 0%, #0052cc 100%)', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0, 102, 255, 0.15)' }}>
            <span style={{ fontSize: '28px' }}>💬</span>
          </div>
          <h1 style={{ fontSize: '28px', marginBottom: '8px', fontWeight: 800, color: 'var(--text)', lineHeight: 1.2, margin: 0 }}>
            Sign In
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', margin: '8px 0 0 0', lineHeight: 1.5 }}>
            Welcome back to Simpchat
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{ padding: '12px 14px', marginBottom: '24px', backgroundColor: 'rgba(211, 47, 47, 0.1)', border: '1px solid rgba(211, 47, 47, 0.3)', borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#d32f2f', marginTop: '2px', minWidth: '20px' }} />
            <p style={{ fontSize: '14px', color: '#d32f2f', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
              {error}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ marginBottom: '28px' }}>
          {/* Email/Username Field */}
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="credential" style={{ fontSize: '14px', fontWeight: 700, display: 'block', marginBottom: '8px', color: 'var(--text)' }}>
              Email or Username
            </label>
            <input
              id="credential"
              type="text"
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              placeholder="john@example.com"
              required
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: '15px',
                border: '1.5px solid var(--border)',
                borderRadius: '10px',
                backgroundColor: 'var(--surface)',
                color: 'var(--text)',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="password" style={{ fontSize: '14px', fontWeight: 700, display: 'block', marginBottom: '8px', color: 'var(--text)' }}>
              Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  paddingRight: '44px',
                  fontSize: '15px',
                  border: '1.5px solid var(--border)',
                  borderRadius: '10px',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  transition: 'color 0.3s ease',
                }}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div style={{ marginBottom: '28px', textAlign: 'right' }}>
            <Link
              to="/forgot-password"
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--accent)',
                textDecoration: 'none',
              }}
            >
              Forgot password?
            </Link>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading || !credential || !password}
            style={{
              width: '100%',
              padding: '13px 20px',
              fontSize: '15px',
              fontWeight: 700,
              color: 'white',
              background: isLoading || !credential || !password ? '#bdbdbd' : 'linear-gradient(135deg, #0066ff 0%, #0052cc 100%)',
              border: 'none',
              borderRadius: '10px',
              cursor: isLoading || !credential || !password ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              opacity: isLoading || !credential || !password ? 0.7 : 1,
              boxShadow: isLoading || !credential || !password ? 'none' : '0 4px 12px rgba(0, 102, 255, 0.15)',
              letterSpacing: '0.3px',
              minHeight: '48px',
              fontFamily: 'inherit',
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
            {!isLoading && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>

        {/* Sign Up Link */}
        <div style={{ textAlign: 'center', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 10px 0', fontWeight: 500 }}>
            Don't have an account?
          </p>
          <Link
            to="/register"
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--accent)',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Create Account →
          </Link>
        </div>
      </div>
    </div>
  );
};
