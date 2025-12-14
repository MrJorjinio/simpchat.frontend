import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/auth.service';
import { Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { isValidEmail } from '../../utils/helpers';
import { extractErrorMessage } from '../../utils/errorHandler';
import styles from '../../styles/Auth.module.css';

type RegisterStep = 'email' | 'complete';

export const RegisterForm = () => {
  const navigate = useNavigate();
  const { register: registerUser, isLoading: isAuthLoading } = useAuth();
  const [step, setStep] = useState<RegisterStep>('email');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      await authService.sendOTP(email);
      setStep('complete');
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to send verification code'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (password.length < 5) {
      setError('Password must be at least 5 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!otpCode.trim()) {
      setError('Verification code is required');
      return;
    }

    try {
      console.log('[RegisterForm] Registering user...');
      await registerUser(email, username, password, otpCode);

      const state = useAuthStore.getState();
      console.log('[RegisterForm] Registration successful. Auth state:', {
        hasToken: !!state.token,
        hasUser: !!state.user,
        isLoading: state.isLoading,
      });

      if (state.token && state.user) {
        console.log('[RegisterForm] Auth state verified, navigating to dashboard...');
        navigate('/dashboard');
      } else {
        console.error('[RegisterForm] Registration completed but auth state not set!');
      }
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Registration failed'));
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setIsLoading(true);
    try {
      await authService.sendOTP(email);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to resend code'));
    } finally {
      setIsLoading(false);
    }
  };

  // ===== STEP 1: EMAIL VERIFICATION =====
  if (step === 'email') {
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
              <span>💬</span>
            </div>
            <h1 className={styles.title}>Create Account</h1>
            <p className={styles.subtitle}>Join Simpchat today</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className={styles.errorAlert}>
              <AlertCircle size={20} />
              <p>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSendOTP} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={isLoading}
                className={styles.input}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className={styles.submitBtn}
            >
              {isLoading ? (
                <>
                  <div className={styles.spinner} />
                  Sending...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {/* Sign In Link */}
          <div className={styles.footer}>
            <p>Already have an account?</p>
            <Link to="/login">Sign In →</Link>
          </div>
        </div>
      </div>
    );
  }

  // ===== STEP 2: COMPLETE REGISTRATION =====
  return (
    <div className={styles.authContainer}>
      {/* Animated Background Orbs */}
      <div className={`${styles.orb} ${styles.orb1}`} />
      <div className={`${styles.orb} ${styles.orb2}`} />
      <div className={`${styles.orb} ${styles.orb3}`} />

      <div className={styles.authCard}>
        {/* Header */}
        <div className={styles.header} style={{ textAlign: 'left' }}>
          <button onClick={() => setStep('email')} className={styles.backBtn}>
            <ArrowLeft size={16} />
            Back
          </button>

          <h1 className={styles.title} style={{ textAlign: 'left' }}>Complete Profile</h1>

          {/* Email Verified Badge */}
          <div className={styles.verifiedBadge}>
            <CheckCircle2 size={16} />
            <p>Email verified: {email}</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className={styles.errorAlert}>
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleCompleteRegistration} className={styles.form}>
          {/* Username */}
          <div className={styles.inputGroup}>
            <label htmlFor="username" className={styles.label}>
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="johndoe"
              required
              disabled={isAuthLoading}
              className={styles.input}
            />
          </div>

          {/* Password */}
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
                disabled={isAuthLoading}
                className={`${styles.input} ${styles.inputPassword}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isAuthLoading}
                className={styles.togglePassword}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className={styles.inputGroup}>
            <label htmlFor="confirm-password" className={styles.label}>
              Confirm Password
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isAuthLoading}
                className={`${styles.input} ${styles.inputPassword}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isAuthLoading}
                className={styles.togglePassword}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Verification Code */}
          <div className={styles.inputGroup}>
            <label htmlFor="otp-code" className={styles.label}>
              Verification Code
            </label>
            <input
              id="otp-code"
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="000000"
              required
              disabled={isAuthLoading}
              className={`${styles.input} ${styles.otpInput}`}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isAuthLoading || !username || !password || !confirmPassword || !otpCode}
            className={styles.submitBtn}
          >
            {isAuthLoading ? (
              <>
                <div className={styles.spinner} />
                Creating...
              </>
            ) : (
              <>
                Create Account
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        {/* Resend Code */}
        <div className={styles.resendSection}>
          <p>Didn't get the code?</p>
          <button
            onClick={handleResendOTP}
            disabled={isLoading}
            className={styles.resendBtn}
          >
            {isLoading ? 'Resending...' : 'Resend Code'}
          </button>
        </div>
      </div>
    </div>
  );
};
