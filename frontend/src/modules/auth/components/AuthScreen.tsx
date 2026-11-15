import React, { useState } from 'react';
import { Login } from './Login.js';
import { Register } from './Register.js';
import { PasswordRecovery } from './PasswordRecovery.js';

interface AuthScreenProps {
  selectedRole?: 'learner' | 'teacher' | null;
  onAuthSuccess?: () => void;
  initialMode?: 'login' | 'register' | 'recovery';
}

type AuthMode = 'login' | 'register' | 'recovery';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess, initialMode = 'register' }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  return (
    <>
      {mode === 'login' && (
        <Login
          onSuccess={onAuthSuccess}
          onSwitchToRegister={() => setMode('register')}
          onSwitchToRecovery={() => setMode('recovery')}
        />
      )}

      {mode === 'register' && (
        <Register
          onSuccess={onAuthSuccess}
          onSwitchToLogin={() => setMode('login')}
        />
      )}

      {mode === 'recovery' && (
        <PasswordRecovery
          onBackToLogin={() => setMode('login')}
        />
      )}
    </>
  );
};