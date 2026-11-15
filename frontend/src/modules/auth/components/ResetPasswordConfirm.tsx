import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface ResetPasswordConfirmProps {
  onBackToLogin: () => void;
}

export const ResetPasswordConfirm: React.FC<ResetPasswordConfirmProps> = ({ onBackToLogin }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Extract token from URL query parameters (?token=XYZ)
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      setToken(urlToken);
    } else {
      setStatus('error');
      setErrorMessage('Invalid or missing password reset token in URL.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) return;

    if (password !== confirmPassword) {
      setStatus('error');
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (!token) {
      setStatus('error');
      setErrorMessage('Missing reset token.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch(`${API}/auth/reset-password/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
        signal: AbortSignal.timeout(10000),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update password.');
      }

      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-15%] left-[-10%] w-[45rem] h-[45rem] rounded-full bg-[#5b21b6] opacity-30 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[45rem] h-[45rem] rounded-full bg-[#10b981] opacity-30 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-[440px] relative z-10"
      >
        <div className="backdrop-blur-2xl bg-white/70 rounded-3xl shadow-[0_8px_32px_rgba(31,36,48,0.1)] p-6 sm:p-8 border border-white/40">
          
          {/* Header */}
          <div className="mb-6 text-center">
            <img
              src="/readlr-mark.svg"
              alt="Readlr"
              className="w-14 h-14 rounded-2xl mx-auto mb-3 shadow-[0_4px_16px_rgba(91,33,182,0.2)]"
            />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">
              {status === 'success' ? 'Password Updated' : 'Set New Password'}
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              {status === 'success'
                ? 'Your password has been successfully changed'
                : 'Please enter your new password below'}
            </p>
          </div>

          {/* Error Banner */}
          {status === 'error' && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50/90 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-5 text-sm font-medium flex items-start gap-2 shadow-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {/* Success State */}
          {status === 'success' ? (
            <div className="space-y-5 text-center">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                You can now log into your Readlr account using your new password.
              </p>
              <button
                type="button"
                onClick={onBackToLogin}
                className="w-full bg-slate-900 text-white font-semibold py-3 rounded-xl hover:bg-slate-800 transition-all shadow-md"
              >
                Proceed to Sign In
              </button>
            </div>
          ) : (
            /* Form State */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-800 font-medium text-sm mb-1.5">New password</label>
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={status === 'loading' || !token}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5b21b6] focus:ring-4 focus:ring-[#5b21b6]/10 transition-all bg-white/60 text-slate-900 placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-medium text-sm mb-1.5">Confirm new password</label>
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={status === 'loading' || !token}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5b21b6] focus:ring-4 focus:ring-[#5b21b6]/10 transition-all bg-white/60 text-slate-900 placeholder-slate-400"
                />
              </div>

              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                disabled={status === 'loading' || !token || !password || !confirmPassword}
                className="w-full bg-gradient-to-r from-[#5b21b6] to-[#0ea5e9] text-white font-semibold py-3 rounded-xl hover:shadow-[0_2px_12px_rgba(91,33,182,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {status === 'loading' ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Update password
                  </>
                )}
              </motion.button>
            </form>
          )}

          {/* Back to Login Link */}
          <div className="text-center pt-5 mt-4 border-t border-slate-200/60">
            <button
              type="button"
              onClick={onBackToLogin}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#5b21b6] hover:text-[#4c1d95] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
};