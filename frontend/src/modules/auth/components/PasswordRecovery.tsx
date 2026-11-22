import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Send, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface PasswordRecoveryProps {
  email?: string;
  onBackToLogin: () => void;
}

export const PasswordRecovery: React.FC<PasswordRecoveryProps> = ({ email: initialEmail = '', onBackToLogin }) => {
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(10000),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset email.');
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
      <div className="absolute top-[20%] right-[10%] w-[25rem] h-[25rem] rounded-full bg-[#fbbf24] opacity-20 blur-[100px] pointer-events-none" />

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
              src="/readlr_main_logo.svg"
              alt="Readlr"
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-contain mx-auto mb-3"
            />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">
              {status === 'success' ? 'Check your email' : 'Reset Password'}
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              {status === 'success'
                ? 'We have sent a recovery link to your inbox'
                : 'Enter your email address and we will send you a recovery link'}
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
                A password reset link has been dispatched to <strong className="text-slate-900">{email}</strong>. Please check your inbox and follow the instructions.
              </p>
              <button
                type="button"
                onClick={onBackToLogin}
                className="w-full bg-slate-900 text-white font-semibold py-3 rounded-xl hover:bg-slate-800 transition-all shadow-md"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            /* Form State */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-800 font-medium text-sm mb-1.5">Email address</label>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === 'loading'}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5b21b6] focus:ring-4 focus:ring-[#5b21b6]/10 transition-all bg-white/60 text-slate-900 placeholder-slate-400"
                />
              </div>

              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                disabled={status === 'loading' || !email}
                className="w-full bg-gradient-to-r from-[#5b21b6] to-[#0ea5e9] text-white font-semibold py-3 rounded-xl hover:shadow-[0_2px_12px_rgba(91,33,182,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {status === 'loading' ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Request password reset
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