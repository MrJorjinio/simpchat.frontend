import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { isValidEmail } from '../../utils/helpers';
import { extractErrorMessage } from '../../utils/errorHandler';
import styles from '../../styles/Auth.module.css';

type ForgotPasswordStep = 'email' | 'reset';

export const ForgotPasswordForm = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<ForgotPasswordStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
      setStep('reset');
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to send verification code'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

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

    setIsLoading(true);
    try {
      await authService.resetPasswordByEmail(email, password, otpCode);
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to reset password'));
    } finally {
      setIsLoading(false);
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

  // ===== STEP 1: EMAIL INPUT =====
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
              <span>🔑</span>
            </div>
            <h1 className={styles.title}>Forgot Password</h1>
            <p className={styles.subtitle}>Enter your email to reset your password</p>
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
                  Send Reset Code
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {/* Back to Login Link */}
          <div className={styles.footer}>
            <p>Remember your password?</p>
            <Link to="/login">Back to Sign In →</Link>
          </div>
        </div>
      </div>
    );
  }

  // ===== STEP 2: RESET PASSWORD =====
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

          <h1 className={styles.title} style={{ textAlign: 'left' }}>Reset Password</h1>

          {/* Email Badge */}
          <div className={styles.verifiedBadge}>
            <CheckCircle2 size={16} />
            <p>Code sent to: {email}</p>
          </div>
        </div>

        {/* Success Alert */}
        {success && (
          <div className={styles.successAlert}>
            <CheckCircle2 size={20} />
            <p>{success}</p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className={styles.errorAlert}>
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleResetPassword} className={styles.form}>
          {/* New Password */}
          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>
              New Password
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading || !!success}
                className={`${styles.input} ${styles.inputPassword}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading || !!success}
                className={styles.togglePassword}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className={styles.inputGroup}>
            <label htmlFor="confirm-password" className={styles.label}>
              Confirm New Password
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading || !!success}
                className={`${styles.input} ${styles.inputPassword}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading || !!success}
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
              disabled={isLoading || !!success}
              className={`${styles.input} ${styles.otpInput}`}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !password || !confirmPassword || !otpCode || !!success}
            className={styles.submitBtn}
          >
            {isLoading ? (
              <>
                <div className={styles.spinner} />
                Resetting...
              </>
            ) : (
              <>
                Reset Password
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        {/* Resend Code */}
        {!success && (
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
        )}
      </div>
    </div>
  );
};
