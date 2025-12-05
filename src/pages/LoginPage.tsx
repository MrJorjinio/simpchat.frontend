import { LoginForm } from '../components/auth/LoginForm';

export const LoginPage = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--background)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 16px',
    }}>
      <LoginForm />
    </div>
  );
};
