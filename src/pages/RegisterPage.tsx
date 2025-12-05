import { RegisterForm } from '../components/auth/RegisterForm';

export const RegisterPage = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--background)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 16px',
    }}>
      <RegisterForm />
    </div>
  );
};
