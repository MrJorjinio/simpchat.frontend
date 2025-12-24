import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../stores/authStore';
import { extractErrorMessage } from '../../utils/errorHandler';
import { Eye, EyeOff, AlertCircle, ArrowRight, MessageSquare } from 'lucide-react';
import styles from '../../styles/Auth.module.css';

export const LoginForm = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuth();
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    // Prevent form submission and page refresh
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Don't submit if already loading or fields are empty
    if (isLoading || !credential || !password) {
      return false;
    }

    // Clear any previous errors
    clearError();
    setLocalError(null);

    try {
      console.log('[LoginForm] Starting login...');
      await login({ credential, password });

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
        setLocalError('Login failed. Please try again.');
      }
    } catch (err: any) {
      console.error('[LoginForm] Login error:', err);
      // Error should already be set in authStore, but set local error as backup
      const errorMsg = extractErrorMessage(err, 'Login failed. Please try again.');
      setLocalError(errorMsg);
    }

    return false;
  };

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    handleSubmit();
  };

  // Combine store error and local error
  const displayError = error || localError;

  return (
    <div className={styles.authContainer}>
      {/* Animated Background Orbs */}
      <div className={`${styles.orb} ${styles.orb1}`} />
      <div className={`${styles.orb} ${styles.orb2}`} />
      <div className={`${styles.orb} ${styles.orb3}`} />

      <div className={styles.authCard}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <MessageSquare size={32} color="#ffffff" />
          </div>
          <h1 className={styles.title}>Sign In</h1>
          <p className={styles.subtitle}>Welcome back to Simpchat</p>
        </div>

        {/* Error Alert */}
        {displayError && (
          <div className={styles.errorAlert}>
            <AlertCircle size={20} />
            <p>{displayError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} action="javascript:void(0);" className={styles.form}>
          {/* Email/Username Field */}
          <div className={styles.inputGroup}>
            <label htmlFor="credential" className={styles.label}>
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
              className={styles.input}
            />
          </div>

          {/* Password Field */}
          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading}
                className={`${styles.input} ${styles.inputPassword}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className={styles.togglePassword}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className={styles.forgotLink}>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          {/* Login Button */}
          <button
            type="button"
            onClick={handleButtonClick}
            disabled={isLoading || !credential || !password}
            className={styles.submitBtn}
          >
            {isLoading ? (
              <>
                <div className={styles.spinner} />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        {/* Sign Up Link */}
        <div className={styles.footer}>
          <p>Don't have an account?</p>
          <Link to="/register">Create Account →</Link>
        </div>
      </div>
    </div>
  );
};
