import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/auth.service';
import { Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { isValidEmail } from '../../utils/helpers';

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
      setError(err.response?.data?.message || 'Failed to send verification code');
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

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
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

      // Verify state was updated in the store
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
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setIsLoading(true);
    try {
      await authService.sendOTP(email);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  // ===== STEP 1: EMAIL VERIFICATION =====
  if (step === 'email') {
    return (
      <div style={{ minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: 'var(--background)' }}>
        <div style={{ width: '100%', maxWidth: '400px', minWidth: 0 }}>
          {/* Header */}
          <div style={{ marginBottom: '36px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '14px', background: 'linear-gradient(135deg, #0066ff 0%, #0052cc 100%)', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0, 102, 255, 0.15)' }}>
              <span style={{ fontSize: '28px' }}>💬</span>
            </div>
            <h1 style={{ fontSize: '28px', marginBottom: '8px', fontWeight: 800, color: 'var(--text)', lineHeight: 1.2, margin: 0 }}>
              Create Account
            </h1>
            <p style={{ fontSize: '15px', color: 'var(--text-muted)', margin: '8px 0 0 0', lineHeight: 1.5 }}>
              Join Simpchat today
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
          <form onSubmit={handleSendOTP} style={{ marginBottom: '28px' }}>
            <div style={{ marginBottom: '28px' }}>
              <label htmlFor="email" style={{ fontSize: '14px', fontWeight: 700, display: 'block', marginBottom: '8px', color: 'var(--text)' }}>
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

            <button
              type="submit"
              disabled={isLoading || !email}
              style={{
                width: '100%',
                padding: '13px 20px',
                fontSize: '15px',
                fontWeight: 700,
                color: 'white',
                background: isLoading || !email ? '#bdbdbd' : 'linear-gradient(135deg, #0066ff 0%, #0052cc 100%)',
                border: 'none',
                borderRadius: '10px',
                cursor: isLoading || !email ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.3s ease',
                opacity: isLoading || !email ? 0.7 : 1,
                boxShadow: isLoading || !email ? 'none' : '0 4px 12px rgba(0, 102, 255, 0.15)',
                letterSpacing: '0.3px',
                minHeight: '48px',
                fontFamily: 'inherit',
              }}
            >
              {isLoading ? 'Sending...' : 'Continue'}
              {!isLoading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          {/* Sign In Link */}
          <div style={{ textAlign: 'center', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 10px 0', fontWeight: 500 }}>
              Already have an account?
            </p>
            <Link
              to="/login"
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--accent)',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ===== STEP 2: COMPLETE REGISTRATION =====
  return (
    <div style={{ minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: 'var(--background)' }}>
      <div style={{ width: '100%', maxWidth: '400px', minWidth: 0 }}>
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <button
            onClick={() => setStep('email')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--accent)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              marginBottom: '16px',
              padding: 0,
              transition: 'opacity 0.3s ease',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <h1 style={{ fontSize: '28px', marginBottom: '12px', fontWeight: 800, color: 'var(--text)', lineHeight: 1.2, margin: 0 }}>
            Complete Profile
          </h1>

          {/* Email Verified Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 12px',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '8px',
              marginTop: '12px',
            }}
          >
            <CheckCircle2 className="w-4 h-4" style={{ color: '#22c55e', flexShrink: 0 }} />
            <p style={{ fontSize: '13px', color: '#22c55e', margin: 0, fontWeight: 600 }}>
              Verified
            </p>
          </div>
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
        <form onSubmit={handleCompleteRegistration} style={{ marginBottom: '28px' }}>
          {/* Username */}
          <div style={{ marginBottom: '18px' }}>
            <label htmlFor="username" style={{ fontSize: '14px', fontWeight: 700, display: 'block', marginBottom: '8px', color: 'var(--text)' }}>
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

          {/* Password */}
          <div style={{ marginBottom: '18px' }}>
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
                disabled={isAuthLoading}
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
                disabled={isAuthLoading}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: isAuthLoading ? 'not-allowed' : 'pointer',
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

          {/* Confirm Password */}
          <div style={{ marginBottom: '18px' }}>
            <label htmlFor="confirm-password" style={{ fontSize: '14px', fontWeight: 700, display: 'block', marginBottom: '8px', color: 'var(--text)' }}>
              Confirm Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isAuthLoading}
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
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isAuthLoading}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: isAuthLoading ? 'not-allowed' : 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  transition: 'color 0.3s ease',
                }}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Verification Code */}
          <div style={{ marginBottom: '28px' }}>
            <label htmlFor="otp-code" style={{ fontSize: '14px', fontWeight: 700, display: 'block', marginBottom: '8px', color: 'var(--text)' }}>
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
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: '17px',
                fontWeight: 700,
                letterSpacing: '3px',
                border: '1.5px solid var(--border)',
                borderRadius: '10px',
                backgroundColor: 'var(--surface)',
                color: 'var(--text)',
                transition: 'all 0.3s ease',
                textAlign: 'center',
                boxSizing: 'border-box',
                fontFamily: 'monospace',
                minHeight: '48px',
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isAuthLoading || !username || !password || !confirmPassword || !otpCode}
            style={{
              width: '100%',
              padding: '13px 20px',
              fontSize: '15px',
              fontWeight: 700,
              color: 'white',
              background: isAuthLoading || !username || !password || !confirmPassword || !otpCode ? '#bdbdbd' : 'linear-gradient(135deg, #0066ff 0%, #0052cc 100%)',
              border: 'none',
              borderRadius: '10px',
              cursor: isAuthLoading || !username || !password || !confirmPassword || !otpCode ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              opacity: isAuthLoading || !username || !password || !confirmPassword || !otpCode ? 0.7 : 1,
              boxShadow: isAuthLoading || !username || !password || !confirmPassword || !otpCode ? 'none' : '0 4px 12px rgba(0, 102, 255, 0.15)',
              letterSpacing: '0.3px',
              minHeight: '48px',
              fontFamily: 'inherit',
            }}
          >
            {isAuthLoading ? 'Creating...' : 'Create Account'}
            {!isAuthLoading && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>

        {/* Resend Code */}
        <div style={{ textAlign: 'center', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 8px 0', fontWeight: 500 }}>
            Didn't get the code?
          </p>
          <button
            onClick={handleResendOTP}
            disabled={isLoading}
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--accent)',
              background: 'none',
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
              padding: 0,
              transition: 'opacity 0.3s ease',
            }}
          >
            {isLoading ? 'Resending...' : 'Resend Code'}
          </button>
        </div>
      </div>
    </div>
  );
};
